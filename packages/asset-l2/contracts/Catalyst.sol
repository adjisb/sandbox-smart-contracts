//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ERC2771Handler.sol";
import "./interfaces/ICatalyst.sol";

contract Catalyst is
    ICatalyst,
    Initializable,
    ERC1155Upgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC2771Handler,
    AccessControlUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    uint256 public constant COMMON_CATALYST_ID = 1;
    uint256 public constant UNCOMMON_CATAYST_ID = 2;
    uint256 public constant RARE_CATALYST_ID = 3;
    uint256 public constant EPIC_CATALYST_ID = 4;
    uint256 public constant LEGENDARY_CATALYST_ID = 5;
    uint256 public constant MYTHIC_CATALYST_ID = 6;

    uint256 public catalystTypeCount = 6;

    address private royaltyRecipient;
    mapping(uint256 => uint256) private catalystRoyaltyBps;

    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event NewCatalystTypeAdded(uint256 catalystId, uint256 royaltyBps);

    function initialize(
        string memory _baseUri,
        address _trustedForwarder,
        address _royaltyRecipient,
        uint256[] memory _catalystRoyaltyBps
    ) public initializer {
        __ERC1155_init(_baseUri);
        __AccessControl_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __ERC2771Handler_initialize(_trustedForwarder);

        // TODO currently setting the deployer as the admin, but we can change this
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _royaltyRecipient = _royaltyRecipient;
        for (uint256 i = 0; i < _catalystRoyaltyBps.length; i++) {
            catalystRoyaltyBps[i + 1] = _catalystRoyaltyBps[i];
        }
    }

    /// @notice Set a new base URI, limited to DEFAULT_ADMIN_ROLE only
    /// @param newuri The new base URI
    function setURI(
        string memory newuri
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /// @notice Mints a new token, limited to MINTER_ROLE only
    /// @param to The address that will own the minted token
    /// @param id The token id to mint
    /// @param amount The amount to be minted
    /// @param data Additional data with no specified format, sent in call to `_to`
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        require(id > 0 && id <= catalystTypeCount, "INVALID_CATALYST_ID");
        _mint(to, id, amount, data);
    }

    /// @notice Mints a batch of tokens, limited to MINTER_ROLE only
    /// @param to The address that will own the minted tokens
    /// @param ids The token ids to mint
    /// @param amounts The amounts to be minted per token id
    /// @param data Additional data with no specified format, sent in call to `_to`
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            require(
                ids[i] > 0 && ids[i] <= catalystTypeCount,
                "INVALID_CATALYST_ID"
            );
        }
        _mintBatch(to, ids, amounts, data);
    }

    function burnFrom(
        address account,
        uint256 id,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        _burn(account, id, amount);
    }

    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /// @notice Add a new catalyst type, limited to DEFAULT_ADMIN_ROLE only
    /// @param catalystId The catalyst id to add
    /// @param royaltyBps The royalty bps for the catalyst
    function addNewCatalystType(
        uint256 catalystId,
        uint256 royaltyBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        catalystTypeCount++;
        catalystRoyaltyBps[catalystId] = royaltyBps;
        emit NewCatalystTypeAdded(catalystId, royaltyBps);
    }

    /// @notice Set a new trusted forwarder address, limited to DEFAULT_ADMIN_ROLE only
    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(
        address trustedForwarder
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(trustedForwarder != address(0), "ZERO_ADDRESS");
        _trustedForwarder = trustedForwarder;
        emit TrustedForwarderChanged(trustedForwarder);
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

    /// @notice Implementation of EIP-2981 royalty standard
    /// @param _tokenId The token id to check
    /// @param _salePrice The sale price of the token id
    /// @return receiver The address that should receive the royalty payment
    /// @return royaltyAmount The royalty payment amount for the token id
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        uint256 royaltyBps = catalystRoyaltyBps[_tokenId];
        return (royaltyRecipient, (_salePrice * royaltyBps) / 10000);
    }

    function changeRoyaltyRecipient(
        address newRoyaltyRecipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        royaltyRecipient = newRoyaltyRecipient;
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

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
