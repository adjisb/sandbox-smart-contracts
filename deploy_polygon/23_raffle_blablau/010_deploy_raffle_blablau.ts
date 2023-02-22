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
    metadataUrl = 'https://contracts.sandbox.game/BlaBlau-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/BlaBlau-unrevealed/';
  }

  await deploy('BlaBlau', {
    from: deployer,
    contract: 'BlaBlau',
    proxy: {
      owner: '0x7A9fe22691c811ea339D9B73150e6911a5343DcA',
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'BlaBlau',
          'BLAU',
          treasury,
          deployer,
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
func.tags = ['BlaBlau', 'BlaBlau_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
