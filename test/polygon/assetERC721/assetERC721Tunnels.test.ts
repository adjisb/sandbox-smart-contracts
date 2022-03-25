import {AbiCoder} from '@ethersproject/contracts/node_modules/@ethersproject/abi';
import {expect} from '../../chai-setup';
import {waitFor} from '../../utils';
import {setupAssetERC721} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';
import {BigNumber} from 'ethers';

describe('PolygonAssetERC721.sol', function () {
  describe('AssetERC721 <> PolygonAssetERC721: Transfer', function () {
    describe('L1 to L2', function () {
      it('only owner can pause tunnels', async function () {
        const {users} = await setupAssetERC721();
        const assetHolder = users[0];

        await expect(assetHolder.AssetERC721Tunnel.pause()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupAssetERC721();
        const assetHolder = users[0];

        await deployer.AssetERC721Tunnel.pause();
        await expect(
          assetHolder.AssetERC721Tunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('set Max Limit on L1', async function () {
        const {deployer} = await setupAssetERC721();

        expect(
          await deployer.PolygonAssetERC721Tunnel.maxGasLimitOnL1()
        ).to.be.equal(BigNumber.from('500'));
        await deployer.PolygonAssetERC721Tunnel.setMaxLimitOnL1(
          BigNumber.from('100000')
        );
        expect(
          await deployer.PolygonAssetERC721Tunnel.maxGasLimitOnL1()
        ).to.be.equal(BigNumber.from('100000'));
      });

      it('cannot set Max Limit on L1 if not owner', async function () {
        const {PolygonAssetERC721Tunnel} = await setupAssetERC721();
        await expect(
          PolygonAssetERC721Tunnel.setMaxLimitOnL1(BigNumber.from('100000'))
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('set Max Allowed Quads', async function () {
        const {deployer} = await setupAssetERC721();

        expect(
          await deployer.PolygonAssetERC721Tunnel.maxAllowedQuads()
        ).to.be.equal(BigNumber.from('144'));
        await deployer.PolygonAssetERC721Tunnel.setMaxAllowedQuads(
          BigNumber.from('500')
        );
        expect(
          await deployer.PolygonAssetERC721Tunnel.maxAllowedQuads()
        ).to.be.equal(BigNumber.from('500'));
      });

      it('cannot Max Allowed Quads if not owner', async function () {
        const {PolygonAssetERC721Tunnel} = await setupAssetERC721();
        await expect(
          PolygonAssetERC721Tunnel.setMaxAllowedQuads(100000)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should not be able to transfer AssetERC721 when paused', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721();
        const assetHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );
        await deployer.AssetERC721Tunnel.pause();

        await expect(
          assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
            assetHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.AssetERC721Tunnel.unpause();

        await waitFor(
          assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
            assetHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);
      });

      it('should be able to transfer 1x1 AssetERC721', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721();
        const assetHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );

        await waitFor(
          assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
            assetHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);
      });
      it('should be able to transfer 3x3 AssetERC721', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721();
        const assetHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );
        await assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);
      });
      it('should be able to transfer 6x6 AssetERC721', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721();
        const assetHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );
        await assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);
      });
      it('should be able to transfer 12x12 AssetERC721', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721();
        const assetHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );
        await assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);
      });
      it('should be able to transfer 24x24 AssetERC721', async function () {
        const {
          AssetERC721,
          assetMinter,
          users,
          AssetERC721Tunnel,
          PolygonAssetERC721,
        } = await setupAssetERC721();
        const assetHolder = users[0];
        const size = 24;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          AssetERC721Tunnel.address,
          true
        );
        await // expect
        assetHolder.AssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        // .to.be.revertedWith('Exceeds max allowed quads');
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(AssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);
      });

      it('should should be able to transfer multiple assets', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();
        const bytes = '0x00';
        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );

        const assetHolder = users[0];
        const mintingData = [
          [6, 3],
          [30, 24],
          [30, 24],
        ];

        const numberOfAssetERC721s = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await Promise.all(
          [...Array(numberOfAssetERC721s).keys()].map((idx) => {
            waitFor(
              assetMinter.AssetERC721.mintQuad(
                assetHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            );
          })
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          ...mintingData,
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(numberOfTokens);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfTokens);
      });

      describe('Through meta transaction', function () {
        it('should be able to transfer 1x1 AssetERC721', async function () {
          const {
            AssetERC721,
            assetMinter,
            users,
            AssetERC721Tunnel,
            PolygonAssetERC721,
            trustedForwarder,
          } = await setupAssetERC721();
          const assetHolder = users[0];
          const size = 1;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;
          // Mint LAND on L1
          await assetMinter.AssetERC721.mintQuad(
            assetHolder.address,
            size,
            x,
            y,
            bytes
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await assetHolder.AssetERC721.setApprovalForAll(
            AssetERC721Tunnel.address,
            true
          );
          const {
            to,
            data,
          } = await assetHolder.AssetERC721Tunnel.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](assetHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            assetHolder.address,
            '1000000'
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            0
          );
          expect(
            await AssetERC721.balanceOf(AssetERC721Tunnel.address)
          ).to.be.equal(plotCount);
          expect(
            await PolygonAssetERC721.balanceOf(assetHolder.address)
          ).to.be.equal(plotCount);
        });
        it('should be able to transfer 3x3 AssetERC721', async function () {
          const {
            AssetERC721,
            assetMinter,
            users,
            AssetERC721Tunnel,
            PolygonAssetERC721,
            trustedForwarder,
          } = await setupAssetERC721();
          const assetHolder = users[0];
          const size = 3;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await assetMinter.AssetERC721.mintQuad(
            assetHolder.address,
            size,
            x,
            y,
            bytes
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await assetHolder.AssetERC721.setApprovalForAll(
            AssetERC721Tunnel.address,
            true
          );
          const {
            to,
            data,
          } = await assetHolder.AssetERC721Tunnel.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](assetHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            assetHolder.address,
            '1000000'
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            0
          );
          expect(
            await AssetERC721.balanceOf(AssetERC721Tunnel.address)
          ).to.be.equal(plotCount);
          expect(
            await PolygonAssetERC721.balanceOf(assetHolder.address)
          ).to.be.equal(plotCount);
        });
        it('should be able to transfer 6x6 AssetERC721', async function () {
          const {
            AssetERC721,
            assetMinter,
            users,
            AssetERC721Tunnel,
            PolygonAssetERC721,
            trustedForwarder,
          } = await setupAssetERC721();
          const assetHolder = users[0];
          const size = 6;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await assetMinter.AssetERC721.mintQuad(
            assetHolder.address,
            size,
            x,
            y,
            bytes
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await assetHolder.AssetERC721.setApprovalForAll(
            AssetERC721Tunnel.address,
            true
          );
          const {
            to,
            data,
          } = await assetHolder.AssetERC721Tunnel.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](assetHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            assetHolder.address,
            '1000000'
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            0
          );
          expect(
            await AssetERC721.balanceOf(AssetERC721Tunnel.address)
          ).to.be.equal(plotCount);
          expect(
            await PolygonAssetERC721.balanceOf(assetHolder.address)
          ).to.be.equal(plotCount);
        });
        it('should be able to transfer 12x12 AssetERC721', async function () {
          const {
            AssetERC721,
            assetMinter,
            users,
            AssetERC721Tunnel,
            PolygonAssetERC721,
            trustedForwarder,
          } = await setupAssetERC721();
          const assetHolder = users[0];
          const size = 12;
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await assetMinter.AssetERC721.mintQuad(
            assetHolder.address,
            size,
            x,
            y,
            bytes
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            plotCount
          );
          // Transfer to L1 Tunnel
          await assetHolder.AssetERC721.setApprovalForAll(
            AssetERC721Tunnel.address,
            true
          );

          const {
            to,
            data,
          } = await assetHolder.AssetERC721Tunnel.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](assetHolder.address, [size], [x], [y], bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            assetHolder.address,
            '2000000'
          );

          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            0
          );
          expect(
            await AssetERC721.balanceOf(AssetERC721Tunnel.address)
          ).to.be.equal(plotCount);
          expect(
            await PolygonAssetERC721.balanceOf(assetHolder.address)
          ).to.be.equal(plotCount);
        });
        it('should should be able to transfer multiple assets meta', async function () {
          const {
            deployer,
            AssetERC721,
            assetMinter,
            users,
            MockAssetERC721Tunnel,
            PolygonAssetERC721,
            MockPolygonAssetERC721Tunnel,
            trustedForwarder,
          } = await setupAssetERC721();
          const bytes = '0x00';
          // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
          await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
            MockPolygonAssetERC721Tunnel.address
          );
          expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
            MockPolygonAssetERC721Tunnel.address
          );
          const assetHolder = users[0];
          const mintingData = [
            [6, 3],
            [0, 24],
            [0, 24],
          ];
          const numberOfAssetERC721s = mintingData[0].length;
          const numberOfTokens = mintingData[0]
            .map((elem) => elem * elem)
            .reduce((a, b) => a + b, 0);
          await Promise.all(
            [...Array(numberOfAssetERC721s).keys()].map((idx) => {
              waitFor(
                assetMinter.AssetERC721.mintQuad(
                  assetHolder.address,
                  ...mintingData.map((x) => x[idx]),
                  bytes
                )
              );
            })
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            numberOfTokens
          );
          // Transfer to L1 Tunnel
          const tx = await assetHolder.AssetERC721.setApprovalForAll(
            MockAssetERC721Tunnel.address,
            true
          );
          tx.wait();
          const {
            to,
            data,
          } = await assetHolder.MockAssetERC721Tunnel.populateTransaction[
            'batchTransferQuadToL2(address,uint256[],uint256[],uint256[],bytes)'
          ](assetHolder.address, ...mintingData, bytes);
          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            assetHolder.address,
            '1000000'
          );
          expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
            0
          );
          expect(
            await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
          ).to.be.equal(numberOfTokens);
          expect(
            await PolygonAssetERC721.balanceOf(assetHolder.address)
          ).to.be.equal(numberOfTokens);
        });
      });
    });
    describe('L2 to L1', function () {
      it('only owner can pause tunnels', async function () {
        const {users} = await setupAssetERC721();
        const assetHolder = users[0];

        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.pause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('only owner can unpause tunnels', async function () {
        const {deployer, users} = await setupAssetERC721();
        const assetHolder = users[0];

        await deployer.AssetERC721Tunnel.pause();
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should not be able to transfer AssetERC721 when paused', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        await deployer.MockPolygonAssetERC721Tunnel.pause();
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
            assetHolder.address,
            [size],
            [x],
            [y],
            bytes
          )
        ).to.be.revertedWith('Pausable: paused');

        await deployer.MockPolygonAssetERC721Tunnel.unpause();

        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 1x1 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 12x12 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should not be able to transfer 2, 12x12 AssetERC721 at once', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();

        const bytes = '0x00';

        const assetHolder = users[0];
        const size_1 = 12;
        const x_1 = 0;
        const y_1 = 0;

        const size_2 = 12;
        const x_2 = 12;
        const y_2 = 12;
        const plotCount = size_1 * size_1 + size_1 * size_2;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size_1,
          x_1,
          y_1,
          bytes
        );
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size_2,
          x_2,
          y_2,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size_1],
          [x_1],
          [y_1],
          bytes
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size_2],
          [x_2],
          [y_2],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
            assetHolder.address,
            [size_1, size_2],
            [x_1, x_2],
            [y_1, y_2],
            bytes
          )
        ).to.be.revertedWith('Exceeds max allowed quads.');
      });

      it('should be able to transfer 3x3 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 6x6 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should should be able to transfer multiple assets', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();
        const bytes = '0x00';
        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );

        const assetHolder = users[0];
        const mintingData = [
          [6, 3],
          [30, 24],
          [30, 24],
        ];

        const numberOfAssetERC721s = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await Promise.all(
          [...Array(numberOfAssetERC721s).keys()].map((idx) => {
            waitFor(
              assetMinter.AssetERC721.mintQuad(
                assetHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            );
          })
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          ...mintingData,
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(numberOfTokens);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfTokens);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        const tx = await assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
          assetHolder.address,
          ...mintingData,
          bytes
        );
        await tx.wait();

        console.log('DUMMY CHECKPOINT. moving on...');

        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, ...mintingData, bytes]
          )
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfTokens
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should not be able to transfer if exceeds limit', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
        } = await setupAssetERC721();
        const bytes = '0x00';

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );

        const assetHolder = users[0];
        const mintingData = [
          [1, 1],
          [0, 240],
          [0, 240],
        ];

        const numberOfAssetERC721s = mintingData[0].length;
        const numberOfTokens = mintingData[0]
          .map((elem) => elem * elem)
          .reduce((a, b) => a + b, 0);
        await Promise.all(
          [...Array(numberOfAssetERC721s).keys()].map((idx) => {
            waitFor(
              assetMinter.AssetERC721.mintQuad(
                assetHolder.address,
                ...mintingData.map((x) => x[idx]),
                bytes
              )
            );
          })
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          numberOfTokens
        );

        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          ...mintingData,
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(numberOfTokens);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(numberOfTokens);

        // Transfer to L2 Tunnel
        await deployer.MockPolygonAssetERC721Tunnel.setLimit(1, 400);

        // Check if limit is set
        expect(await MockPolygonAssetERC721Tunnel.maxGasLimitOnL1()).to.eq(500);
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );
        await expect(
          assetHolder.MockPolygonAssetERC721Tunnel.batchTransferQuadToL1(
            assetHolder.address,
            ...mintingData,
            bytes
          )
        ).to.be.revertedWith('Exceeds gas limit on L1.');
      });
    });
    describe('Through meta Tx', function () {
      it('should be able to transfer 1x1 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
          trustedForwarder,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );

        const {
          to,
          data,
        } = await assetHolder.MockPolygonAssetERC721Tunnel.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](assetHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          assetHolder.address,
          '1000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 3x3 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
          trustedForwarder,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );

        const {
          to,
          data,
        } = await assetHolder.MockPolygonAssetERC721Tunnel.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](assetHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          assetHolder.address,
          '1000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 6x6 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
          trustedForwarder,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );

        const {
          to,
          data,
        } = await assetHolder.MockPolygonAssetERC721Tunnel.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](assetHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          assetHolder.address,
          '1000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });

      it('should be able to transfer 12x12 AssetERC721', async function () {
        const {
          deployer,
          AssetERC721,
          assetMinter,
          users,
          MockAssetERC721Tunnel,
          PolygonAssetERC721,
          MockPolygonAssetERC721Tunnel,
          trustedForwarder,
        } = await setupAssetERC721();

        const assetHolder = users[0];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await assetMinter.AssetERC721.mintQuad(
          assetHolder.address,
          size,
          x,
          y,
          bytes
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );

        // Set Mock PolygonAssetERC721Tunnel in PolygonAssetERC721
        await deployer.PolygonAssetERC721.setPolygonAssetERC721Tunnel(
          MockPolygonAssetERC721Tunnel.address
        );
        expect(await PolygonAssetERC721.polygonAssetERC721Tunnel()).to.equal(
          MockPolygonAssetERC721Tunnel.address
        );
        // Transfer to L1 Tunnel
        await assetHolder.AssetERC721.setApprovalForAll(
          MockAssetERC721Tunnel.address,
          true
        );
        await assetHolder.MockAssetERC721Tunnel.batchTransferQuadToL2(
          assetHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(0);
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(plotCount);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(plotCount);

        // Transfer to L2 Tunnel
        await assetHolder.PolygonAssetERC721.setApprovalForAll(
          MockPolygonAssetERC721Tunnel.address,
          true
        );

        const {
          to,
          data,
        } = await assetHolder.MockPolygonAssetERC721Tunnel.populateTransaction[
          'batchTransferQuadToL1(address,uint256[],uint256[],uint256[],bytes)'
        ](assetHolder.address, [size], [x], [y], bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          assetHolder.address,
          '2000000'
        );

        console.log('DUMMY CHECKPOINT. moving on...');

        // Release on L1
        const abiCoder = new AbiCoder();

        await deployer.MockAssetERC721Tunnel.receiveMessage(
          abiCoder.encode(
            ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
            [assetHolder.address, [size], [x], [y], bytes]
          )
        );
        expect(await AssetERC721.balanceOf(assetHolder.address)).to.be.equal(
          plotCount
        );
        expect(
          await AssetERC721.balanceOf(MockAssetERC721Tunnel.address)
        ).to.be.equal(0);
        expect(
          await PolygonAssetERC721.balanceOf(assetHolder.address)
        ).to.be.equal(0);
      });
    });
  });
});
