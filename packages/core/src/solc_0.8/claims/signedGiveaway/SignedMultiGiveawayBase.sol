//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {
    ERC1155HolderUpgradeable,
    ERC1155ReceiverUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {
    ERC721HolderUpgradeable,
    IERC721ReceiverUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import {
    AccessControlEnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

/// @title This contract give rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing.
/// @dev The whole contract is split in this base one and implementation to facilitate the reading and split
/// @dev the signature checking code
/// @dev This contract support meta transactions.
abstract contract SignedMultiGiveawayBase is
    Initializable,
    EIP712Upgradeable,
    ERC1155HolderUpgradeable,
    ERC721HolderUpgradeable,
    AccessControlEnumerableUpgradeable
{
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    enum TokenType {INVALID, ERC20, ERC721, ERC721_SAFE, ERC1155, ERC1155_BATCH}
    /// @dev this is a union type, data depends on the tokenType it can be amount, amount + tokenId, etc.
    struct ClaimEntry {
        TokenType tokenType;
        address tokenAddress;
        bytes data;
    }

    string public constant name = "Sandbox SignedMultiGiveaway";
    string public constant version = "1.0";

    /// @dev the address of the signers authorized to sign messages
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    bytes32 public constant CLAIM_ENTRY_TYPEHASH =
        keccak256("ClaimEntry(uint256 tokenType,address tokenAddress,bytes data)");
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256(
            "Claim(uint256[] claimIds,uint256 expiration,address from,address to,ClaimEntry[] claims)ClaimEntry(uint256 tokenType,address tokenAddress,bytes data)"
        );

    uint256[49] private __preGap;
    /// @dev claimId => true if already claimed
    mapping(uint256 => bool) private _claimed;

    function __SignedMultiGiveaway_init() internal onlyInitializing {
        __ERC165_init_unchained();
        __ERC1155Receiver_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __EIP712_init_unchained(name, version);
        __SignedMultiGiveaway_init_unchained();
    }

    // solhint-disable-next-line no-empty-blocks
    function __SignedMultiGiveaway_init_unchained() internal onlyInitializing {}

    /// @dev See {IERC165-supportsInterface}.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155ReceiverUpgradeable, AccessControlEnumerableUpgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC721ReceiverUpgradeable).interfaceId ||
            ERC1155ReceiverUpgradeable.supportsInterface(interfaceId) ||
            AccessControlEnumerableUpgradeable.supportsInterface(interfaceId);
    }

    /// @notice return true if already claimed
    /// @return true if claimed
    function claimed(uint256 claimId) external view virtual returns (bool) {
        return _claimed[claimId];
    }

    /// @notice verifies a ERC712 signature for the Claim data type.
    /// @param sig signature part (v,r,s)
    /// @param claimIds unique id used to avoid double spending
    /// @param expiration expiration timestamp
    /// @param from source user
    /// @param to destination user
    /// @param claims list of tokens to do transfer
    /// @return the recovered address must match the signing address
    function verifySignature(
        Signature calldata sig,
        uint256[] calldata claimIds,
        uint256 expiration,
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) external view virtual returns (address) {
        bytes32 digest = _digest(claimIds, expiration, from, to, claims);
        return _recover(digest, sig);
    }

    /// @notice EIP712 domain separator
    /// @return the hash of the domain separator
    function domainSeparator() public view virtual returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice verifies a ERC712 signature and mint a new NFT for the buyer.
    /// @param sigs signature part
    /// @param claimIds unique claim ids
    /// @param from source user
    /// @param to destination user
    /// @param claims list of tokens to do transfer
    function _claim(
        uint256 numberOfSignatures,
        Signature[] calldata sigs,
        uint256[] calldata claimIds,
        uint256 expiration,
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) internal virtual {
        require(expiration == 0 || block.timestamp < expiration, "expired");
        for (uint256 i; i < claimIds.length; i++) {
            require(!_claimed[claimIds[i]], "Already claimed");
            _claimed[claimIds[i]] = true;
        }
        bytes32 digest = _digest(claimIds, expiration, from, to, claims);
        _checkSig(numberOfSignatures, digest, sigs);
        _transfer(from, to, claims);
    }

    /// @notice let the admin revoke some claims so they cannot be used anymore
    /// @param claimIds and array of claim Ids to revoke
    function _revokeClaims(uint256[] calldata claimIds) internal {
        for (uint256 i; i < claimIds.length; i++) {
            _claimed[claimIds[i]] = true;
        }
    }

    function _checkSig(
        uint256 numberOfSignatures,
        bytes32 digest,
        Signature[] calldata sigs
    ) internal virtual {
        require(numberOfSignatures == sigs.length, "invalid sigs");
        address lastSig = address(0);
        for (uint256 i; i < numberOfSignatures; i++) {
            address signer = _recover(digest, sigs[i]);
            require(hasRole(SIGNER_ROLE, signer), "invalid signer");
            // Signers must be different and sorted in incremental order.
            require(lastSig < signer, "invalid order");
            lastSig = signer;
        }
    }

    /// @dev Can be override to use a transfer manager
    function _transfer(
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) internal virtual;

    function _digest(
        uint256[] calldata claimIds,
        uint256 expiration,
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) internal view virtual returns (bytes32) {
        bytes32 structHash =
            keccak256(abi.encode(CLAIM_TYPEHASH, _hashClaimIds(claimIds), expiration, from, to, _hashClaims(claims)));
        return _hashTypedDataV4(structHash);
    }

    function _recover(bytes32 digest, Signature calldata sig) internal view virtual returns (address) {
        return ECDSAUpgradeable.recover(digest, sig.v, sig.r, sig.s);
    }

    function _hashClaimIds(uint256[] calldata claimIds) internal pure returns (bytes32 hash) {
        return keccak256(abi.encodePacked(claimIds));
    }

    function _hashClaims(ClaimEntry[] calldata claims) internal pure returns (bytes32 hash) {
        bytes32[] memory claimHashes = new bytes32[](claims.length);
        for (uint256 i; i < claims.length; i++) {
            ClaimEntry memory claimEntry = claims[i];
            claimHashes[i] = keccak256(
                abi.encode(
                    CLAIM_ENTRY_TYPEHASH,
                    claimEntry.tokenType,
                    claimEntry.tokenAddress,
                    keccak256(claimEntry.data)
                )
            );
        }
        return keccak256(abi.encodePacked(claimHashes));
    }

    uint256[49] private __postGap;
}
