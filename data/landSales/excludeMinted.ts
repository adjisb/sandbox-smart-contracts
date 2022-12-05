/* eslint-disable @typescript-eslint/no-non-null-assertion */
import hre from 'hardhat';
import {TheGraph} from "../../scripts/utils/thegraph";
import {SectorData, SectorLand} from "./getLandSales";

export async function excludeMinted({sector, lands}: SectorData): Promise<SectorData> {
  const result: SectorData = {
    sector,
    lands: [],
    estates: []
  }
  let minX = 204, minY = 204, maxX = -204, maxY = -204
  lands.forEach(({coordinateX, coordinateY}) => {
    if (coordinateX < minX) minX = coordinateX
    if (coordinateX > maxX) maxX = coordinateX
    if (coordinateY < minY) minY = coordinateY
    if (coordinateY > maxY) maxY = coordinateY
  })
  const mintedLands = await getMintedLands({minX, minY, maxX, maxY})
  lands.forEach(land => {
    if (mintedLands.find(m => m.coordinateX === land.coordinateX && m.coordinateY === land.coordinateY)) {
      console.log("minted", land)
      return
    }
    result.lands.push(land)
  })
  return result
}

async function getMintedLands({minX, minY, maxX, maxY}: {minX: number, minY: number, maxX: number, maxY: number}): Promise<SectorLand[]> {
  let l1, l2;
  if (hre.network.tags.testnet) {
    // l1 = "GOERLI"
    // l2 = "MUMBAI"
    l1 = "MAINNET"
    l2 = "POLYGON"
  } else {
    l1 = "MAINNET"
    l2 = "POLYGON"
  }
  console.log({minX, minY, maxX, maxY})
  const query = `{
    landTokens(where: {x_gte: ${minX + 204} y_gte: ${minY + 204} x_lte:${maxX + 204} y_lte: ${maxY + 204}}) {
      id
      x
      y
      owner { id }
    }
  }`
  const landMap: {[id: string]: SectorLand} = {}
  const landChains = await Promise.all([
    new TheGraph(process.env[`SANDBOX_GRAPH_URL_${l1}`]!).query<{id: string, x: number, y: number, owner: {id: string}}>(query, "landTokens", {}),
    new TheGraph(process.env[`SANDBOX_GRAPH_URL_${l2}`]!).query<{id: string, x: number, y: number, owner: {id: string}}>(query, "landTokens", {})
  ])
  landChains.forEach(lands => lands.forEach(land => {
    if (landMap[land.id]) return;
    landMap[land.id] = {
      coordinateX: land.x - 204,
      coordinateY: land.y - 204,
      ownerAddress: land.owner.id
    }
  }))
  return Object.values(landMap)
}