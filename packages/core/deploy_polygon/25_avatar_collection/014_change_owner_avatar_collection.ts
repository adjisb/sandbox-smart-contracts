import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {nftCollectionAdmin} = await getNamedAccounts();

  const owner = await read('AvatarCollection', 'owner');

  if (nftCollectionAdmin?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'AvatarCollection',
        {from: owner, log: true},
        'transferOwnership',
        nftCollectionAdmin
      )
    );
  }
};

export default func;
func.tags = ['AvatarCollection', 'AvatarCollection_change_admin'];
func.dependencies = ['AvatarCollection_deploy'];
