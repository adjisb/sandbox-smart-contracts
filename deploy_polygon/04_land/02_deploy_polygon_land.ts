import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('PolygonLand', {
    from: deployer,
    contract: 'PolygonLand',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonLand', 'PolygonLand_deploy', 'L2'];
