import {Contract, ContractReceipt} from 'ethers';
import {waitFor, withSnapshot} from '../utils';
import {ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
export const zeroAddress = '0x0000000000000000000000000000000000000000';
export const setupLandV2 = withSnapshot(
  ['LandV2', 'Land_setup', 'Sand'],
  async function (hre) {
    const landContract = await ethers.getContract('Land');
    const sandContract = await ethers.getContract('Sand');
    const {landAdmin} = await getNamedAccounts();
    await setMinter(landContract)(landAdmin, true);
    return {
      landContract,
      sandContract,
      hre,
      ethers,
      getNamedAccounts,
      mintQuad: mintQuad(landContract),
    };
  }
);

export const setupLand = withSnapshot(['Land', 'Sand'], async function (hre) {
  const landContract = await ethers.getContract('Land');
  const sandContract = await ethers.getContract('Sand');
  const {landAdmin} = await getNamedAccounts();
  await setMinter(landContract)(landAdmin, true);
  return {
    landContract,
    sandContract,
    hre,
    ethers,
    getNamedAccounts,
    mintQuad: mintQuad(landContract),
  };
});

export const setupLandV1 = withSnapshot(
  ['LandV1', 'Land_setup', 'Sand'],
  async function (hre) {
    const landContract = await ethers.getContract('Land');
    const sandContract = await ethers.getContract('Sand');
    const {landAdmin} = await getNamedAccounts();
    await setMinter(landContract)(landAdmin, true);
    return {
      landContract,
      sandContract,
      hre,
      ethers,
      getNamedAccounts,
      mintQuad: mintQuad(landContract),
    };
  }
);

export function mintQuad(landContract: Contract) {
  return async (
    to: string,
    size: number,
    x: number,
    y: number
  ): Promise<ContractReceipt> => {
    const {landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(landAdmin));
    return waitFor(contract.mintQuad(to, size, x, y, '0x'));
  };
}

export function getId(layer: number, x: number, y: number): string {
  const lengthOfId = 64;
  const lengthOfBasicId = BigNumber.from(x + y * 408)._hex.length - 2;
  const lengthOfLayerAppendment = lengthOfId - lengthOfBasicId - 2;
  let layerAppendment = '';
  for (let i = 0; i < lengthOfLayerAppendment; i++) {
    layerAppendment = layerAppendment + '0';
  }
  return (
    `0x0${layer - 1}` +
    layerAppendment +
    BigNumber.from(x + y * 408)._hex.slice(2)
  );
}

export function setMinter(landContract: Contract) {
  return async (to: string, allowed: boolean): Promise<ContractReceipt> => {
    const {landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(landAdmin));
    return waitFor(contract.setMinter(to, allowed));
  };
}
