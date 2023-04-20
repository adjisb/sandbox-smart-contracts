// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-0.8/token/ERC1155/ERC1155.sol";

contract FakeMintableERC1155 is ERC1155 {
    constructor() ERC1155("http://test.test") {}

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public {
        _mintBatch(to, ids, amounts, data);
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public {
        _mint(account, id, amount, data);
    }
}
