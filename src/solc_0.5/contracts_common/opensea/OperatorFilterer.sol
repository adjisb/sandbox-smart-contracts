// SPDX-License-Identifier: MIT
pragma solidity ^0.5.2;


import {IOperatorFilterRegistry} from "./IOperatorFilterRegistry.sol";
import {GetCode} from "../Libraries/GetCode.sol";

contract OperatorFilterer {
    // error OperatorNotAllowed(address operator);

    IOperatorFilterRegistry constant operatorFilterRegistry =
    IOperatorFilterRegistry(0x000000000000AAeB6D7670E522A718067333cd4E);

    constructor(address subscriptionOrRegistrantToCopy, bool subscribe) public {
        // If an inheriting token contract is deployed to a network without the registry deployed, the modifier
        // will not revert, but the contract will need to be registered with the registry once it is deployed in
        // order for the modifier to filter addresses.
        if (GetCode.len(address(operatorFilterRegistry)) > 0) {
            if (subscribe) {
                operatorFilterRegistry.registerAndSubscribe(address(this), subscriptionOrRegistrantToCopy);
            } else {
                if (subscriptionOrRegistrantToCopy != address(0)) {
                    operatorFilterRegistry.registerAndCopyEntries(address(this), subscriptionOrRegistrantToCopy);
                } else {
                    operatorFilterRegistry.register(address(this));
                }
            }
        }
    }

    modifier onlyAllowedOperator() {
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (GetCode.len(address(operatorFilterRegistry)) > 0) {
            if (!operatorFilterRegistry.isOperatorAllowed(address(this), msg.sender)) {
                revert("OperatorNotAllowed(msg.sender)");
            }
        }
        _;
    }
}
