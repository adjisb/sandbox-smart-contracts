//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "sandbox-core/src/interfaces/IAssetAttributesRegistry.sol";
import "sandbox-core/src/interfaces/IAttributes.sol";
import "sandbox-core/src/interfaces/IERC20Extended.sol";

interface ICatalyst is IERC20Extended, IAttributes {
    function catalystId() external returns (uint16);

    function changeAttributes(IAttributes attributes) external;

    function getMaxGems() external view returns (uint8);

    function approveFor(
        address owner,
        address spender,
        uint256 amount
    ) external override returns (bool success);

    function getAttributes(uint256 assetId, IAssetAttributesRegistry.GemEvent[] calldata events)
        external
        view
        override
        returns (uint32[] memory values);

    function getDecimals() external pure returns (uint8);
}
