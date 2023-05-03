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
  ERC1155BatchClaim,
  ERC1155Claim,
  ERC20Claim,
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
    admin,
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
  const sandTokenAsOther = await ethers.getContract('SandMock', other);
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
        args: [trustedForwarder, admin],
      },
    },
  });
  const contract = await ethers.getContract('SignedGiveaway', other);
  const contractAsAdmin = await ethers.getContract('SignedGiveaway', admin);
  const contractAsBackofficeAdmin = await ethers.getContract(
    'SignedGiveaway',
    backofficeAdmin
  );
  // Grant roles.
  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, signer);
  const backofficeRole = await contractAsAdmin.BACKOFFICE_ROLE();
  await contractAsAdmin.grantRole(backofficeRole, backofficeAdmin);

  interface ERC721Balance {
    tokenType: TokenType.ERC721 | TokenType.ERC721_SAFE;
    owner: string;
  }

  interface ERC721BatchBalance {
    tokenType: TokenType.ERC721_BATCH | TokenType.ERC721_SAFE_BATCH;
    owners: string[];
  }

  type Balance =
    | ERC20Claim
    | ERC1155Claim
    | ERC1155BatchClaim
    | ERC721Balance
    | ERC721BatchBalance;

  async function checkBalances(
    source: string,
    pre: Balance[],
    preDest: Balance[],
    claims: Claim[]
  ) {
    const pos = await balances(source, claims);
    const postDest = await balances(dest, claims);
    for (const [idx, c] of claims.entries()) {
      switch (c.tokenType) {
        case TokenType.ERC20:
        case TokenType.ERC1155:
          {
            const r = pre[idx] as ERC20Claim;
            const rDest = preDest[idx] as ERC20Claim;
            const s = pos[idx] as ERC20Claim;
            const sDest = postDest[idx] as ERC20Claim;
            expect(s.amount).to.be.equal(
              BigNumber.from(r.amount).sub(c.amount)
            );
            expect(sDest.amount).to.be.equal(
              BigNumber.from(rDest.amount).add(c.amount)
            );
          }
          break;
        case TokenType.ERC721:
          {
            const r = pre[idx] as ERC721Balance;
            const s = pos[idx] as ERC721Balance;
            expect(r.owner).to.be.equal(contract.address);
            expect(s.owner).to.be.equal(dest);
          }
          break;
      }
    }
  }

  async function balances(
    address: string,
    claims: Claim[]
  ): Promise<Balance[]> {
    const ret: Balance[] = [];
    for (const c of claims) {
      switch (c.tokenType) {
        case TokenType.ERC20:
          ret.push({...c, amount: await c.token.balanceOf(address)});
          break;
        case TokenType.ERC721:
        case TokenType.ERC721_SAFE:
          ret.push({...c, owner: await c.token.ownerOf(c.tokenId)});
          break;
        case TokenType.ERC721_BATCH:
        case TokenType.ERC721_SAFE_BATCH:
          {
            const owners = [];
            for (const tokenId of c.tokenIds) {
              owners.push(await c.token.ownerOf(tokenId));
            }
            ret.push({...c, owners});
          }
          break;
        case TokenType.ERC1155:
          ret.push({...c, amount: await c.token.balanceOf(address, c.tokenId)});
          break;
        case TokenType.ERC1155_BATCH:
          {
            const amounts = [];
            for (const tokenId of c.tokenIds) {
              amounts.push(await c.token.balanceOf(address, tokenId));
            }
            ret.push({...c, amounts});
          }
          break;
        default:
          throw new Error('balances: invalid token type ' + c.tokenType);
      }
    }
    return ret;
  }

  async function mintToContract(address: string, claims: Claim[]) {
    for (const c of claims) {
      switch (c.tokenType) {
        case TokenType.ERC20:
          await c.token.mint(address, c.amount);
          break;
        case TokenType.ERC721:
        case TokenType.ERC721_SAFE:
          await c.token.safeMint(address, c.tokenId);
          break;
        case TokenType.ERC721_BATCH:
        case TokenType.ERC721_SAFE_BATCH:
          {
            for (const tokenId of c.tokenIds) {
              await c.token.safeMint(address, tokenId);
            }
          }
          break;
        case TokenType.ERC1155:
          await c.token.mint(address, c.tokenId, c.amount, c.data);
          break;
        case TokenType.ERC1155_BATCH:
          {
            for (const [idx, tokenId] of c.tokenIds.entries()) {
              await c.token.mint(address, tokenId, c.amounts[idx], c.data);
            }
          }
          break;
        default:
          throw new Error('mintToContract: invalid token type ' + c.tokenType);
      }
    }
  }

  return {
    mintToContract,
    balances,
    checkBalances,
    signAndClaim: async (
      claimIds: BigNumberish[],
      claims: Claim[],
      signerUser = signer,
      expiration = 0
    ) => {
      await mintToContract(contract.address, claims);
      const pre = await balances(contract.address, claims);
      const preDest = await balances(dest, claims);
      const {v, r, s} = await signedMultiGiveawaySignature(
        contract,
        signerUser,
        claimIds,
        expiration,
        contract.address,
        dest,
        getClaimEntires(claims)
      );
      await expect(
        contract.claim(
          [{v, r, s}],
          claimIds,
          expiration,
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
      await checkBalances(contract.address, pre, preDest, claims);
    },
    contract,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    sandToken,
    sandTokenAsOther,
    landToken,
    assetToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    admin,
    backofficeAdmin,
    seller,
    signer,
    other,
    dest,
  };
});
