import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read('HellsKitchen', 'waveMaxTokens');
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('HellsKitchen', 'owner');
    const waveMaxTokens = 500;
    const waveMaxTokensToBuy = 500;
    const waveSingleTokenPrice = (1 * 10 ** 18).toString();
    await catchUnknownSigner(
      execute(
        'HellsKitchen',
        {from: owner, log: true},
        'setupWave',
        waveMaxTokens,
        waveMaxTokensToBuy,
        waveSingleTokenPrice
      )
    );
  }
};

export default func;
func.skip = skipUnlessTestnet;
func.tags = ['HellsKitchen', 'HellsKitchen_setup', 'HellsKitchen_setup_wave'];
func.dependencies = ['HellsKitchen_deploy'];
