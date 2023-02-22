import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('BlaBlau', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('BlaBlau', 'owner');
    await catchUnknownSigner(
      execute(
        'BlaBlau',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = ['BlaBlau', 'BlaBlau_setup', 'BlaBlau_setup_signer'];
func.dependencies = ['BlaBlau_deploy'];
