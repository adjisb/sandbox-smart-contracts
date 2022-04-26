import {ethers} from 'hardhat';
import {BigNumber, Contract, Event} from 'ethers';
import {Block} from '@ethersproject/providers';
import {waitFor, withSnapshot} from '../../../utils';
import {assetAttributesRegistryFixture} from '../../../common/fixtures/assetAttributesRegistry';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';

export const setupAssetAttributesRegistry = withSnapshot(
  [
    'Asset_setup', // we need to setup bounce admin.
    'GemsCatalystsRegistry_setup', // No Contract deployed with name Gem_POWER --> PolygonGemPower
    'AssetAttributesRegistry_setup', // NOT_AUTHORIZED_MINTER
    'AssetUpgrader_setup', // we need AssetUpgrader_setup to give super permissions
  ],
  assetAttributesRegistryFixture
);

export const setupAssetAttributesRegistryGemsAndCatalysts = withSnapshot(
  [
    'AssetMinter_setup', // we need to setup bounce admin.
    'GemsCatalystsRegistry_setup', // No Contract deployed with name Gem_POWER --> PolygonGemPower
    'AssetAttributesRegistry_setup', // NOT_AUTHORIZED_MINTER
    'AssetUpgrader_setup', // we need AssetUpgrader_setup to give super permissions
  ],
  async () => ({
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetAttributesRegistryFixture()),
  })
);

export async function setCatalyst(
  from: string,
  assetId: BigNumber,
  catalystId: number,
  gemsIds: number[],
  to: string,
  assetUpgrader: Contract,
  assetAttributesRegistry: Contract,
  collectionId?: BigNumber
): Promise<{
  record: {catalystId: number; exists: boolean; gemIds: []};
  event: Event;
  block: Block;
}> {
  if (collectionId) {
    await waitFor(
      assetUpgrader
        .connect(ethers.provider.getSigner(from))
        .changeCatalyst(from, collectionId, catalystId, gemsIds, to)
    );
  } else {
    await waitFor(
      assetUpgrader
        .connect(ethers.provider.getSigner(from))
        .changeCatalyst(from, assetId, catalystId, gemsIds, to)
    );
  }
  const record = await assetAttributesRegistry.getRecord(assetId);

  const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
    assetAttributesRegistry.filters.CatalystApplied()
  );
  const event = assetAttributesRegistryEvents.filter(
    (e) => e.event === 'CatalystApplied'
  )[0];
  const block = await ethers.provider.getBlock('latest');
  return {record, event, block};
}
