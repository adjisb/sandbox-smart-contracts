import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    upgradeAdmin,
    treasury,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl = 'https://contracts.sandbox.game/paris-hilton-unrevealed/';
  } else {
    metadataUrl =
      'https://contracts-demo.sandbox.game/paris-hilton-unrevealed/';
  }

  await deploy('ParisHilton', {
    from: deployer,
    contract: 'ParisHilton',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'ParisHilton',
          'PH',
          treasury,
          raffleSignWallet,
          TRUSTED_FORWARDER.address,
          defaultOperatorFiltererRegistry,
          defaultOperatorFiltererSubscription,
          true, // we want to subscribe to OpenSea's list
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ParisHilton', 'ParisHilton_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
