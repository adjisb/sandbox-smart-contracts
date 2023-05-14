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
    metadataUrl =
      'https://contracts.sandbox.game/unrevealed/';
  } else {
    metadataUrl =
      'https://contracts-demo.sandbox.game/unrevealed/';
  }

  /*

        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _allowedToExecuteMint,
        uint256 _maxSupply,
        OpenseaRegistryFilterParameters memory _filterParams,
        MintingDefaults memory _mintingDefaults
  */

  await deploy('AvatarCollection', {
    from: deployer,
    contract: 'AvatarCollection',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'AvatarCollection',
          'AVTC',
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
func.tags = ['AvatarCollection', 'AvatarCollection_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
