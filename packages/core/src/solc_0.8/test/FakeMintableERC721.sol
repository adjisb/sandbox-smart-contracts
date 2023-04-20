// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-0.8/token/ERC721/ERC721.sol";

contract FakeMintableERC721 is ERC721 {
    constructor() ERC721("MINFT", "MINFT") {}

    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
}
