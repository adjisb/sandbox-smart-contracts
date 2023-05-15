//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./ERC2771Handler.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/ICatalyst.sol";

contract Asset is
    IAsset,
    Initializable,
    ERC2771Handler,
    ERC1155Upgradeable,
    ERC1155BurnableUpgradeable,
    AccessControlUpgradeable,
    ERC1155SupplyUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BRIDGE_MINTER_ROLE =
        keccak256("BRIDGE_MINTER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    // chain id of the chain the contract is deployed on
    uint8 chainIndex;

    // a ratio for the amount of copies to burn to retrieve single catalyst for each tier
    mapping(uint256 => uint256) public recyclingAmounts;
    // mapping of creator address to creator nonce, a nonce is incremented every time a creator mints a new token
    mapping(address => uint16) public creatorNonces;
    // mapping of old bridged tokenId to creator nonce
    mapping(uint256 => uint16) public bridgedTokensNonces;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory uri,
        address forwarder,
        address uriSetter,
        uint8 _chainIndex,
        uint256[] calldata catalystTiers,
        uint256[] calldata catalystRecycleCopiesNeeded
    ) external initializer {
        chainIndex = _chainIndex;
        __ERC1155_init(uri);
        __AccessControl_init();
        __ERC1155Supply_init();
        __ERC2771Handler_initialize(forwarder);
        __ERC1155Burnable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, uriSetter);

        for (uint256 i = 0; i < catalystTiers.length; i++) {
            recyclingAmounts[catalystTiers[i]] = catalystRecycleCopiesNeeded[i];
        }
    }

    /// @notice Mint new token with catalyst tier chosen by the creator
    /// @dev Only callable by the minter role
    /// @param assetData The address of the creator
    function mint(AssetData calldata assetData) external onlyRole(MINTER_ROLE) {
        // increment nonce
        unchecked {
            creatorNonces[assetData.creator]++;
        }
        // get current creator nonce
        uint16 nonce = creatorNonces[assetData.creator];
        require(assetData.creatorNonce == nonce, "INVALID_NONCE");
        // generate token id by providing the creator address, the amount, catalyst tier and if it should mint as revealed
        uint256 id = generateTokenId(
            assetData.creator,
            assetData.tier,
            nonce,
            assetData.revealed,
            0
        );
        // mint the tokens
        _mint(assetData.creator, id, assetData.amount, "");
    }

    /// @notice Mint new tokens with catalyst tier chosen by the creator
    /// @dev Only callable by the minter role
    /// @param assetDataArray The array of asset data
    function mintBatch(
        AssetData[] calldata assetDataArray
    ) external onlyRole(MINTER_ROLE) {
        // generate token ids by providing the creator address, the amount, catalyst tier and if it should mint as revealed
        uint256[] memory tokenIds = new uint256[](assetDataArray.length);
        uint256[] memory amounts = new uint256[](assetDataArray.length);
        address creator = assetDataArray[0].creator;
        // generate token ids
        for (uint256 i = 0; i < assetDataArray.length; ) {
            unchecked {
                creatorNonces[creator]++;
            }
            require(
                assetDataArray[i].creatorNonce == creatorNonces[creator],
                "INVALID_NONCE"
            );
            tokenIds[i] = generateTokenId(
                creator,
                assetDataArray[i].tier,
                creatorNonces[creator],
                assetDataArray[i].revealed,
                0
            );
            amounts[i] = assetDataArray[i].amount;
            i++;
        }
        // finally mint the tokens
        _mintBatch(creator, tokenIds, amounts, "");
    }

    /// @notice Mint TSB special tokens
    /// @dev Only callable by the minter role
    /// @dev Those tokens are minted by TSB admins and do not adhere to the normal minting rules
    /// @param recipient The address of the recipient
    /// @param assetData The data of the asset to mint
    function mintSpecial(
        address recipient,
        AssetData calldata assetData
    ) external onlyRole(MINTER_ROLE) {
        // increment nonce
        unchecked {
            creatorNonces[assetData.creator]++;
        }
        // get current creator nonce
        uint16 creatorNonce = creatorNonces[assetData.creator];

        // minting a tsb exclusive token which are already revealed, have their supply increased and are not recyclable
        uint256 id = generateTokenId(
            assetData.creator,
            assetData.tier,
            creatorNonce,
            assetData.revealed,
            assetData.revealHash
        );
        _mint(recipient, id, assetData.amount, "");
    }

    function revealMint(
        address recipient,
        uint256 amount,
        uint256 prevTokenId,
        uint40[] calldata revealHashes
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        // get data from the previous token id
        AssetData memory data = getDataFromTokenId(prevTokenId);

        // check if the token is already revealed
        require(!data.revealed, "Asset: already revealed");

        uint256[] memory amounts = new uint256[](amount);
        tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; ) {
            tokenIds[i] = generateTokenId(
                data.creator,
                data.tier,
                data.creatorNonce,
                true,
                revealHashes[i]
            );
            amounts[i] = 1;
            unchecked {
                i++;
            }
        }

        _mintBatch(recipient, tokenIds, amounts, "");
    }

    /// @notice Special mint function for the bridge contract to mint assets originally created on L1
    /// @dev Only the special minter role can call this function
    /// @dev This function skips the catalyst burn step
    /// @dev Bridge should be able to mint more copies of the same asset
    /// @param originalTokenId The original token id of the asset
    /// @param amount The amount of assets to mint
    /// @param tier The tier of the catalysts to burn
    /// @param recipient The recipient of the asset
    /// @param revealed Whether the asset is to be minted as already revealed
    /// @param revealHash The hash of the reveal
    function bridgeMint(
        uint256 originalTokenId,
        uint256 amount,
        uint8 tier,
        address recipient,
        bool revealed,
        uint40 revealHash
    ) external onlyRole(BRIDGE_MINTER_ROLE) {
        // extract creator address from the last 160 bits of the original token id
        address originalCreator = address(uint160(originalTokenId));
        // extract isNFT from 1 bit after the creator address
        bool isNFT = (originalTokenId >> 95) & 1 == 1;
        require(amount > 0, "Amount must be > 0");
        if (isNFT) {
            require(amount == 1, "Amount must be 1 for NFTs");
        }
        // check if this asset has been bridged before to make sure that we increase the copies count for the same assers rather than minting a new one
        // we also do this to avoid a clash between bridged asset nonces and non-bridged asset nonces
        if (bridgedTokensNonces[originalTokenId] == 0) {
            // increment nonce
            unchecked {
                creatorNonces[originalCreator]++;
            }
            // get current creator nonce
            uint16 nonce = creatorNonces[originalCreator];

            // store the nonce
            bridgedTokensNonces[originalTokenId] = nonce;
        }

        uint256 id = generateTokenId(
            originalCreator,
            tier,
            bridgedTokensNonces[originalTokenId],
            revealed,
            revealHash
        );
        _mint(recipient, id, amount, "");
    }

    /// @notice Extract the catalyst by burning assets of the same tier
    /// @param tokenIds the tokenIds of the assets to extract, must be of same tier
    /// @param amounts the amount of each asset to extract catalyst from
    /// @param catalystTier the catalyst tier to extract
    /// @return amountOfCatalystExtracted the amount of catalyst extracted
    function recycleBurn(
        address recycler,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    )
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 amountOfCatalystExtracted)
    {
        uint256 totalAmount = 0;
        // how many assets of a given tier are needed to recycle a catalyst
        uint256 recyclingAmount = recyclingAmounts[catalystTier];
        require(
            recyclingAmount > 0,
            "Catalyst tier is not eligible for recycling"
        );
        // make sure the tokens that user is trying to extract are of correct tier and user has enough tokens
        for (uint i = 0; i < tokenIds.length; i++) {
            uint256 extractedTier = extractTierFromId(tokenIds[i]);
            require(
                extractedTier == catalystTier,
                "Catalyst id does not match"
            );
            totalAmount += amounts[i];
        }

        // total amount should be a modulo of recyclingAmounts[catalystTier] to make sure user is recycling the correct amount of tokens
        require(
            totalAmount % recyclingAmounts[catalystTier] == 0,
            "Incorrect amount of tokens to recycle"
        );
        // burn batch of tokens
        _burnBatch(recycler, tokenIds, amounts);

        // calculate how many catalysts to mint
        uint256 catalystsExtractedCount = totalAmount /
            recyclingAmounts[catalystTier];

        emit AssetsRecycled(
            recycler,
            tokenIds,
            amounts,
            catalystTier,
            catalystsExtractedCount
        );

        return catalystsExtractedCount;
    }

    /// @notice Burn a token from a given account
    /// @dev Only the minter role can burn tokens
    /// @dev This function was added with token recycling and bridging in mind but may have other use cases
    /// @param account The account to burn tokens from
    /// @param id The token id to burn
    /// @param amount The amount of tokens to burn
    function burnFrom(
        address account,
        uint256 id,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        _burn(account, id, amount);
    }

    /// @notice Burn a batch of tokens from a given account
    /// @dev Only the minter role can burn tokens
    /// @dev This function was added with token recycling and bridging in mind but may have other use cases
    /// @dev The length of the ids and amounts arrays must be the same
    /// @param account The account to burn tokens from
    /// @param ids An array of token ids to burn
    /// @param amounts An array of amounts of tokens to burn
    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /// @notice Set the amount of tokens that can be recycled for a given one catalyst of a given tier
    /// @dev Only the admin role can set the recycling amount
    /// @param catalystTokenId The catalyst token id
    /// @param amount The amount of tokens needed to receive one catalyst
    function setRecyclingAmount(
        uint256 catalystTokenId,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // catalyst 0 is restricted for tsb exclusive tokens
        require(catalystTokenId > 0, "Catalyst token id cannot be 0");
        recyclingAmounts[catalystTokenId] = amount;
    }

    function setURI(string memory newuri) external onlyRole(URI_SETTER_ROLE) {
        _setURI(newuri);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(
        bytes4 id
    )
        public
        view
        virtual
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return
            id == 0x01ffc9a7 || //ERC165
            id == 0xd9b67a26 || // ERC1155
            id == 0x0e89341c || // ERC1155 metadata
            id == 0x572b6c05; // ERC2771
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (address sender)
    {
        return ERC2771Handler._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (bytes calldata)
    {
        return ERC2771Handler._msgData();
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function generateTokenId(
        address creator,
        uint8 tier,
        uint16 assetNonce,
        bool revealed,
        uint40 abilitiesAndEnhancementsHash
    ) public view returns (uint256) {
        /// the token id will be a uint256 with the following structure:
        /// 0-159 bits: creator address
        /// 160-167 bits: chain id
        /// 168-175 bits: tier
        /// 176-176 bits: revealed 0 | 1
        /// 177-193 bits: creator nonce
        /// 194-234 bits: hash of the abilities and enhancements
        /// 235-255 bits: reserved for future use

        // convert the address to uint160
        uint160 creatorAddress = uint160(creator);
        // convert the mint as revealed to uint8
        uint8 revealedUint8 = revealed ? 1 : 0;

        // create the token id
        uint256 tokenId = uint256(
            creatorAddress |
                (chainIndex << 160) |
                (uint256(tier) << 168) |
                (uint256(revealedUint8) << 176) |
                (uint256(assetNonce) << 177) |
                (uint256(abilitiesAndEnhancementsHash) << 194)
        );

        return tokenId;
    }

    function extractCreatorFromId(
        uint256 tokenId
    ) public pure returns (address creator) {
        creator = address(uint160(tokenId));
    }

    function extractTierFromId(uint256 tokenId) public pure returns (uint256) {
        uint256 tier = (tokenId >> 168) & 0xFF;
        return tier;
    }

    function extractIsRevealedFromId(
        uint256 tokenId
    ) public pure returns (bool) {
        uint8 isRevealed = uint8((tokenId >> 176) & 0x1);
        return isRevealed == 1;
    }

    function extractCreatorNonceFromId(
        uint256 tokenId
    ) public pure returns (uint16) {
        uint16 creatorNonce = uint16((tokenId >> 177) & 0x3FF);
        return creatorNonce;
    }

    function getDataFromTokenId(
        uint256 tokenId
    ) public pure returns (AssetData memory data) {
        data.creator = address(uint160(tokenId));
        data.tier = uint8((tokenId >> 168) & 0xFF);
        data.revealed = uint8((tokenId >> 176) & 0x1) == 1;
        data.creatorNonce = uint16((tokenId >> 177) & 0x3FF);
    }

    function getRecyclingAmount(
        uint256 catalystTokenId
    ) public view returns (uint256) {
        return recyclingAmounts[catalystTokenId];
    }
}
