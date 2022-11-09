// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {OperatorFilterer} from "./OperatorFilterer.sol";

contract DefaultOperatorFilterer is OperatorFilterer {
    address private constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    // solhint-disable-next-line no-empty-blocks
    constructor() OperatorFilterer(DEFAULT_SUBSCRIPTION, true) {}
}
