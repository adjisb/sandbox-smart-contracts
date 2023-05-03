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
    /// @notice info used to implement rate limit
    /// @dev the rate limit goes from 1/2**32 [wei/sec] to 2**128 [wei/sec], 2**32secs ~= 136years, 2**128 ~= 3e38wei
    struct RateLimit {
        uint256 timestamp; // saved block.timestamp
        uint32 timeBase; // numerator of the rate limit in secs, 0 => check disabled
        uint128 maxWeiPerTimeBase; // divisor of the rate limit in weis, 0 => pause/always revert
    }

    /// @notice limits applied for each claim per token
    /// @dev 2**96 ~= 7e10 eth
    struct PerTokenLimitData {
        RateLimit rateLimit;
        uint96 maxWeiPerClaim; // maximum amount of wei per each individual claim, 0 => check disabled
    }

    /// @dev global limits that affect the whole contract behaviour
    struct LimitData {
        uint64 numberOfSignaturesNeeded; // Amount of signatures needed minus one to approve a message, 0 => 1 signature
        uint64 maxClaimEntries; // Maximum amount of claims per message, 0 => no limit/disabled
    }

    /// @dev args of claim, used to pass an array to batchClaim
    struct BatchClaimData {
        Signature[] sigs;
        uint256[] claimIds;
        uint256 expiration;
        address from; // address(this)
        address to;
        ClaimEntry[] claims;
    }

    /// @dev this role is for addresses that help the admin. Can pause the contract, butF, only the admin can unpause it.
    bytes32 public constant BACKOFFICE_ROLE = keccak256("BACKOFFICE_ROLE");

    /// @dev configurable global limits for the contract.
    LimitData private _limits;

    /// @dev limits applied to each claim per token and tokenId (most useful for EIP1155 tokens)
    /// @dev Token -> id -> Rate
    mapping(address => mapping(uint256 => PerTokenLimitData)) private _perTokenLimitData;

    event Claimed(uint256[] claimIds, address indexed from, address indexed to, ClaimEntry[] claims, address operator);
    event RevokedClaims(uint256[] claimIds, address operator);
    event AssetsRecovered(address to, ClaimEntry[] claims, address operator);
    event RateLimitSet(address token, uint256 tokenId, uint32 timeBase, uint128 maxWeiPerTimeBase, address operator);
    event MaxWeiPerClaimSet(address token, uint256 tokenId, uint96 maxWeiPerClaim, address operator);
    event NumberOfSignaturesNeededSet(uint256 numberOfSignaturesNeeded, address operator);
    event MaxClaimEntriesSet(uint256 maxClaimEntries, address operator);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "only admin");
        _;
    }

    modifier onlyBackoffice() {
        require(hasRole(BACKOFFICE_ROLE, _msgSender()), "only backoffice");
        _;
    }

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
        __SignedMultiGiveaway_init_unchained();
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
        address from, // if different from address(this) then must be used with approve
        address to,
        ClaimEntry[] calldata claims
    ) external whenNotPaused {
        _claim(_limits.numberOfSignaturesNeeded + 1, sigs, claimIds, expiration, from, to, claims);
        emit Claimed(claimIds, from, to, claims, _msgSender());
    }

    /// @notice does a lot of claims in batch
    /// @param batch an array of args to the claim method
    function batchClaim(BatchClaimData[] calldata batch) external whenNotPaused {
        uint256 len = batch.length;
        require(len > 0, "invalid len");
        address sender = _msgSender();
        for (uint256 i; i < len; i++) {
            BatchClaimData calldata c = batch[i];
            _claim(_limits.numberOfSignaturesNeeded + 1, c.sigs, c.claimIds, c.expiration, c.from, c.to, c.claims);
            emit Claimed(c.claimIds, c.from, c.to, c.claims, sender);
        }
    }

    /// @notice let the admin recover tokens from the contract
    /// @param to destination address of the recovered fund
    /// @param claims list of the tokens to transfer
    function recoverAssets(address to, ClaimEntry[] calldata claims) external onlyAdmin {
        _transfer(address(this), to, claims);
        emit AssetsRecovered(to, claims, _msgSender());
    }

    /// @notice let the admin revoke some claims so they cannot be used anymore
    /// @param claimIds and array of claim Ids to revoke
    function revokeClaims(uint256[] calldata claimIds) external onlyBackoffice {
        _revokeClaims(claimIds);
        emit RevokedClaims(claimIds, _msgSender());
    }

    /// @notice Triggers stopped state. No mre claims are accepted.
    function pause() external onlyBackoffice {
        _pause();
    }

    /// @notice Returns to the normal state. Accept claims.
    function unpause() external onlyAdmin {
        _unpause();
    }

    /// @notice set the global limits of the contract
    /// @param numberOfSignaturesNeeded number of signatures needed to approve a claim (default to 1)
    function setNumberOfSignaturesNeeded(uint64 numberOfSignaturesNeeded) external onlyAdmin {
        require(numberOfSignaturesNeeded > 0, "invalid numberOfSignaturesNeeded");
        _limits = LimitData({
            numberOfSignaturesNeeded: numberOfSignaturesNeeded - 1,
            maxClaimEntries: _limits.maxClaimEntries
        });
        emit NumberOfSignaturesNeededSet(numberOfSignaturesNeeded, _msgSender());
    }

    /// @notice set the global limits of the contract
    /// @param maxClaimEntries maximum number of entries in a claim (amount of transfers) that can be claimed at once
    function setMaxClaimEntries(uint64 maxClaimEntries) external onlyAdmin {
        require(maxClaimEntries > 0, "invalid maxClaimEntries");
        _limits = LimitData({
            numberOfSignaturesNeeded: _limits.numberOfSignaturesNeeded,
            maxClaimEntries: maxClaimEntries - 1
        });
        emit MaxClaimEntriesSet(maxClaimEntries, _msgSender());
    }

    /// @notice set the limits per token and tokenId
    /// @param token the token to which will assign the limit
    /// @param tokenId for ERC1155 is the id of the token, else it must be zero
    /// @param maxWeiPerClaim the max amount per each claim, for example 0.01eth per claim
    /// @dev even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm
    function setMaxWeiPerClaim(
        address token,
        uint256 tokenId,
        uint96 maxWeiPerClaim
    ) external onlyAdmin {
        require(token != address(0), "invalid token address");
        _perTokenLimitData[token][tokenId].maxWeiPerClaim = maxWeiPerClaim;
        emit MaxWeiPerClaimSet(token, tokenId, maxWeiPerClaim, _msgSender());
    }

    /// @notice set the limits per token and tokenId
    /// @param token the token to which will assign the limit
    /// @param tokenId for ERC1155 is the id of the token, else it must be zero
    /// @param timeBase the base time of the rate limit in secs for 10eth/week => 60*60*24*7
    /// @param maxWeiPerTimeBase the max amount of the rate limit for 10eth/week => 10eth
    /// @dev even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm
    function setRateLimit(
        address token,
        uint256 tokenId,
        uint32 timeBase,
        uint128 maxWeiPerTimeBase
    ) external onlyAdmin {
        require(token != address(0), "invalid token address");
        _perTokenLimitData[token][tokenId].rateLimit = RateLimit({
            timestamp: 0,
            timeBase: timeBase,
            maxWeiPerTimeBase: maxWeiPerTimeBase
        });
        emit RateLimitSet(token, tokenId, timeBase, maxWeiPerTimeBase, _msgSender());
    }

    /// @notice get the needed number of signatures to approve a claim
    function getNumberOfSignaturesNeeded() external view returns (uint256) {
        return _limits.numberOfSignaturesNeeded + 1;
    }

    /// @notice get the maximum claim entries per claim
    function getMaxClaimEntries() external view returns (uint256) {
        return _limits.maxClaimEntries + 1;
    }

    /// @notice get maximum Weis that can be claimed at once
    /// @param token the token contract address
    /// @param tokenId inf ERC1155 the token id else must be zero
    /// @dev even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm
    function getMaxWeiPerClaim(address token, uint256 tokenId) external view returns (uint256) {
        return _perTokenLimitData[token][tokenId].maxWeiPerClaim;
    }

    /// @notice get the rate limit (rate = maxWeiPerTimeBase / timeBase) and last claim timestamp
    /// @param token the token contract address
    /// @param tokenId inf ERC1155 the token id else must be zero
    /// @dev even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm
    function getRateLimit(address token, uint256 tokenId) external view returns (RateLimit memory) {
        return _perTokenLimitData[token][tokenId].rateLimit;
    }

    function _transfer(
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) internal override {
        uint256 len = claims.length;
        require(len <= _limits.maxClaimEntries + 1, "too many claims");
        for (uint256 i; i < len; i++) {
            _transferEntry(from, to, claims[i]);
        }
    }

    // solhint-disable code-complexity
    function _transferEntry(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        if (claimEntry.tokenType == TokenType.ERC20) {
            _transferERC20(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721) {
            _transferERC721(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_BATCH) {
            _transferERC721Batch(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_SAFE) {
            _transferERC721Safe(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_SAFE_BATCH) {
            _transferERC721SafeBatch(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC1155) {
            _transferERC1155(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC1155_BATCH) {
            _transferERC1155Batch(from, to, claimEntry);
        } else {
            revert("invalid token type");
        }
    }

    function _transferERC20(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 amount = abi.decode(claimEntry.data, (uint256));
        _checkLimits(_perTokenLimitData[tokenAddress][0], amount);
        if (from == address(this)) {
            require(IERC20Upgradeable(tokenAddress).transfer(to, amount), "transfer failed");
        } else {
            require(IERC20Upgradeable(tokenAddress).transferFrom(from, to, amount), "transfer failed");
        }
    }

    function _transferERC721(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 tokenId = abi.decode(claimEntry.data, (uint256));
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], 1);
        IERC721Upgradeable(tokenAddress).transferFrom(from, to, tokenId);
    }

    function _transferERC721Batch(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256[] memory tokenIds = abi.decode(claimEntry.data, (uint256[]));
        uint256 len = tokenIds.length;
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], len);
        for (uint256 i; i < len; i++) {
            IERC721Upgradeable(tokenAddress).transferFrom(from, to, tokenIds[i]);
        }
    }

    function _transferERC721Safe(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 tokenId = abi.decode(claimEntry.data, (uint256));
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], 1);
        IERC721Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenId);
    }

    function _transferERC721SafeBatch(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256[] memory tokenIds = abi.decode(claimEntry.data, (uint256[]));
        uint256 len = tokenIds.length;
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], len);
        for (uint256 i; i < len; i++) {
            IERC721Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenIds[i]);
        }
    }

    function _transferERC1155(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        (uint256 tokenId, uint256 amount, bytes memory data) = abi.decode(claimEntry.data, (uint256, uint256, bytes));
        _checkLimits(_perTokenLimitData[tokenAddress][tokenId], amount);
        IERC1155Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenId, amount, data);
    }

    function _transferERC1155Batch(
        address from,
        address to,
        ClaimEntry calldata claimEntry
    ) internal {
        address tokenAddress = claimEntry.tokenAddress;
        (uint256[] memory ids, uint256[] memory amounts, bytes memory data) =
            abi.decode(claimEntry.data, (uint256[], uint256[], bytes));

        uint256 len = ids.length;
        require(len > 0, "invalid data len");
        require(len == amounts.length, "invalid data");
        for (uint256 i; i < len; i++) {
            _checkLimits(_perTokenLimitData[tokenAddress][ids[i]], amounts[i]);
        }
        IERC1155Upgradeable(tokenAddress).safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function _checkLimits(PerTokenLimitData storage limits, uint256 amount) internal {
        require(amount > 0, "invalid amount");
        if (limits.maxWeiPerClaim > 0) {
            require(amount < limits.maxWeiPerClaim, "checkLimits, amount too high");
        }
        RateLimit storage rateLimit = limits.rateLimit;
        uint256 deltaT = block.timestamp - rateLimit.timestamp;
        if (deltaT > rateLimit.timeBase) {
            deltaT = rateLimit.timeBase;
        }
        // amount / deltaT < rateLimit == (maxWeiPerTimeBase / TIME_BASE)
        require(amount * rateLimit.timeBase <= rateLimit.maxWeiPerTimeBase * deltaT, "checkLimits, rate exceeded");
        rateLimit.timestamp = block.timestamp;
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
