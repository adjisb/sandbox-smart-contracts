//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {SignedMultiGiveawayBase} from "./SignedMultiGiveawayBase.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ERC2771Handler} from "../../common/BaseWithStorage/ERC2771Handler.sol";

/// @title This contract give rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing.
/// @dev The whole contract is split in the base one this implementation to facilitate the reading and split
/// @dev the signature checking code.
/// @dev this contract add some limits to each claim and rate limits per token and tokenId for sum of all the claims.
/// @dev This contract support meta transactions.
/// @dev This contract is final, don't inherit form it.
contract SignedMultiGiveaway is SignedMultiGiveawayBase, PausableUpgradeable, ERC2771Handler {
    /// @notice limits applied for each claim
    /// @dev the rate limit goes from 1/2**32 [wei/sec] to 2**128 [wei/sec], 2**32secs ~= 136years, 2**128 ~= 3e38wei
    /// @dev 2**96 ~= 7e10 eth
    struct RateLimitData {
        uint256 timestamp; // saved block.timestamp
        uint32 timeBase; // numerator of the rate limit in secs, 0 => check disabled
        uint128 maxWeiPerTimeBase; // divisor of the rate limit in weis, 0 => pause/always revert
        uint96 maxWeiPerClaim; // maximum amount of wei per each individual claim, 0 => check disabled
    }

    /// @dev global limits that affect the whole contract behaviour
    struct LimitData {
        uint64 numberOfSignatures; // Amount of signatures needed minus one to approve a message, 0 => 1 signature
        uint64 maxClaimEntries; // Maximum amount of claims per message, 0 => no limit/disabled
    }

    /// @dev this role is for addresses that help the admin. Can pause the contract, butF, only the admin can unpause it.
    bytes32 public constant BACKOFFICE_ROLE = keccak256("BACKOFFICE_ROLE");

    /// @dev configurable global limits for the contract.
    LimitData public limits;

    /// @dev limits applied to each claim per token
    /// @dev Token -> Rate
    mapping(address => RateLimitData) public ratePerToken;

    /// @dev limits applied to each claim per token and tokenId (most useful for EIP1155 tokens)
    /// @dev Token -> id -> Rate
    mapping(address => mapping(uint256 => RateLimitData)) public ratePerId;

    event Claimed(uint256[] claimIds, address indexed from, address indexed to, ClaimEntry[] claims, address operator);
    event RevokedClaims(uint256[] claimIds, address operator);
    event AssetsRecovered(address to, ClaimEntry[] claims, address operator);
    event RateLimitPerTokenSet(
        address token,
        uint32 timeBase,
        uint128 maxWeiPerTimeBase,
        uint96 maxWeiPerClaim,
        address operator
    );
    event RateLimitPerIdSet(
        address token,
        uint256 tokenId,
        uint32 timeBase,
        uint128 maxWeiPerTimeBase,
        uint96 maxWeiPerClaim,
        address operator
    );
    event LimitsSet(LimitData limits, address operator);

    function initialize(address trustedForwarder_, address admin_) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155Receiver_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __AccessControl_init_unchained();
        __EIP712_init_unchained(name, version);
        __Pausable_init_unchained();
        __ERC2771Handler_initialize(trustedForwarder_);
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(BACKOFFICE_ROLE, admin_);
    }

    /// @notice verifies the ERC712 signatures and transfer tokens from the source user to the destination user.
    /// @param sigs signature part (v,r,s) the array of signatures M in N of M sigs
    /// @param claimIds unique claim ids, used by the backend to avoid double spending
    /// @param from source user
    /// @param to destination user
    /// @param claims list of tokens to do transfer
    function claim(
        Signature[] calldata sigs,
        uint256[] calldata claimIds,
        uint256 expiration,
        address from, // address(this)
        address to,
        ClaimEntry[] calldata claims
    ) external whenNotPaused {
        _claim(limits.numberOfSignatures + 1, sigs, claimIds, expiration, from, to, claims);
        emit Claimed(claimIds, from, to, claims, _msgSender());
    }

    /// @notice let the admin recover tokens from the contract
    /// @param to destination address of the recovered fund
    /// @param claims list of the tokens to transfer
    function recoverAssets(address to, ClaimEntry[] calldata claims) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Only admin");
        _transfer(address(this), to, claims);
        emit AssetsRecovered(to, claims, _msgSender());
    }

    /// @notice let the admin revoke some claims so they cannot be used anymore
    /// @param claimIds and array of claim Ids to revoke
    function revokeClaims(uint256[] calldata claimIds) external {
        require(hasRole(BACKOFFICE_ROLE, _msgSender()), "Only backoffice");
        _revokeClaims(claimIds);
        emit RevokedClaims(claimIds, _msgSender());
    }

    /// @notice Triggers stopped state. No mre claims are accepted.
    function pause() external {
        require(hasRole(BACKOFFICE_ROLE, _msgSender()), "Only backoffice");
        _pause();
    }

    /// @notice Returns to the normal state. Accept claims.
    function unpause() external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Only admin");
        _unpause();
    }

    /// @notice set the limits per token
    /// @param token the token to which will assign the limit
    /// @param timeBase the base time of the rate limit in secs for 10eth/week => 60*60*24*7
    /// @param maxWeiPerTimeBase the max amount of the rate limit for 10eth/week => 10eth
    /// @param maxWeiPerClaim the max amount per each claim, for example 0.01eth per claim
    function setLimitPerToken(
        address token,
        uint32 timeBase,
        uint128 maxWeiPerTimeBase,
        uint96 maxWeiPerClaim
    ) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Only admin");
        require(token != address(0), "invalid token address");
        ratePerToken[token] = RateLimitData({
            timestamp: 0,
            timeBase: timeBase,
            maxWeiPerTimeBase: maxWeiPerTimeBase,
            maxWeiPerClaim: maxWeiPerClaim
        });
        emit RateLimitPerTokenSet(token, timeBase, maxWeiPerTimeBase, maxWeiPerClaim, _msgSender());
    }

    /// @notice set the limits per token and tokenId
    /// @param token the token to which will assign the limit
    /// @param tokenId the id of the token
    /// @param timeBase the base time of the rate limit in secs for 10eth/week => 60*60*24*7
    /// @param maxWeiPerTimeBase the max amount of the rate limit for 10eth/week => 10eth
    /// @param maxWeiPerClaim the max amount per each claim, for example 0.01eth per claim
    function setLimitPerId(
        address token,
        uint256 tokenId,
        uint32 timeBase,
        uint128 maxWeiPerTimeBase,
        uint96 maxWeiPerClaim
    ) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Only admin");
        require(token != address(0), "invalid token address");
        ratePerId[token][tokenId] = RateLimitData({
            timestamp: 0,
            timeBase: timeBase,
            maxWeiPerTimeBase: maxWeiPerTimeBase,
            maxWeiPerClaim: maxWeiPerClaim
        });
        emit RateLimitPerIdSet(token, tokenId, timeBase, maxWeiPerTimeBase, maxWeiPerClaim, _msgSender());
    }

    /// @notice set the global limits of the contract
    /// @param numberOfSignatures number of signatures needed to approve a claim (default to 1)
    /// @param maxClaimEntries maximum number of entries in a claim (amount of transfers) that can be claimed at once
    function setLimits(uint64 numberOfSignatures, uint64 maxClaimEntries) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Only admin");
        require(numberOfSignatures > 0, "invalid value");
        require(maxClaimEntries > 0, "invalid maxClaimEntries");
        limits = LimitData({numberOfSignatures: numberOfSignatures - 1, maxClaimEntries: maxClaimEntries - 1});
        emit LimitsSet(limits, _msgSender());
    }

    function _transfer(
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) internal virtual override {
        uint256 len = claims.length;
        require(len <= limits.maxClaimEntries + 1, "too many claims");
        for (uint256 i; i < len; i++) {
            _transferEntry(from, to, claims[i]);
        }
    }

    function _transferEntry(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal virtual {
        if (claimEntry.tokenType == TokenType.ERC20) {
            _transferERC20(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721) {
            _transferERC721(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_SAFE) {
            _transferERC721Safe(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC1155) {
            _transferERC1155(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC1155_BATCH) {
            _transferERC1155Batch(from, to, claimEntry);
        } else {
            revert("Invalid token type");
        }
    }

    function _transferERC20(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal virtual {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 amount = abi.decode(claimEntry.data, (uint256));
        _checkLimits(ratePerToken[tokenAddress], amount);
        if (from == address(this)) {
            require(IERC20Upgradeable(tokenAddress).transfer(to, amount), "Transfer failed");
        } else {
            require(IERC20Upgradeable(tokenAddress).transferFrom(from, to, amount), "Transfer failed");
        }
    }

    function _transferERC721(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal virtual {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 tokenId = abi.decode(claimEntry.data, (uint256));
        _checkLimits(ratePerToken[tokenAddress], 1);
        IERC721Upgradeable(tokenAddress).transferFrom(from, to, tokenId);
    }

    function _transferERC721Safe(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal virtual {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 tokenId = abi.decode(claimEntry.data, (uint256));
        _checkLimits(ratePerToken[tokenAddress], 1);
        IERC721Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenId);
    }

    function _transferERC1155(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal virtual {
        address tokenAddress = claimEntry.tokenAddress;
        (uint256 tokenId, uint256 amount, bytes memory data) = abi.decode(claimEntry.data, (uint256, uint256, bytes));
        _checkLimits(ratePerToken[tokenAddress], amount);
        _checkLimits(ratePerId[tokenAddress][tokenId], amount);
        IERC1155Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenId, amount, data);
    }

    function _transferERC1155Batch(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal virtual {
        address tokenAddress = claimEntry.tokenAddress;
        (uint256[] memory ids, uint256[] memory amounts, bytes memory data) =
            abi.decode(claimEntry.data, (uint256[], uint256[], bytes));

        uint256 len = ids.length;
        require(len == amounts.length, "invalid data");
        for (uint256 i; i < len; i++) {
            uint256 amount = amounts[i];
            uint256 tokenId = ids[i];
            _checkLimits(ratePerToken[tokenAddress], amount);
            _checkLimits(ratePerId[tokenAddress][tokenId], amount);
        }
        IERC1155Upgradeable(tokenAddress).safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function _checkLimits(RateLimitData storage data, uint256 amount) internal virtual {
        if (data.maxWeiPerClaim > 0) {
            require(amount < data.maxWeiPerClaim, "checkLimits, amount too high");
        }
        uint256 deltaT = block.timestamp - data.timestamp;
        if (deltaT > data.timeBase) {
            deltaT = data.timeBase;
        }
        // amount / deltaT < rateLimit == (maxWeiPerTimeBase / TIME_BASE)
        require(amount * data.timeBase <= data.maxWeiPerTimeBase * deltaT, "checkLimits, rate exceeded");
        data.timestamp = block.timestamp;
    }

    function _msgSender() internal view virtual override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view virtual override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
