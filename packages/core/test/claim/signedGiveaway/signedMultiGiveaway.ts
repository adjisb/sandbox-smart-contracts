import {ethers} from 'hardhat';
import {expect} from '../../chai-setup';
import {
  defaultAbiCoder,
  keccak256,
  solidityPack,
  toUtf8Bytes,
} from 'ethers/lib/utils';
import {setupSignedMultiGiveway} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {increaseTime, toWei} from '../../utils';
import {
  Claim,
  ClaimEntry,
  getClaimEntires,
  signedMultiGiveawaySignature,
  TokenType,
} from './signature';

describe('SignedMultiGiveaway.sol', function () {
  describe('initialization', function () {
    it('interfaces', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
        IERC721Receiver: '0x150b7a02',
        IERC1155Receiver: '0x4e2312e0',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.contract.supportsInterface(i)).to.be.true;
      }
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const defaultAdminRole = await fixtures.contract.DEFAULT_ADMIN_ROLE();
      expect(await fixtures.contract.hasRole(defaultAdminRole, fixtures.admin))
        .to.be.true;
    });

    it('backoffice admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const backofficeRole = await fixtures.contract.BACKOFFICE_ROLE();
      expect(await fixtures.contract.hasRole(backofficeRole, fixtures.admin)).to
        .be.true;
      expect(
        await fixtures.contract.hasRole(
          backofficeRole,
          fixtures.backofficeAdmin
        )
      ).to.be.true;
    });

    it('signer', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const signerRole = await fixtures.contract.SIGNER_ROLE();
      expect(await fixtures.contract.hasRole(signerRole, fixtures.signer)).to.be
        .true;
    });
  });

  describe('claim', function () {
    it('should be able to claim', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.signAndClaim([claimId], claims);
      expect(await fixtures.contract.claimed(claimId)).to.be.true;
    });

    it('should be able to claim multiple tokens', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123,
        },
        {
          tokenType: TokenType.ERC721_SAFE,
          token: fixtures.landToken,
          tokenId: 124,
        },
        {
          tokenType: TokenType.ERC721_BATCH,
          token: fixtures.landToken,
          tokenIds: [125, 126],
        },
        {
          tokenType: TokenType.ERC721_SAFE_BATCH,
          token: fixtures.landToken,
          tokenIds: [127, 128],
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456,
          amount,
          data: [],
        },
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [457, 458],
          amounts: [12, 13],
          data: [],
        },
      ];
      await fixtures.contractAsAdmin.setMaxClaimEntries(claims.length);
      await fixtures.signAndClaim([claimId], claims);
    });
    it('should be able to claim with approve', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandToken.mint(fixtures.other, amount);
      await fixtures.sandTokenAsOther.approve(
        fixtures.contract.address,
        amount
      );
      const pre = await fixtures.balances(fixtures.other, claims);
      const preDest = await fixtures.balances(fixtures.dest, claims);
      const sig = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.other,
        fixtures.dest,
        getClaimEntires(claims)
      );
      await fixtures.contract.claim(
        [sig],
        [claimId],
        0,
        fixtures.other,
        fixtures.dest,
        getClaimEntires(claims)
      );
      await fixtures.checkBalances(fixtures.other, pre, preDest, claims);
    });

    describe('multiple signatures', function () {
      it('should be able to claim with N signatures', async function () {
        const fixtures = await setupSignedMultiGiveway();
        const claimId = BigNumber.from(0x123);
        const amount = toWei(5);
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintToContract(fixtures.contract.address, claims);
        const pre = await fixtures.balances(fixtures.contract.address, claims);
        const preDest = await fixtures.balances(fixtures.dest, claims);
        const sig1 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        );
        const signerRole = await fixtures.contractAsAdmin.SIGNER_ROLE();
        await fixtures.contractAsAdmin.grantRole(signerRole, fixtures.other);
        const sig2 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.other,
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        );
        await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2);
        await fixtures.contract.claim(
          [sig1, sig2],
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        );
        await fixtures.checkBalances(
          fixtures.contract.address,
          pre,
          preDest,
          claims
        );
      });
      it('signatures must be in order other < signer', async function () {
        const fixtures = await setupSignedMultiGiveway();
        const claimId = BigNumber.from(0x123);
        const amount = toWei(5);
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintToContract(fixtures.contract.address, claims);
        const sig1 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        );
        const signerRole = await fixtures.contractAsAdmin.SIGNER_ROLE();
        await fixtures.contractAsAdmin.grantRole(signerRole, fixtures.other);
        const sig2 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.other,
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        );
        await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2);

        // sigs must have the right order signer < other
        await expect(
          fixtures.contract.claim(
            [sig2, sig1],
            [claimId],
            0,
            fixtures.contract.address,
            fixtures.dest,
            getClaimEntires(claims)
          )
        ).to.revertedWith('invalid order');
      });
    });
    it('should fail to claim if amount is zero', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = 0;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'invalid amount'
      );
    });
    it('should be fail to claim ERC1155 in batch if wrong len', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.signAndClaim(
          [claimId],
          [
            {
              tokenType: TokenType.ERC1155_BATCH,
              token: fixtures.assetToken,
              tokenIds: [],
              amounts: [],
              data: [],
            },
          ]
        )
      ).to.revertedWith('invalid data len');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [12],
          amounts: [],
          data: [],
        },
      ];
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.contract.address,
        fixtures.dest,
        getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        )
      ).to.revertedWith('invalid data');
    });

    it('should fail to claim the same id twice', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.signAndClaim([1, 2, 3, claimId], claims);
      await expect(
        fixtures.signAndClaim([claimId, 4, 5, 6], claims)
      ).to.be.revertedWith('already claimed');
    });
    it('should fail to claim if the signature is wrong', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.mintToContract(fixtures.contract.address, claims);
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId.add(1)],
        0,
        fixtures.contract.address,
        fixtures.dest,
        getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        )
      ).to.be.revertedWith('invalid signer');
    });
    it('should fail to mint if the signer is invalid', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await expect(
        fixtures.signAndClaim([claimId], claims, fixtures.other)
      ).to.be.revertedWith('invalid signer');
    });

    it('claim with metaTX trusted forwarder', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintToContract(fixtures.contract.address, claims);
      const pre = await fixtures.balances(fixtures.contract.address, claims);
      const preDest = await fixtures.balances(fixtures.dest, claims);
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.contract.address,
        fixtures.dest,
        getClaimEntires(claims)
      );

      const contractAsTrustedForwarder = await ethers.getContract(
        'SignedGiveaway',
        fixtures.trustedForwarder
      );

      const txData = await contractAsTrustedForwarder.populateTransaction.claim(
        [{v, r, s}],
        [claimId],
        0,
        fixtures.contract.address,
        fixtures.dest,
        getClaimEntires(claims)
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await contractAsTrustedForwarder.signer.sendTransaction(txData);
      await fixtures.checkBalances(
        fixtures.contract.address,
        pre,
        preDest,
        claims
      );
    });

    it('should be able to batch claim', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const baseClaimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456,
          amount,
          data: [],
        },
      ];
      await fixtures.mintToContract(fixtures.contract.address, claims);
      const pre = await fixtures.balances(fixtures.contract.address, claims);
      const preDest = await fixtures.balances(fixtures.dest, claims);
      const args = [];
      for (const [i, c] of claims.entries()) {
        const claimId = baseClaimId.add(i);
        const {v, r, s} = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires([c])
        );
        args.push({
          sigs: [{v, r, s}],
          claimIds: [claimId],
          expiration: 0,
          from: fixtures.contract.address,
          to: fixtures.dest,
          claims: getClaimEntires([c]),
        });
      }
      await fixtures.contract.batchClaim(args);
      await fixtures.checkBalances(
        fixtures.contract.address,
        pre,
        preDest,
        claims
      );
    });
  });

  describe('recoverAssets', function () {
    it('admin should be able to recover assets', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintToContract(fixtures.contract.address, claims);
      const pre = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      );
      await fixtures.contractAsAdmin.recoverAssets(
        fixtures.other,
        getClaimEntires(claims)
      );
      const pos = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      );
      expect(pos).to.be.equal(pre.sub(amount));
    });
    it('should fail to recover assets if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.mintToContract(fixtures.contract.address, claims);
      await expect(
        fixtures.contract.recoverAssets(fixtures.other, getClaimEntires(claims))
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contractAsBackofficeAdmin.recoverAssets(
          fixtures.other,
          getClaimEntires(claims)
        )
      ).to.be.revertedWith('only admin');
    });
  });

  describe('revoke', function () {
    it('should fail to revoke if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.contract.revokeClaims([claimId])
      ).to.be.revertedWith('only backoffice');
    });
    it('should fail to claim if the id was revoked', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.contractAsBackofficeAdmin.revokeClaims([claimId]);
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'already claimed'
      );
    });
  });
  describe('pause', function () {
    it('should fail to pause if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(fixtures.contract.pause()).to.be.revertedWith(
        'only backoffice'
      );
    });
    it('should fail to unpause if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await fixtures.contractAsAdmin.pause();
      await expect(fixtures.contract.unpause()).to.be.revertedWith(
        'only admin'
      );
    });
    it('should fail to claim if paused by backoffice admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.contractAsBackofficeAdmin.pause();
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Pausable: paused'
      );
    });
    it('should be able to claim sand after pause/unpause', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.contractAsAdmin.pause();
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Pausable: paused'
      );

      await fixtures.contractAsAdmin.unpause();

      await fixtures.signAndClaim([claimId], claims);
    });
  });

  describe('fixed limits', function () {
    it('admin should be able to set limits', async function () {
      const fixtures = await setupSignedMultiGiveway();

      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded()
      ).to.be.equal(1);
      await expect(fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2))
        .to.emit(fixtures.contract, 'NumberOfSignaturesNeededSet')
        .withArgs(2, fixtures.admin);
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded()
      ).to.be.equal(2);

      expect(await fixtures.contractAsAdmin.getMaxClaimEntries()).to.be.equal(
        1
      );
      await expect(fixtures.contractAsAdmin.setMaxClaimEntries(2))
        .to.emit(fixtures.contract, 'MaxClaimEntriesSet')
        .withArgs(2, fixtures.admin);
      expect(await fixtures.contractAsAdmin.getMaxClaimEntries()).to.be.equal(
        2
      );

      expect(
        await fixtures.contractAsAdmin.getMaxWeiPerClaim(
          fixtures.sandToken.address,
          12
        )
      ).to.be.equal(0);
      await expect(
        fixtures.contractAsAdmin.setMaxWeiPerClaim(
          fixtures.sandToken.address,
          12,
          2
        )
      )
        .to.emit(fixtures.contract, 'MaxWeiPerClaimSet')
        .withArgs(fixtures.sandToken.address, 12, 2, fixtures.admin);
      expect(
        await fixtures.contractAsAdmin.getMaxWeiPerClaim(
          fixtures.sandToken.address,
          12
        )
      ).to.be.equal(2);
    });

    it('others should fail to set limits', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(
        fixtures.contractAsBackofficeAdmin.setMaxClaimEntries(1)
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contractAsBackofficeAdmin.setNumberOfSignaturesNeeded(1)
      ).to.be.revertedWith('only admin');
      await expect(fixtures.contract.setMaxClaimEntries(1)).to.be.revertedWith(
        'only admin'
      );
      await expect(
        fixtures.contract.setNumberOfSignaturesNeeded(1)
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contract.setMaxWeiPerClaim(fixtures.sandToken.address, 12, 2)
      ).to.be.revertedWith('only admin');
    });

    it('numberOfSignaturesNeeded should be grater than 0', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(
        fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(0)
      ).to.be.revertedWith('invalid numberOfSignaturesNeeded');
    });
    it('maxClaimEntries should be grater than 0', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(
        fixtures.contractAsAdmin.setMaxClaimEntries(0)
      ).to.be.revertedWith('invalid maxClaimEntries');
    });

    it('should fail to claim if over max entries', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456,
          amount,
          data: [],
        },
      ];
      await fixtures.contractAsAdmin.setMaxClaimEntries(2);
      expect(await fixtures.contractAsAdmin.getMaxClaimEntries()).to.be.equal(
        2
      );
      await expect(fixtures.signAndClaim([claimId], claims)).to.revertedWith(
        'too many claims'
      );
    });

    it('should fail to claim if not enough signatures', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2);
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded()
      ).to.be.equal(2);
      await expect(fixtures.signAndClaim([claimId], claims)).to.revertedWith(
        'not enough signatures'
      );
    });
    it('signatures should expire', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await expect(
        fixtures.signAndClaim([claimId], claims, fixtures.signer, 100)
      ).to.revertedWith('expired');
    });
    it('should fail to claim if over maxPerClaim per token', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const maxPerClaim = 10;
      await fixtures.contractAsAdmin.setMaxWeiPerClaim(
        fixtures.sandToken.address,
        0,
        maxPerClaim
      );
      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.signAndClaim(
          [claimId],
          [
            {
              tokenType: TokenType.ERC20,
              token: fixtures.sandToken,
              amount: maxPerClaim + 1,
            },
          ]
        )
      ).to.be.revertedWith('checkLimits, amount too high');
    });
    it('should success to claim if maxPerClaim is !=0 but amount is bellow maxPerClaim per token', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const maxPerClaim = 1000;
      await fixtures.contractAsAdmin.setMaxWeiPerClaim(
        fixtures.sandToken.address,
        0,
        maxPerClaim
      );
      const claimId = BigNumber.from(0x123);
      await fixtures.signAndClaim(
        [claimId],
        [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: maxPerClaim - 1,
          },
        ]
      );
    });

    it('should fail to claim if over maxPerClaim per token per token id (ERC1155)', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const tokenId = 0x1233;
      const maxPerClaim = 10;
      await fixtures.contractAsAdmin.setMaxWeiPerClaim(
        fixtures.assetToken.address,
        tokenId,
        maxPerClaim
      );
      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.signAndClaim(
          [claimId],
          [
            {
              tokenType: TokenType.ERC1155,
              token: fixtures.assetToken,
              tokenId,
              amount: maxPerClaim + 1,
              data: [],
            },
          ]
        )
      ).to.be.revertedWith('checkLimits, amount too high');
    });
  });

  describe('rate limit', function () {
    it('admin should be able to set rate limits', async function () {
      const timeBase = 60;
      const maxWeiPerTimeBase = 100;
      const fixtures = await setupSignedMultiGiveway();
      const [, tb, m] = await fixtures.contractAsAdmin.getRateLimit(
        fixtures.sandToken.address,
        0
      );
      expect(tb).to.be.equal(0);
      expect(m).to.be.equal(0);

      await expect(
        fixtures.contractAsAdmin.setRateLimit(
          fixtures.sandToken.address,
          0,
          timeBase,
          maxWeiPerTimeBase
        )
      )
        .to.emit(fixtures.contract, 'RateLimitSet')
        .withArgs(
          fixtures.sandToken.address,
          0,
          timeBase,
          maxWeiPerTimeBase,
          fixtures.admin
        );

      const [, tbPos, mPos] = await fixtures.contractAsAdmin.getRateLimit(
        fixtures.sandToken.address,
        0
      );
      expect(tbPos).to.be.equal(timeBase);
      expect(mPos).to.be.equal(maxWeiPerTimeBase);
    });

    it('others should fail to set rate limits', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(
        fixtures.contract.setRateLimit(fixtures.sandToken.address, 0, 0, 2)
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contractAsBackofficeAdmin.setRateLimit(
          fixtures.sandToken.address,
          0,
          0,
          2
        )
      ).to.be.revertedWith('only admin');
    });

    it('should be able to claim sand if it goes slow', async function () {
      const fixtures = await setupSignedMultiGiveway();
      // 100 weis / minute
      const oneMinute = 60;
      const maxWeiPerTimeBase = 100;
      await fixtures.contractAsAdmin.setRateLimit(
        fixtures.sandToken.address,
        0,
        oneMinute,
        maxWeiPerTimeBase
      );

      const claimId = BigNumber.from(0x123);
      await fixtures.signAndClaim(
        [claimId],
        [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: 99,
          },
        ]
      );

      await increaseTime(30);

      await fixtures.signAndClaim(
        [claimId.add(1)],
        [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: 10,
          },
        ]
      );
    });
    it('should be able to claim sand but fail if it goes too fast', async function () {
      const fixtures = await setupSignedMultiGiveway();
      // 100 weis / minute
      const oneMinute = 60;
      const maxWeiPerTimeBase = 100;
      await fixtures.contractAsAdmin.setRateLimit(
        fixtures.sandToken.address,
        0,
        oneMinute,
        maxWeiPerTimeBase
      );

      const claimId = BigNumber.from(0x123);
      await fixtures.signAndClaim(
        [claimId],
        [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: 99,
          },
        ]
      );
      await expect(
        fixtures.signAndClaim(
          [claimId.add(1)],
          [
            {
              tokenType: TokenType.ERC20,
              token: fixtures.sandToken,
              amount: 10,
            },
          ]
        )
      ).to.be.revertedWith('checkLimits, rate exceeded');
    });
  });

  describe('coverage', function () {
    it('a valid signature must verify correctly', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: toWei(5),
        },
      ];
      await fixtures.mintToContract(fixtures.contract.address, claims);
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.contract.address,
        fixtures.dest,
        getClaimEntires(claims)
      );

      expect(
        await fixtures.contract.verifySignature(
          {v, r, s},
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        )
      ).to.equal(fixtures.signer);
    });
    it('check the domain separator', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const typeHash = keccak256(
        toUtf8Bytes(
          'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
        )
      );
      const hashedName = ethers.utils.keccak256(
        toUtf8Bytes('Sandbox SignedMultiGiveaway')
      );
      const versionHash = ethers.utils.keccak256(toUtf8Bytes('1.0'));
      const network = await fixtures.contract.provider.getNetwork();
      const domainSeparator = ethers.utils.keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            typeHash,
            hashedName,
            versionHash,
            network.chainId,
            fixtures.contract.address,
          ]
        )
      );
      expect(await fixtures.contract.domainSeparator()).to.be.equal(
        domainSeparator
      );
    });
    it('should fail if batch len is wrong', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(fixtures.contract.batchClaim([])).to.revertedWith(
        'invalid len'
      );
    });
    it('should fail if token address is zero', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(
        fixtures.contractAsAdmin.setMaxWeiPerClaim(constants.AddressZero, 12, 2)
      ).to.be.revertedWith('invalid token address');
      await expect(
        fixtures.contractAsAdmin.setRateLimit(constants.AddressZero, 0, 60, 100)
      ).to.be.revertedWith('invalid token address');
    });
    it('should fail if invalid token type', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const claims: ClaimEntry[] = [
        {
          tokenType: 0,
          tokenAddress: fixtures.sandToken.address,
          data: '0x',
        },
      ];
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.contract.address,
        fixtures.dest,
        claims
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          claims
        )
      ).to.be.revertedWith('invalid token type');
    });
    it('should fail to claim with no balance', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      const sig = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.contract.address,
        fixtures.dest,
        getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [sig],
          [claimId],
          0,
          fixtures.contract.address,
          fixtures.dest,
          getClaimEntires(claims)
        )
      ).to.revertedWith('ERC20: transfer amount exceeds balance');
    });
    it('should fail to claim with approve when no balance', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandTokenAsOther.approve(
        fixtures.contract.address,
        amount
      );
      const sig = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        fixtures.other,
        fixtures.dest,
        getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [sig],
          [claimId],
          0,
          fixtures.other,
          fixtures.dest,
          getClaimEntires(claims)
        )
      ).to.revertedWith('ERC20: transfer amount exceeds balance');
    });
  });
});
