// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/security/Pausable.sol";

import "../../../common/interfaces/IPolygonAssetERC721.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";

import "./PolygonAssetERC721.sol";

/// @title ASSETERC721 bridge on L2
contract PolygonAssetERC721Tunnel is
    FxBaseChildTunnel,
    IERC721MandatoryTokenReceiver,
    ERC2771Handler,
    Ownable,
    Pausable
{
    IPolygonAssetERC721 public childToken;
    uint256 public maxTransferLimit = 20;
    mapping(uint256 => bytes) public tokenUris; // TODO: keep as bytes ?

    event SetTransferLimit(uint256 limit);
    event Deposit(address user, uint256 id, bytes data);
    event Withdraw(address user, uint256 id, bytes data);

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    constructor(
        address _fxChild,
        IPolygonAssetERC721 _childToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
        maxTransferLimit = _maxTransferLimit;
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    function batchWithdrawToRoot(
        address to,
        uint256[] calldata ids,
        bytes memory data
    ) external whenNotPaused() {
        require(ids.length < maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        string[] memory uris = abi.decode(data, (string[]));
        for (uint256 i = 0; i < ids.length; i++) {
            // save the token uris and lock the child tokens in this contract
            uint256 id = ids[i];
            tokenUris[id] = abi.encode(uris[i]);
            childToken.safeTransferFrom(_msgSender(), address(this), ids[i], tokenUris[id]);
            emit Withdraw(to, ids[i], tokenUris[id]);
        }
        _sendMessageToRoot(abi.encode(to, ids, data));
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Pauses all token transfers across bridge
    function pause() public onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() public onlyOwner {
        _unpause();
    }

    function _processMessageFromRoot(
        uint256, /* stateId */
        address sender,
        bytes memory data /* encoded message from root tunnel */
    ) internal override validateSender(sender) {
        _syncDeposit(data);
    }

    function _syncDeposit(bytes memory syncData) internal {
        (address to, uint256 id, bytes memory data) = abi.decode(syncData, (address, uint256, bytes));
        if (!childToken.exists(id)) childToken.mint(to, id, data);
        else childToken.safeTransferFrom(address(this), to, id, data);
        emit Deposit(to, id, data);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }
}