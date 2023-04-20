import {ethers} from 'hardhat';
import {expect} from '../../chai-setup';
import {
  defaultAbiCoder,
  keccak256,
  solidityPack,
  toUtf8Bytes,
} from 'ethers/lib/utils';
import {setupSignedMultiGiveway} from './fixtures';
import {BigNumber} from 'ethers';
import {toWei} from '../../utils';
import {
  Claim,
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
      expect(
        await fixtures.contract.hasRole(defaultAdminRole, fixtures.adminRole)
      ).to.be.true;
    });

    it('backoffice admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const backofficeRole = await fixtures.contract.BACKOFFICE_ROLE();
      expect(
        await fixtures.contract.hasRole(backofficeRole, fixtures.adminRole)
      ).to.be.true;
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
    it('should be able to claim sand', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.signAndClaim([claimId], claims);
    });
    it('should fail to claim the same id twice', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.signAndClaim([claimId], claims);
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Already claimed'
      );
    });
    it('should fail to claim if the signature is wrong', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];

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
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
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
      await fixtures.mint(amount.mul(10));
      const pre = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      );
      const preDest = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.dest)
      );
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
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

      expect(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      ).to.be.equal(pre.sub(amount));
      expect(await fixtures.sandToken.balanceOf(fixtures.dest)).to.be.equal(
        preDest.add(amount)
      );
    });
  });
  describe('revoke', function () {
    it('should fail to revoke if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.contract.revokeClaims([claimId])
      ).to.be.revertedWith('Only backoffice');
    });
    it('should fail to claim if the id was revoked', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );
      await contractAsAdmin.revokeClaims([claimId]);

      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];

      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Already claimed'
      );
    });
  });
  describe('pause', function () {
    it('should fail to pause if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      await expect(fixtures.contract.pause()).to.be.revertedWith(
        'Only backoffice'
      );
    });
    it('should fail to unpause if not admin', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );
      await contractAsAdmin.pause();
      await expect(fixtures.contract.unpause()).to.be.revertedWith(
        'Only admin'
      );
    });
    it('should fail to claim if paused', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );
      await contractAsAdmin.pause();

      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Pausable: paused'
      );
    });
    it('should be able to claim sand after pause/unpause', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );

      await contractAsAdmin.pause();

      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Pausable: paused'
      );

      await contractAsAdmin.unpause();

      await fixtures.signAndClaim([claimId], claims);
    });
  });

  describe('coverage', function () {
    it('a valid signature must verify correctly', async function () {
      const fixtures = await setupSignedMultiGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
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
  });

  describe('rate limit', function () {
    it('should be able to claim sand but fail if it goes too fast', async function () {
      const fixtures = await setupSignedMultiGiveway();
      // 100 weis / minute
      const oneMinute = 60;
      const maxWeiPerTimeBase = 100;
      const maxPerClaim = 0;
      await fixtures.contractAsAdmin.setLimitPerToken(
        fixtures.sandToken.address,
        oneMinute,
        maxWeiPerTimeBase,
        maxPerClaim
      );
      await fixtures.mint(1000000);

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
});
