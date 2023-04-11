/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This code has not been reviewed.
 * Do not use or deploy this code before reviewing it personally first.
 */
// solhint-disable-next-line compiler-fixed
pragma solidity 0.5.9;

/**
 * @title ERC721TokenReceiver
 * @author The Sandbox
 * @notice
 */
interface ERC721TokenReceiver {
    /**
     * @notice Handle the receipt of an NFT
     * @dev The ERC721 smart contract calls this function on the recipient
     * after a `transfer`. This function MAY throw to revert and reject the
     * transfer. Return of other than the magic value MUST result in the
     * transaction being reverted.
     * Note: the contract address is always the message sender.
     * @param operator The address which called `safeTransferFrom` function
     * @param from The address which previously owned the token
     * @param tokenId The NFT identifier which is being transferred
     * @param data Additional data with no specified format
     * @return `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))` unless throwing
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
