/* solhint-disable not-rely-on-time, func-order */

// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./WithAdmin.sol";
import "../Libraries/SafeMathWithRequire.sol";
import "@openzeppelin/contracts-0.8/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/ERC20.sol";

/**
 * @title Referral Validator
 * @notice This contract verifies if a referral is valid
 */
contract WithReferralValidator is WithAdmin {
    address private _signingWallet;
    uint256 private _maxCommissionRate;

    mapping(address => uint256) private _previousSigningWallets;
    uint256 private _previousSigningDelay = 60 * 60 * 24 * 10;

    event ReferralUsed(
        address indexed referrer,
        address indexed referee,
        address indexed token,
        uint256 amount,
        uint256 commission,
        uint256 commissionRate
    );

    constructor(
        address initialSigningWallet,
        uint256 initialMaxCommissionRate,
        address admin
    ) {
        _signingWallet = initialSigningWallet;
        _maxCommissionRate = initialMaxCommissionRate;
        _admin = admin;
    }

    /**
     * @notice Update the signing wallet
     * @param newSigningWallet The new address of the signing wallet
     */
    function updateSigningWallet(address newSigningWallet) external {
        require(_admin == msg.sender, "Sender not admin");
        _previousSigningWallets[_signingWallet] = block.timestamp + _previousSigningDelay;
        _signingWallet = newSigningWallet;
    }

    /**
     * @dev signing wallet authorized for referral
     * @return the address of the signing wallet
     */
    function getSigningWallet() external view returns (address) {
        return _signingWallet;
    }

    /**
     * @dev Update the maximum commission rate
     * @param newMaxCommissionRate The new maximum commission rate
     */
    function updateMaxCommissionRate(uint256 newMaxCommissionRate) external {
        require(_admin == msg.sender, "Sender not admin");
        _maxCommissionRate = newMaxCommissionRate;
    }

    /**
     * @notice the max commision rate
     * @return the maximum commision rate that a referral can give
     */
    function getMaxCommisionRate() external view returns (uint256) {
        return _maxCommissionRate;
    }

    function handleReferralWithETH(
        uint256 amount,
        bytes memory referral,
        address payable destination
    ) internal {
        uint256 amountForDestination = amount;

        if (referral.length > 0) {
            (bytes memory signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate) =
                decodeReferral(referral);

            uint256 commission = 0;

            if (isReferralValid(signature, referrer, referee, expiryTime, commissionRate)) {
                commission = SafeMath.div(SafeMath.mul(amount, commissionRate), 10000);

                emit ReferralUsed(referrer, referee, address(0), amount, commission, commissionRate);
                amountForDestination = SafeMath.sub(amountForDestination, commission);
            }

            if (commission > 0) {
                payable(referrer).transfer(commission);
            }
        }

        destination.transfer(amountForDestination);
    }

    function handleReferralWithERC20(
        address buyer,
        uint256 amount,
        bytes memory referral,
        address payable destination,
        address tokenAddress
    ) internal {
        ERC20 token = ERC20(tokenAddress);
        uint256 amountForDestination = amount;

        if (referral.length > 0) {
            (bytes memory signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate) =
                decodeReferral(referral);

            uint256 commission = 0;

            if (isReferralValid(signature, referrer, referee, expiryTime, commissionRate)) {
                commission = SafeMath.div(SafeMath.mul(amount, commissionRate), 10000);

                emit ReferralUsed(referrer, referee, tokenAddress, amount, commission, commissionRate);
                amountForDestination = SafeMath.sub(amountForDestination, commission);
            }

            if (commission > 0) {
                require(token.transferFrom(buyer, referrer, commission), "commision transfer failed");
            }
        }

        require(token.transferFrom(buyer, destination, amountForDestination), "payment transfer failed");
    }

    /**
     * @notice Check if a referral is valid
     * @param signature The signature to check (signed referral)
     * @param referrer The address of the referrer
     * @param referee The address of the referee
     * @param expiryTime The expiry time of the referral
     * @param commissionRate The commissionRate of the referral
     * @return True if the referral is valid
     */
    function isReferralValid(
        bytes memory signature,
        address referrer,
        address referee,
        uint256 expiryTime,
        uint256 commissionRate
    ) public view returns (bool) {
        if (commissionRate > _maxCommissionRate || referrer == referee || block.timestamp > expiryTime) {
            return false;
        }

        bytes32 hashedData = keccak256(abi.encodePacked(referrer, referee, expiryTime, commissionRate));

        address signer =
            ECDSA.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        if (_previousSigningWallets[signer] >= block.timestamp) {
            return true;
        }

        return _signingWallet == signer;
    }

    function decodeReferral(bytes memory referral)
        public
        pure
        returns (
            bytes memory,
            address,
            address,
            uint256,
            uint256
        )
    {
        (bytes memory signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate) =
            abi.decode(referral, (bytes, address, address, uint256, uint256));

        return (signature, referrer, referee, expiryTime, commissionRate);
    }
}