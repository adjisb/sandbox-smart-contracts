//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "../../common/Libraries/TileLib.sol";

contract TileTester {
    using TileLib for TileLib.Tile;
    TileLib.Tile[30] internal tiles;

    function setQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tiles[idx] = tiles[idx].set(x, y, size);
    }

    function clearQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tiles[idx] = tiles[idx].clear(x, y, size);
    }

    function getTile(uint256 idx) external view returns (TileLib.Tile memory) {
        return tiles[idx];
    }

    function union(uint256[] calldata idxs, uint256 idxOut) external {
        TileLib.Tile memory t;
        for (uint256 i = 0; i < idxs.length; i++) {
            t = t.or(tiles[idxs[i]]);
        }
        tiles[idxOut] = t;
    }

    function intersection(uint256[] calldata idxs, uint256 idxOut) external {
        TileLib.Tile memory t = tiles[idxs[0]];
        for (uint256 i = 1; i < idxs.length; i++) {
            t = t.and(tiles[idxs[i]]);
        }
        tiles[idxOut] = t;
    }

    function intersect(uint256 idx, uint256 otherIdx) external view returns (bool) {
        return tiles[idx].intersect(tiles[otherIdx]);
    }

    function intersectQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return tiles[idx].intersect(x, y, size);
    }

    function findAPixel(uint256 idx) external view returns (TileLib.Tile memory) {
        return tiles[idx].findAPixel();
    }

    function isEqual(uint256 idx1, uint256 idx2) external view returns (bool) {
        return tiles[idx1].isEqual(tiles[idx2]);
    }

    function containQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return tiles[idx].contain(x, y, size);
    }

    function addIfNotContain(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external view returns (bool, TileLib.Tile memory) {
        return tiles[idx].addIfNotContain(x, y);
    }

    function containCoord(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external view returns (bool) {
        return tiles[idx].contain(x, y);
    }
}
