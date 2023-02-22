import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read('BlaBlau', 'waveMaxTokens');
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('BlaBlau', 'owner');
    const waveMaxTokens = 100;
    const waveMaxTokensToBuy = 100;
    const waveSingleTokenPrice = (0 * 10 ** 18).toString();
    await catchUnknownSigner(
      execute(
        'BlaBlau',
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
func.tags = ['BlaBlau', 'BlaBlau_setup', 'BlaBlau_setup_wave'];
func.dependencies = ['BlaBlau_deploy'];
