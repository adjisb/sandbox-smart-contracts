import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';

export const setupEscrow = withSnapshot([], async function () {
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [other, owner, user] = await getUnnamedAccounts();

  await deployments.deploy('ERC721Mintable', {
    from: deployer,
    args: ['SOMETOKEN', 'SOMETOKEN'],
  });
  const mintableERC721 = await ethers.getContract('ERC721Mintable', deployer);
  const mintableERC721AsOwner = await ethers.getContract(
    'ERC721Mintable',
    owner
  );

  //await deployments.deploy('Escrow', {from: deployer});
  await deployments.deploy('Escrow', {
    from: deployer,
    contract: 'Escrow',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [],
      },
    },
  });
  const Escrow = await ethers.getContract('Escrow', deployer);

  await deployments.deploy('ERC20Mintable', {
    from: deployer,
    args: ['SOMETOKEN', 'SOMETOKEN'],
  });

  await deployments.deploy('Renting', {
    from: deployer,
    args: [Escrow.address, mintableERC721.address],
  });
  const escrowContract = await ethers.getContract('Escrow', deployer);
  const escrowContractAsOwner = await ethers.getContract('Escrow', owner);
  const escrowContractAsOther = await ethers.getContract('Escrow', other);

  const rentingContract = await ethers.getContract('Renting', deployer);
  const rentingContractAsOwner = await ethers.getContract('Renting', owner);
  const rentingContractAsOther = await ethers.getContract('Renting', other);

  const mintableERC20 = await ethers.getContract('ERC20Mintable', deployer);
  const mintableERC20AsUser = await ethers.getContract('ERC20Mintable', user);

  return {
    mintableERC721,
    mintableERC721AsOwner,
    escrowContract,
    escrowContractAsOwner,
    escrowContractAsOther,
    rentingContract,
    rentingContractAsOwner,
    rentingContractAsOther,
    mintableERC20,
    mintableERC20AsUser,
    other,
    owner,
    user,
  };
});
