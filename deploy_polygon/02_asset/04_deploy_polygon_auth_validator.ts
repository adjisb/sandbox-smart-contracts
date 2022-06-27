import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, sandAdmin, backendAuthWallet} = await getNamedAccounts();

  await deploy('PolygonAuthValidator', {
    from: deployer,
    contract: 'AuthValidator',
    args: [sandAdmin, backendAuthWallet],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonAuthValidator', 'PolygonAuthValidator_deploy', 'L2'];
func.skip = skipUnlessTest;
