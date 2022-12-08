// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract GenerateCodeHash {
    function getCodeHash(address _contract) external view returns (bytes32) {
        return _contract.codehash;
    }
}