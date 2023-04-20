// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-0.8/token/ERC20/ERC20.sol";

contract FakeMintableERC20 is ERC20 {
    constructor() ERC20("MINE", "MINE") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
