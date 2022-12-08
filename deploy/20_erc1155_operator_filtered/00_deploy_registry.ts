import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('OperatorFilterRegistry', {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['OperatorFilterRegistry', 'OperatorFilterRegistry_deploy'];
func.skip = skipUnlessTestnet;