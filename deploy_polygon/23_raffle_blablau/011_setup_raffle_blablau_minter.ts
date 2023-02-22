import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('BlaBlau', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('BlaBlau', 'owner');
    await catchUnknownSigner(
      execute(
        'BlaBlau',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['BlaBlau', 'BlaBlau_setup', 'BlaBlau_setup_minter'];
func.dependencies = ['PolygonSand_deploy', 'BlaBlau_deploy'];
