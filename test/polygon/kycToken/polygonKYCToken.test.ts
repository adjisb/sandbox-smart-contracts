import {setupTestPolygonKYCToken} from './fixtures';
import {expect} from '../../chai-setup';
import {zeroAddress} from '../../land/fixtures';
import {ethers} from 'hardhat';
import {defaultAbiCoder, keccak256, toUtf8Bytes} from 'ethers/lib/utils';
import {backendAuthWallet} from '../../land-sale/fixtures';

describe('PolygonKYCToken', function () {
  describe('TestPolygonKYCToken', function () {
    describe('roles are correctly set up in deployment script', function () {
      it('default admin role was granted to sand admin at initialization', async function () {
        const {
          PolygonKYCToken,
          sandAdmin,
          defaultAdminRole,
        } = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.hasRole(defaultAdminRole, sandAdmin)).to.be
          .true;
      });
      it('kyc role was granted to kyc admin at initialization', async function () {
        const {
          PolygonKYCToken,
          kycRole,
          kycAdmin,
        } = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.hasRole(kycRole, kycAdmin)).to.be.true;
      });
    });
    describe('initialization', function () {
      it('trusted forwarder is set', async function () {
        const {
          PolygonKYCToken,
          trustedForwarder,
        } = await setupTestPolygonKYCToken();
        const trustedForwarderAddress = await PolygonKYCToken.getTrustedForwarder();
        expect(trustedForwarderAddress).to.be.equal(trustedForwarder.address);
      });
      it('name and symbol are set', async function () {
        const {PolygonKYCToken} = await setupTestPolygonKYCToken();
        const name = await PolygonKYCToken.name();
        expect(name).to.be.equal("Sandbox's KYC ERC721");
        const symbol = await PolygonKYCToken.symbol();
        expect(symbol).to.be.equal('KYC');
      });
      it('authValidator is set', async function () {
        const {
          PolygonKYCToken,
          authValidator,
        } = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.getAuthValidator()).to.be.equal(
          authValidator.address
        );
      });
      it('check the domain separator', async function () {
        const {PolygonKYCToken} = await setupTestPolygonKYCToken();
        const typeHash = keccak256(
          toUtf8Bytes(
            'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
          )
        );
        const hashedName = ethers.utils.keccak256(
          toUtf8Bytes('Sandbox KYC Token')
        );
        const versionHash = ethers.utils.keccak256(toUtf8Bytes('1.0'));
        const network = await PolygonKYCToken.provider.getNetwork();
        const domainSeparator = ethers.utils.keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
              typeHash,
              hashedName,
              versionHash,
              network.chainId,
              PolygonKYCToken.address,
            ]
          )
        );
        expect(await PolygonKYCToken.domainSeparator()).to.be.equal(
          domainSeparator
        );
      });
      it('check the chainId', async function () {
        const {PolygonKYCToken, hre} = await setupTestPolygonKYCToken();
        expect(await PolygonKYCToken.getChainId()).to.be.equal(
          hre.network.config.chainId || 31337 // Polygon || hardhat
        );
      });
    });
    describe('mint', function () {
      it('kyc role can mint', async function () {
        const {
          contractAsKycRole,
          other,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();
        await expect(contractAsKycRole['mint(address)'](other.address)).to.not
          .be.reverted;
        const balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
      });
      it('if not granted kyc role cannot mint', async function () {
        const {other} = await setupTestPolygonKYCToken();
        await expect(
          other.PolygonKYCToken['mint(address)'](other.address)
        ).to.be.revertedWith(
          `AccessControl: account ${other.address.toLowerCase()} is missing role 0xdb11624602202c396fa347735a55e345a3aeb3e60f8885e1a71f1bf8d5886db7`
        );
      });
      it('default admin role cannot mint', async function () {
        const {
          contractAsDefaultAdmin,
          other,
          sandAdmin,
        } = await setupTestPolygonKYCToken();
        await expect(
          contractAsDefaultAdmin['mint(address)'](other.address)
        ).to.be.revertedWith(
          `AccessControl: account ${sandAdmin.toLowerCase()} is missing role 0xdb11624602202c396fa347735a55e345a3aeb3e60f8885e1a71f1bf8d5886db7`
        );
      });
      it('cannot mint to the same address twice', async function () {
        const {contractAsKycRole, other} = await setupTestPolygonKYCToken();
        await expect(contractAsKycRole['mint(address)'](other.address)).to.not
          .be.reverted;
        await expect(
          contractAsKycRole['mint(address)'](other.address)
        ).to.be.revertedWith('KYCERC721_ISSUED');
      });
      it('can mint to the same address twice if the first token has been burned and balanceOf is zero', async function () {
        const {
          contractAsKycRole,
          other,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();
        await expect(contractAsKycRole['mint(address)'](other.address)).to.not
          .be.reverted;
        let balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
        await other.PolygonKYCToken.burn(1);
        balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(0);
        await expect(contractAsKycRole['mint(address)'](other.address)).to.not
          .be.reverted;
        balance = await PolygonKYCToken.balanceOf(other.address);
        expect(balance).to.be.eq(1);
      });
    });
    describe('burn', function () {
      it('a user can burn their own token', async function () {
        const {contractAsKycRole, other} = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await expect(other.PolygonKYCToken.burn(1)).to.not.be.reverted;
      });
      it('a user cannot burn a token belonging to another', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await contractAsKycRole['mint(address)'](otherB.address);
        await expect(other.PolygonKYCToken.burn(2)).to.be.revertedWith(
          'NOT_OWNER'
        );
      });
    });
    describe('burnFrom', function () {
      it('burner role can burn a token belonging to another', async function () {
        const {contractAsKycRole, other} = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await expect(contractAsKycRole.burnFrom(other.address, 1)).to.not.be
          .reverted;
      });
      it('if not burner role cannot burn a token belonging to another', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](otherB.address);
        await expect(
          other.PolygonKYCToken.burnFrom(otherB.address, 1)
        ).to.be.revertedWith(
          `AccessControl: account ${other.address.toLowerCase()} is missing role 0xdb11624602202c396fa347735a55e345a3aeb3e60f8885e1a71f1bf8d5886db7`
        );
      });
      it('default admin cannot burn a token belonging to another', async function () {
        const {
          contractAsDefaultAdmin,
          contractAsKycRole,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](otherB.address);
        await expect(contractAsDefaultAdmin.burnFrom(otherB.address, 1)).to.be
          .reverted;
      });
    });
    describe('transfer', function () {
      it('mint emits Transfer event', async function () {
        const {contractAsKycRole, other} = await setupTestPolygonKYCToken();
        const tx = await contractAsKycRole['mint(address)'](other.address);
        const receipt = await tx.wait();
        expect(receipt.events.length).to.be.equal(1);
        expect(receipt.events[0].event).to.be.equal('Transfer');
        expect(receipt.events[0].args[0]).to.be.equal(zeroAddress);
        expect(receipt.events[0].args[1]).to.be.equal(other.address);
        expect(receipt.events[0].args[2]).to.be.equal(1);
      });
      it('burn emits Transfer event', async function () {
        const {contractAsKycRole, other} = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        const tx = await other.PolygonKYCToken.burn(1);
        const receipt = await tx.wait();
        expect(receipt.events.length).to.be.equal(2);
        expect(receipt.events[0].event).to.be.equal('Approval');
        expect(receipt.events[1].event).to.be.equal('Transfer');
        expect(receipt.events[1].args[0]).to.be.equal(other.address);
        expect(receipt.events[1].args[1]).to.be.equal(zeroAddress);
        expect(receipt.events[1].args[2]).to.be.equal(1);
      });
      it('burnFrom emits Transfer event', async function () {
        const {contractAsKycRole, other} = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        const tx = await contractAsKycRole.burnFrom(other.address, 1);
        const receipt = await tx.wait();
        expect(receipt.events.length).to.be.equal(2);
        expect(receipt.events[0].event).to.be.equal('Approval');
        expect(receipt.events[1].event).to.be.equal('Transfer');
        expect(receipt.events[1].args[0]).to.be.equal(other.address);
        expect(receipt.events[1].args[1]).to.be.equal(zeroAddress);
        expect(receipt.events[1].args[2]).to.be.equal(1);
      });
      it('user cannot transfer their token with safeTransferFrom', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await expect(
          other.PolygonKYCToken['safeTransferFrom(address,address,uint256)'](
            other.address,
            otherB.address,
            1
          )
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('user cannot transfer their token with safeTransferFrom with data', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await expect(
          other.PolygonKYCToken[
            'safeTransferFrom(address,address,uint256,bytes)'
          ](other.address, otherB.address, 1, '0x')
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('user cannot transfer their token with transferFrom', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await expect(
          other.PolygonKYCToken.transferFrom(other.address, otherB.address, 1)
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('approved operator cannot transfer a token with transferFrom', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await other.PolygonKYCToken.setApprovalForAll(otherB.address, true);
        await expect(
          otherB.PolygonKYCToken.transferFrom(other.address, otherB.address, 1)
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('approved operator cannot transfer a token with safeTransferFrom', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await other.PolygonKYCToken.setApprovalForAll(otherB.address, true);
        await expect(
          otherB.PolygonKYCToken['safeTransferFrom(address,address,uint256)'](
            other.address,
            otherB.address,
            1
          )
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('approved operator cannot transfer a token with safeTransferFrom with data', async function () {
        const {
          contractAsKycRole,
          other,
          otherB,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](other.address);
        await other.PolygonKYCToken.setApprovalForAll(otherB.address, true);
        await expect(
          otherB.PolygonKYCToken[
            'safeTransferFrom(address,address,uint256,bytes)'
          ](other.address, otherB.address, 1, '0x')
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
      it('admin cannot transfer a token', async function () {
        const {
          contractAsKycRole,
          otherB,
          kycAdmin,
        } = await setupTestPolygonKYCToken();
        await contractAsKycRole['mint(address)'](kycAdmin);
        await expect(
          contractAsKycRole.transferFrom(kycAdmin, otherB.address, 1)
        ).to.be.revertedWith('NOT_TRANSFERABLE');
      });
    });
    describe('tokenURI', function () {
      it('can view tokenURI for a token that has been minted', async function () {
        const {
          contractAsKycRole,
          other,
          PolygonKYCToken,
          testURI,
        } = await setupTestPolygonKYCToken();
        const tokenID = 1;
        await contractAsKycRole['mint(address)'](other.address);
        const uri = await PolygonKYCToken.tokenURI(1);
        expect(uri).to.be.equal(`${testURI}${tokenID}`);
      });
      it('cannot view token uri if token id does not exist', async function () {
        const {PolygonKYCToken} = await setupTestPolygonKYCToken();
        await expect(PolygonKYCToken.tokenURI(1)).to.be.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
      });
    });
    describe('baseURI', function () {
      it('base token uri was set at initialization', async function () {
        const {PolygonKYCToken, testURI} = await setupTestPolygonKYCToken();
        const uri = await PolygonKYCToken.baseURI();
        expect(uri).to.be.equal(testURI);
      });
      it('default admin role can set a new base token uri', async function () {
        const {
          PolygonKYCToken,
          contractAsDefaultAdmin,
        } = await setupTestPolygonKYCToken();
        const newURI = 'newURI/';
        await expect(contractAsDefaultAdmin.setBaseURI(newURI)).to.not.be
          .reverted;
        const uri = await PolygonKYCToken.baseURI();
        expect(uri).to.be.equal(newURI);
      });
      it('if not granted default admin role cannot set base token uri', async function () {
        const {other} = await setupTestPolygonKYCToken();
        const newURI = 'newURI/';
        await expect(
          other.PolygonKYCToken.setBaseURI(newURI)
        ).to.be.revertedWith(
          `AccessControl: account ${other.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
        );
      });
    });
    describe('claimKYCToken', function () {
      it('user can claim a KYC token if they provide the correct parameters', async function () {
        const {
          other,
          backendAuthWallet,
          KYC_TYPEHASH,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();

        const signature = await ethers.provider.send('eth_signTypedData_v4', [
          other.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: other.address,
            },
          },
        ]);

        const hashedData = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, other.address]
          )
        );

        const backendSignature = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedData)
        );

        const tokenId = await other.PolygonKYCToken.callStatic.claimKYCToken({
          to: other.address,
          signature: signature,
          backendSignature: backendSignature,
        });

        expect(tokenId).to.eq(1);

        await expect(
          other.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: backendSignature,
          })
        ).to.not.be.reverted;

        const bal = await PolygonKYCToken.balanceOf(other.address);
        expect(bal).to.eq(1);
      });
      it('tokenId counter increments correctly', async function () {
        const {
          other,
          otherB,
          backendAuthWallet,
          KYC_TYPEHASH,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();

        const signatureA = await ethers.provider.send('eth_signTypedData_v4', [
          other.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: other.address,
            },
          },
        ]);
        const signatureB = await ethers.provider.send('eth_signTypedData_v4', [
          otherB.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: otherB.PolygonKYCToken.address,
            },
            message: {
              to: otherB.address,
            },
          },
        ]);

        const hashedDataA = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, other.address]
          )
        );

        const hashedDataB = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, otherB.address]
          )
        );

        const backendSignatureA = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedDataA)
        );

        const backendSignatureB = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedDataB)
        );

        await other.PolygonKYCToken.claimKYCToken({
          to: other.address,
          signature: signatureA,
          backendSignature: backendSignatureA,
        });

        await otherB.PolygonKYCToken.claimKYCToken({
          to: otherB.address,
          signature: signatureB,
          backendSignature: backendSignatureB,
        });

        const counter = await PolygonKYCToken.getTokenIdCounter();
        expect(counter).to.eq(2);
      });
      it('user cannot claim more than once', async function () {
        const {
          other,
          backendAuthWallet,
          KYC_TYPEHASH,
          PolygonKYCToken,
        } = await setupTestPolygonKYCToken();

        const signature = await ethers.provider.send('eth_signTypedData_v4', [
          other.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: other.address,
            },
          },
        ]);

        const hashedData = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, other.address]
          )
        );

        const backendSignature = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedData)
        );

        const tokenId = await other.PolygonKYCToken.callStatic.claimKYCToken({
          to: other.address,
          signature: signature,
          backendSignature: backendSignature,
        });

        expect(tokenId).to.eq(1);

        await expect(
          other.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: backendSignature,
          })
        ).to.not.be.reverted;

        const bal = await PolygonKYCToken.balanceOf(other.address);
        expect(bal).to.eq(1);
        await expect(
          other.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: backendSignature,
          })
        ).to.be.revertedWith('KYCERC721_ISSUED');
      });
      it('user cannot claim if signer is not `to`', async function () {
        const {
          other,
          otherB,
          backendAuthWallet,
          KYC_TYPEHASH,
        } = await setupTestPolygonKYCToken();

        const signature = await ethers.provider.send('eth_signTypedData_v4', [
          otherB.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: other.address,
            },
          },
        ]);

        const hashedData = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, other.address]
          )
        );

        const backendSignature = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedData)
        );

        await expect(
          otherB.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: backendSignature,
          })
        ).to.be.revertedWith('NOT_TO');
      });
      it('user cannot claim with invalid backend sig', async function () {
        const {other, otherB, KYC_TYPEHASH} = await setupTestPolygonKYCToken();

        const signature = await ethers.provider.send('eth_signTypedData_v4', [
          other.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: other.address,
            },
          },
        ]);

        const hashedData = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, other.address]
          )
        );

        const signer = await ethers.getSigner(otherB.address);

        const badBackendSignature = await signer.signMessage(
          ethers.utils.arrayify(hashedData)
        );

        await expect(
          otherB.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: badBackendSignature,
          })
        ).to.be.revertedWith('INVALID_AUTH');
      });
      it('user cannot claim with a bad typehash', async function () {
        const {other} = await setupTestPolygonKYCToken();

        const signature = await ethers.provider.send('eth_signTypedData_v4', [
          other.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: other.address,
            },
          },
        ]);

        const badTypehash = ethers.utils.solidityKeccak256(
          ['string'],
          ['BAD_HASH(address to)']
        );

        const hashedData = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [badTypehash, other.address]
          )
        );

        const backendSignature = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedData)
        );

        await expect(
          other.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: backendSignature,
          })
        ).to.be.revertedWith('INVALID_AUTH');
      });
      it('user cannot claim with a incorrect `to` in message params', async function () {
        const {other, otherB, KYC_TYPEHASH} = await setupTestPolygonKYCToken();

        const signature = await ethers.provider.send('eth_signTypedData_v4', [
          other.address,
          {
            types: {
              EIP712Domain: [
                {
                  name: 'name',
                  type: 'string',
                },
                {
                  name: 'version',
                  type: 'string',
                },
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
              ],
              KYC: [{name: 'to', type: 'address'}],
            },
            primaryType: 'KYC',
            domain: {
              name: 'Sandbox KYC Token',
              version: '1.0',
              chainId: 31337,
              verifyingContract: other.PolygonKYCToken.address,
            },
            message: {
              to: otherB.address,
            },
          },
        ]);

        const hashedData = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address'],
            [KYC_TYPEHASH, other.address]
          )
        );

        const backendSignature = await backendAuthWallet.signMessage(
          ethers.utils.arrayify(hashedData)
        );

        await expect(
          other.PolygonKYCToken.claimKYCToken({
            to: other.address,
            signature: signature,
            backendSignature: backendSignature,
          })
        ).to.be.revertedWith('NOT_SENDER');
      });
    });
  });
});
