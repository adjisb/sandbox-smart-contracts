//SPDX-License-Identifier: MIT

pragma solidity 0.8.5;

interface IContributionRules {
    function computeMultiplier(address account, uint256 amountStaked) external returns (uint256);
}
