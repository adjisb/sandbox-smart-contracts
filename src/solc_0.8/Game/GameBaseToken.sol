//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "../common/interfaces/IGameToken.sol";
import "../common/Libraries/TileOrLandLib.sol";
import "../common/interfaces/IExperienceToken.sol";

contract GameBaseToken is IERC721Receiver, ImmutableERC721, WithMinter, Initializable, IGameToken, IExperienceToken {
    using TileOrLandLib for TileOrLandLib.TileOrLand;

    ///////////////////////////////  Data //////////////////////////////

    IERC1155 internal _assetERC1155;
    IERC721 internal _assetERC721;

    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    mapping(uint256 => mapping(uint256 => uint256)) private _gameERC1155Assets;
    mapping(uint256 => mapping(uint256 => uint256)) private _gameERC721Assets;
    mapping(uint256 => address) private _creatorship; // creatorship transfer

    mapping(uint256 => TileOrLandLib.TileOrLand) public tileOrLand;
    mapping(uint256 => bytes32) private _metaData;
    // TODO: Editor must be moved to MINTER
    mapping(address => mapping(address => bool)) private _gameEditors;
    ///////////////////////////////  Events //////////////////////////////

    /// @dev Emits when a game is updated.
    /// @param oldId The id of the previous ERC721 GAME token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Game: new assets, removed assets, uri
    event GameTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IGameToken.GameData update);

    /// @dev Emits when creatorship of a GAME token is transferred.
    /// @param original The original creator of the GAME token.
    /// @param from The current 'creator' of the token.
    /// @param to The new 'creator' of the token.
    event CreatorshipTransfer(address indexed original, address indexed from, address indexed to);

    /// @dev Emits when an address has its gameEditor status changed.
    /// @param gameOwner The owner of the GAME token.
    /// @param gameEditor The address whose editor rights to update.
    /// @param isEditor WHether the address 'gameEditor' should be an editor.
    event GameEditorSet(address indexed gameOwner, address gameEditor, bool isEditor);

    function initV1(
        address trustedForwarder,
        address admin,
        IERC1155 asset1155,
        IERC721 asset721,
        uint8 chainIndex
    ) public initializer {
        _admin = admin;
        _assetERC1155 = asset1155;
        _assetERC721 = asset721;
        ImmutableERC721.__ImmutableERC721_initialize(chainIndex);
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
    }

    ///////////////////////////////  Modifiers //////////////////////////////

    modifier notToZero(address to) {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        _;
    }

    modifier notToThis(address to) {
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        _;
    }

    function onERC721Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        bytes calldata /*data*/
    ) external view override returns (bytes4) {
        require(_msgSender() == address(_assetERC721), "WRONG_SENDER");
        return IERC721Receiver.onERC721Received.selector;
    }

    ///////////////////////////////  Functions //////////////////////////////

    /// @notice Create a new GAME token.
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx).
    /// @param to The address who will be assigned ownership of this game.
    /// @param creation The struct containing ids & ammounts of assets to add to this game,
    /// along with the uri to set.
    /// @param editor The address to allow to edit (can also be set later).
    /// @param subId A random id created on the backend.
    /// @return id The id of the new GAME token (ERC721).
    function createGame(
        address from,
        address to,
        IGameToken.GameData memory creation,
        address editor,
        uint64 subId
    ) external override onlyMinter notToZero(to) notToThis(to) returns (uint256 id) {
        (uint256 gameId, uint256 storageId) = _mintGame(from, to, subId, 0, true);
        // TODO: Editor must be moved to MINTER
        if (editor != address(0)) {
            _setGameEditor(to, editor, true);
        }
        if (!creation.tileOrLand.isEmpty()) {
            require(creation.tileOrLand.isValid(), "invalid tile");
            tileOrLand[storageId] = creation.tileOrLand;
        }
        _addERC721Assets(from, storageId, creation.gameData721.assetIdsToAdd);
        _addERC1155Assets(
            from,
            storageId,
            creation.gameData1155.assetIdsToAdd,
            creation.gameData1155.assetAmountsToAdd
        );

        _metaData[storageId] = creation.uri;
        emit GameTokenUpdated(0, gameId, creation);
        return gameId;
    }

    /// @notice Update an existing GAME token.This actually burns old token
    /// and mints new token with same basId & incremented version.
    /// @param from The one updating the GAME token.
    /// @param gameId The current id of the GAME token.
    /// @param update The values to use for the update.
    /// @return The new gameId.
    function updateGame(
        address from,
        uint256 gameId,
        IGameToken.GameData memory update
    ) external override onlyMinter returns (uint256) {
        uint256 storageId = _storageId(gameId);
        if (!update.tileOrLand.isEmpty()) {
            require(update.tileOrLand.isValid(), "invalid tile");
            tileOrLand[storageId] = update.tileOrLand;
        }
        _addERC721Assets(from, storageId, update.gameData721.assetIdsToAdd);
        _removeERC721Assets(storageId, update.gameData721.assetIdsToRemove, _ownerOf(gameId));

        _addERC1155Assets(from, storageId, update.gameData1155.assetIdsToAdd, update.gameData1155.assetAmountsToAdd);
        _removeERC1155Assets(
            storageId,
            update.gameData1155.assetIdsToRemove,
            update.gameData1155.assetAmountsToRemove,
            _ownerOf(gameId)
        );
        _metaData[storageId] = update.uri;
        uint256 newId = _bumpGameVersion(gameId);
        emit GameTokenUpdated(gameId, newId, update);
        return newId;
    }

    /// @notice Allow token owner to set game editors.
    /// @param gameOwner The address of a GAME token creator.
    /// @param editor The address of the editor to set.
    /// @param isEditor Add or remove the ability to edit.
    function setGameEditor(
        address gameOwner,
        address editor,
        bool isEditor
    ) external override {
        require(_msgSender() == gameOwner, "EDITOR_ACCESS_DENIED");
        require(editor != address(0), "invalid address");
        _setGameEditor(gameOwner, editor, isEditor);
    }

    /// @notice Transfers creatorship of `original` from `sender` to `to`.
    /// @param gameId The current id of the GAME token.
    /// @param sender The address of current registered creator.
    /// @param to The address to transfer the creatorship to
    function transferCreatorship(
        uint256 gameId,
        address sender,
        address to
    ) external override notToZero(to) {
        require(_ownerOf(gameId) != address(0), "NONEXISTENT_TOKEN");
        uint256 storageId = _storageId(gameId);
        address msgSender = _msgSender();
        require(msgSender == sender || _superOperators[msgSender], "TRANSFER_ACCESS_DENIED");
        require(sender != address(0), "NOT_FROM_ZEROADDRESS");
        address originalCreator = address(uint160(storageId / CREATOR_OFFSET_MULTIPLIER));
        address current = creatorOf(gameId);
        require(current != to, "CURRENT_=_TO");
        require(current == sender, "CURRENT_!=_SENDER");
        _creatorship[storageId] = to;
        emit CreatorshipTransfer(originalCreator, current, to);
    }

    /// @notice Burn a GAME token and recover assets.
    /// @param from The address of the one destroying the game.
    /// @param to The address to send all GAME assets to.
    /// @param gameId The id of the GAME to destroy.
    /// @param assetERC1155Ids The ERC1155 assets to recover from the burnt GAME.
    /// @param assetERC721Ids The ERC721 assets to recover from the burnt GAME.
    function burnAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetERC1155Ids,
        uint256[] calldata assetERC721Ids
    ) external override notToZero(to) notToThis(to) {
        _burnGame(from, gameId);
        _recoverAssets(from, to, gameId, assetERC1155Ids, assetERC721Ids);
    }

    /// @notice Burn a GAME token.
    /// @param gameId The id of the GAME to destroy.
    function burn(uint256 gameId) external override(ERC721BaseToken, IGameToken) {
        _burnGame(_msgSender(), gameId);
    }

    /// @notice Burn a GAME token on behalf of owner.
    /// @param from The address whose GAME is being burnt.
    /// @param gameId The id of the GAME to burn.
    function burnFrom(address from, uint256 gameId) external override(ERC721BaseToken, IGameToken) {
        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        _burnGame(from, gameId);
    }

    /// @notice Transfer assets from a burnt GAME.
    /// @param from Previous owner of the burnt game.
    /// @param to Address that will receive the assets.
    /// @param gameId Id of the burnt GAME token.
    /// @param assetERC1155Ids The ERC1155 assets to recover from the burnt GAME.
    /// @param assetERC721Ids The ERC1155 assets to recover from the burnt GAME.
    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetERC1155Ids,
        uint256[] calldata assetERC721Ids
    ) public override notToZero(to) notToThis(to) {
        _recoverAssets(from, to, gameId, assetERC1155Ids, assetERC721Ids);
    }

    /// @notice Get the amount of each assetId in a GAME.
    /// @param gameId The game to query.
    /// @param assetIds The assets to get balances for.
    function getERC1155AssetBalances(uint256 gameId, uint256[] calldata assetIds)
        external
        view
        override
        returns (uint256[] memory)
    {
        uint256 storageId = _storageId(gameId);
        require(_ownerOf(gameId) != address(0), "NONEXISTENT_TOKEN");
        uint256 length = assetIds.length;
        uint256[] memory assets = new uint256[](length);
        for (uint256 i; i < length; i++) {
            assets[i] = _gameERC1155Assets[storageId][assetIds[i]];
        }
        return assets;
    }

    function getTemplate(uint256 gameId) external view override returns (TileOrLandLib.TileOrLand memory template) {
        uint256 storageId = _storageId(gameId);
        return tileOrLand[storageId];
    }

    function getStorageId(uint256 gameId) external pure override(IExperienceToken, ImmutableERC721) returns (uint256) {
        return _storageId(gameId);
    }

    /// @notice Get the amount of each assetId in a GAME.
    /// @param gameId The game to query.
    /// @param assetIds The assets to get balances for.
    function getERC721AssetBalances(uint256 gameId, uint256[] calldata assetIds)
        external
        view
        override
        returns (uint256[] memory)
    {
        uint256 storageId = _storageId(gameId);
        require(_ownerOf(gameId) != address(0), "NONEXISTENT_TOKEN");
        uint256 length = assetIds.length;
        uint256[] memory assets = new uint256[](length);
        for (uint256 i; i < length; i++) {
            assets[i] = _gameERC721Assets[storageId][assetIds[i]];
        }
        return assets;
    }

    /// @notice Get game editor status.
    /// @param gameOwner The address of the owner of the GAME.
    /// @param editor The address of the editor to set.
    /// @return isEditor Editor status of editor for given tokenId.
    function isGameEditor(address gameOwner, address editor) external view override returns (bool isEditor) {
        return _gameEditors[gameOwner][editor];
    }

    /// @notice Called by other contracts to check if this can receive ERC1155 batch.
    /// @param operator The address of the operator in the current tx.
    /// @return the bytes4 value 0xbc197c81.
    function onERC1155BatchReceived(
        address operator,
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external view override returns (bytes4) {
        if (operator == address(this)) {
            return ERC1155_BATCH_RECEIVED;
        }
        revert("ERC1155_BATCH_REJECTED");
    }

    /// @notice Called by other contracts to check if this can receive ERC1155 tokens.
    /// @param operator The address of the operator in the current tx.
    /// @return the bytes4 value 0xf23a6e61.
    function onERC1155Received(
        address operator,
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external view override returns (bytes4) {
        if (operator == address(this)) {
            return ERC1155_RECEIVED;
        }
        revert("ERC1155_REJECTED");
    }

    /// @notice Return the name of the token contract.
    /// @return The name of the token contract.
    function name() external pure override returns (string memory) {
        return "The Sandbox: GAME token";
    }

    /// @notice Get the symbol of the token contract.
    /// @return the symbol of the token contract.
    function symbol() external pure override returns (string memory) {
        return "GAME";
    }

    /// @notice Get the creator of the token type `id`.
    /// @param gameId The id of the token to get the creator of.
    /// @return the creator of the token type `id`.
    function creatorOf(uint256 gameId) public view override returns (address) {
        require(gameId != uint256(0), "GAME_NEVER_MINTED");
        uint256 storageId = _storageId(gameId);
        address originalCreator = address(uint160(storageId / CREATOR_OFFSET_MULTIPLIER));
        address newCreator = _creatorship[storageId];
        if (newCreator != address(0)) {
            return newCreator;
        }
        return originalCreator;
    }

    /// @notice Return the URI of a specific token.
    /// @param gameId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 gameId) public view override returns (string memory uri) {
        require(_ownerOf(gameId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 id = _storageId(gameId);
        return _toFullURI(_metaData[id]);
    }

    /// @notice Check if the contract supports an interface.
    /// 0x01ffc9a7 is ERC-165.
    /// 0x80ac58cd is ERC-721.
    /// @param id The id of the interface.
    /// @return if the interface is supported.
    function supportsInterface(bytes4 id) public pure override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }

    /// @notice Return the amount of token for a storage id
    /// @param from The address of the current owner of assets.
    /// @param to The address of the receiver owner of assets.
    /// @param assetIds The id of the asset to add to GAME.
    /// @param amounts The amount of each asset to add to GAME.
    function _safeTransferFromERC1155(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory amounts
    ) internal {
        // TODO: Try just calling safeBatchTransferFrom (is probably uses some small extra gas)
        if (assetIds.length == 1) {
            _assetERC1155.safeTransferFrom(from, to, assetIds[0], amounts[0], "");
        } else {
            _assetERC1155.safeBatchTransferFrom(from, to, assetIds, amounts, "");
        }
    }

    /// @notice Add assets to an existing GAME.
    /// @param from The address of the current owner of assets.
    /// @param storageId The storageId of the GAME to add assets to.
    /// @param assetIds The id of the asset to add to GAME.
    /// @param amounts The amount of each asset to add to GAME.
    function _addERC1155Assets(
        address from,
        uint256 storageId,
        uint256[] memory assetIds,
        uint256[] memory amounts
    ) internal {
        uint256 len = assetIds.length;
        if (len == 0) {
            return;
        }
        require(len == amounts.length, "INVALID_INPUT_LENGTHS");
        for (uint256 i; i < len; i++) {
            uint256 amount = amounts[i];
            uint256 assetId = assetIds[i];
            require(amount != 0, "INVALID_ASSET_ADDITION");
            uint256 currentValue = _gameERC1155Assets[storageId][assetId];
            _gameERC1155Assets[storageId][assetId] = currentValue + amount;
        }
        _safeTransferFromERC1155(from, address(this), assetIds, amounts);
    }

    /// @notice Add assets to an existing GAME.
    /// @param from The address of the current owner of assets.
    /// @param storageId The storageId of the GAME to add assets to.
    /// @param assetIds The id of the asset to add to GAME.
    function _addERC721Assets(
        address from,
        uint256 storageId,
        uint256[] memory assetIds
    ) internal {
        uint256 len = assetIds.length;
        if (len == 0) {
            return;
        }
        for (uint256 i; i < len; i++) {
            uint256 assetId = assetIds[i];
            uint256 currentValue = _gameERC721Assets[storageId][assetId];
            require(currentValue == 0, "INVALID_ASSET_ADDITION");
            _gameERC721Assets[storageId][assetId] = 1;
            _assetERC721.safeTransferFrom(from, address(this), assetId, "");
        }
    }

    /// @notice Remove assets from a GAME.
    /// @param storageId The storageId of the GAME to remove assets from.
    /// @param assetIds An array of asset Ids to remove.
    /// @param amounts An array of the number of each asset id to remove.
    /// @param to The address to send removed assets to.
    function _removeERC1155Assets(
        uint256 storageId,
        uint256[] memory assetIds,
        uint256[] memory amounts,
        address to
    ) internal {
        uint256 len = assetIds.length;
        if (len == 0) {
            return;
        }
        require(len == amounts.length, "INVALID_INPUT_LENGTHS");
        for (uint256 i; i < len; i++) {
            uint256 assetId = assetIds[i];
            uint256 amount = amounts[i];
            uint256 currentValue = _gameERC1155Assets[storageId][assetId];
            require(amount != 0 && currentValue >= amount, "INVALID_ASSET_REMOVAL");
            _gameERC1155Assets[storageId][assetId] = currentValue - amount;
        }
        _safeTransferFromERC1155(address(this), to, assetIds, amounts);
    }

    /// @notice Remove assets from a GAME.
    /// @param storageId The storageId of the GAME to remove assets from.
    /// @param assetIds An array of asset Ids to remove.
    /// @param to The address to send removed assets to.
    function _removeERC721Assets(
        uint256 storageId,
        uint256[] memory assetIds,
        address to
    ) internal {
        uint256 len = assetIds.length;
        if (len == 0) {
            return;
        }
        for (uint256 i; i < len; i++) {
            uint256 assetId = assetIds[i];
            uint256 currentValue = _gameERC721Assets[storageId][assetId];
            require(currentValue == 1, "INVALID_ASSET_REMOVAL");
            _gameERC721Assets[storageId][assetId] = 0;
            _assetERC721.safeTransferFrom(address(this), to, assetId, "");
        }
    }

    /// @dev See burn / burnFrom.
    function _burnGame(address from, uint256 gameId) internal {
        uint256 storageId = _storageId(gameId);
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(storageId);
        address msgSender = _msgSender();
        require(
            msgSender == owner ||
                (operatorEnabled && _operators[storageId] == msgSender) ||
                _superOperators[msgSender] ||
                _operatorsForAll[from][msgSender],
            "UNAUTHORIZED_BURN"
        );

        delete _metaData[storageId];
        delete _creatorship[storageId];
        _burn(from, owner, gameId);
    }

    function _recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetERC1155Ids,
        uint256[] calldata assetERC721Ids
    ) internal {
        require(_ownerOf(gameId) == address(0), "ONLY_FROM_BURNED_TOKEN");
        require(from == _msgSender(), "INVALID_RECOVERY");
        _check_withdrawal_authorized(from, gameId);
        uint256 storageId = _storageId(gameId);
        GameData memory recovery;
        recovery.gameData1155 = _recoverERC1155Assets(storageId, to, assetERC1155Ids);
        recovery.gameData721 = _recoverERC721Assets(storageId, to, assetERC721Ids);
        emit GameTokenUpdated(gameId, 0, recovery);
    }

    /// @dev See recoverAssets.
    function _recoverERC1155Assets(
        uint256 storageId,
        address to,
        uint256[] memory assetIds
    ) internal returns (GameData1155 memory recovery) {
        uint256 len = assetIds.length;
        if (len == 0) {
            return recovery;
        }
        uint256[] memory amounts = new uint256[](len);
        for (uint256 i; i < len; i++) {
            uint256 assetId = assetIds[i];
            amounts[i] = _gameERC1155Assets[storageId][assetId];
            delete _gameERC1155Assets[storageId][assetId];
        }
        _safeTransferFromERC1155(address(this), to, assetIds, amounts);
        recovery.assetIdsToRemove = assetIds;
        recovery.assetAmountsToRemove = amounts;
        return recovery;
    }

    /// @dev See recoverAssets.
    function _recoverERC721Assets(
        uint256 storageId,
        address to,
        uint256[] memory assetIds
    ) internal returns (GameData721 memory recovery) {
        uint256 len = assetIds.length;
        if (len == 0) {
            return recovery;
        }
        for (uint256 i; i < len; i++) {
            uint256 assetId = assetIds[i];
            delete _gameERC721Assets[storageId][assetId];
            _assetERC721.safeTransferFrom(address(this), to, assetId, "");
        }
        recovery.assetIdsToRemove = assetIds;
        return recovery;
    }

    /// @dev Create a new gameId and associate it with an owner.
    /// @param from The address of one creating the game.
    /// @param to The address of the Game owner.
    /// @param subId The id to use when generating the new GameId.
    /// @param version The version number part of the gameId.
    /// @param isCreation Whether this is a brand new GAME (as opposed to an update).
    /// @return gameId The newly created gameId.
    function _mintGame(
        address from,
        address to,
        uint64 subId,
        uint16 version,
        bool isCreation
    ) internal returns (uint256 gameId, uint256 storageId) {
        uint16 idVersion;
        if (isCreation) {
            idVersion = 1;
            gameId = _generateTokenId(from, subId, _chainIndex, idVersion);
            storageId = _storageId(gameId);
            require(_owners[storageId] == 0, "STORAGE_ID_REUSE_FORBIDDEN");
        } else {
            idVersion = version;
            gameId = _generateTokenId(from, subId, _chainIndex, idVersion);
            storageId = _storageId(gameId);
        }

        _owners[storageId] = (uint256(idVersion) << 200) + uint256(uint160(to));
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, gameId);
    }

    /// @dev Allow token owner to set game editors.
    /// @param gameCreator The address of a GAME creator,
    /// @param editor The address of the editor to set.
    /// @param isEditor Add or remove the ability to edit.
    function _setGameEditor(
        address gameCreator,
        address editor,
        bool isEditor
    ) internal {
        _gameEditors[gameCreator][editor] = isEditor;
        emit GameEditorSet(gameCreator, editor, isEditor);
    }

    /// @dev Bumps the version number of a game token, burning the previous version and minting a new one.
    /// @param gameId The Game token to bump the version of.
    /// @return The new gameId.
    function _bumpGameVersion(uint256 gameId) internal returns (uint256) {
        address originalCreator = address(uint160(gameId / CREATOR_OFFSET_MULTIPLIER));
        uint64 subId = uint64(gameId / SUBID_MULTIPLIER);
        uint16 version = uint16(gameId);
        version++;
        address owner = _ownerOf(gameId);
        _burn(owner, owner, gameId);
        (uint256 newId, ) = _mintGame(originalCreator, owner, subId, version, false);
        address newOwner = _ownerOf(newId);
        assert(owner == newOwner);
        return newId;
    }

    /// @dev Get the a full URI string for a given hash + gameId.
    /// @param hash The 32 byte IPFS hash.
    /// @return The URI string.
    function _toFullURI(bytes32 hash) internal pure override returns (string memory) {
        return string(abi.encodePacked("ipfs://bafybei", hash2base32(hash), "/", "game.json"));
    }
}
