import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import ERC20Mock from '@openzeppelin/contracts-0.8/build/contracts/ERC20PresetMinterPauser.json';
import {withSnapshot} from '../../utils';
import {BigNumber, BigNumberish} from 'ethers';
import {
  Claim,
  compareClaim,
  getClaimEntires,
  signedMultiGiveawaySignature,
  TokenType,
} from './signature';
import {expect} from '../../chai-setup';

export const setupSignedGiveway = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('SandMock', {
    from: deployer,
    contract: ERC20Mock,
    args: ['AToken', 'SAND'],
    proxy: false,
  });
  const sandToken = await ethers.getContract('SandMock', deployer);
  await deployments.deploy('SignedGiveaway', {
    from: deployer,
    contract: 'SignedERC20Giveaway',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [trustedForwarder, adminRole],
      },
    },
  });
  const contract = await ethers.getContract('SignedGiveaway', other);
  const contractAsAdmin = await ethers.getContract('SignedGiveaway', adminRole);
  // Grant roles.
  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, signer);
  return {
    mint: async (amount: BigNumberish) => {
      await sandToken.mint(contract.address, amount);
    },
    contract,
    contractAsAdmin,
    sandToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  };
});

export const setupSignedMultiGiveway = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    backofficeAdmin,
    seller,
    signer,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('SandMock', {
    from: deployer,
    contract: 'FakeMintableERC20',
    proxy: false,
  });
  const sandToken = await ethers.getContract('SandMock', deployer);
  await deployments.deploy('LandMock', {
    from: deployer,
    contract: 'FakeMintableERC721',
    proxy: false,
  });
  const landToken = await ethers.getContract('LandMock', deployer);

  await deployments.deploy('AssetMock', {
    from: deployer,
    contract: 'FakeMintableERC1155',
    proxy: false,
  });
  const assetToken = await ethers.getContract('AssetMock', deployer);

  await deployments.deploy('SignedGiveaway', {
    from: deployer,
    contract: 'SignedMultiGiveaway',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [trustedForwarder, adminRole],
      },
    },
  });
  const contract = await ethers.getContract('SignedGiveaway', other);
  const contractAsAdmin = await ethers.getContract('SignedGiveaway', adminRole);
  // Grant roles.
  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, signer);
  const backofficeRole = await contractAsAdmin.BACKOFFICE_ROLE();
  await contractAsAdmin.grantRole(backofficeRole, backofficeAdmin);
  return {
    mint: async (amount: BigNumberish) => {
      await sandToken.mint(contract.address, amount);
    },
    signAndClaim: async (
      claimIds: BigNumberish[],
      claims: Claim[],
      signerUser = signer
    ) => {
      const pre = [];
      const preDest = [];
      for (const c of claims) {
        pre.push(BigNumber.from(await c.token.balanceOf(contract.address)));
        preDest.push(BigNumber.from(await c.token.balanceOf(dest)));
      }

      const {v, r, s} = await signedMultiGiveawaySignature(
        contract,
        signerUser,
        claimIds,
        0,
        contract.address,
        dest,
        getClaimEntires(claims)
      );
      await expect(
        contract.claim(
          [{v, r, s}],
          claimIds,
          0,
          contract.address,
          dest,
          getClaimEntires(claims)
        )
      )
        .to.emit(contract, 'Claimed')
        .withArgs(
          claimIds,
          contract.address,
          dest,
          compareClaim(claims),
          other
        );
      for (const [idx, c] of claims.entries()) {
        switch (c.tokenType) {
          case TokenType.ERC20:
            expect(await c.token.balanceOf(contract.address)).to.be.equal(
              pre[idx].sub(c.amount)
            );
            expect(await c.token.balanceOf(dest)).to.be.equal(
              preDest[idx].add(c.amount)
            );
        }
      }
    },
    contract,
    contractAsAdmin,
    sandToken,
    landToken,
    assetToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    backofficeAdmin,
    seller,
    signer,
    other,
    dest,
  };
});
