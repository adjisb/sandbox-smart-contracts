import {expect} from '../../chai-setup';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {withSnapshot} from '../../utils';

const setupLandTunnelV2 = withSnapshot(
  ['Land', 'FXROOT', 'FXCHILD', 'CHECKPOINTMANAGER', 'TRUSTED_FORWARDER'],
  async function () {
    const {deployer, upgradeAdmin} = await getNamedAccounts();
    const Land = await deployments.get('Land');
    const FXROOT = await deployments.get('FXROOT');
    const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
    await deployments.deploy('LandTunnelV2', {
      from: deployer,
      contract: 'LandTunnelV2',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            CHECKPOINTMANAGER.address,
            FXROOT.address,
            Land.address,
            TRUSTED_FORWARDER.address,
          ],
        },
        upgradeIndex: 0,
      },
    });
    const contract = await ethers.getContract('LandTunnelV2');
    return {
      deployer,
      contract,
    };
  }
);

const validPayloadFor105 =
  '0xf939f08431c31af0b90140c6d1992c31fbc508b4e950e42a779e6f978e0b6639e8512ae8abb2df8fc4ab81cea0f69dba0ae803b9954be07fa837c39bac06c08ecc328c268e9d0071214561a34b8f5fe961c0755cd604da013051145b14742892df1d3d8fedbefc7b444f18bb004dd908741341aaaabfacec9c7461a5a64a2a25e98b48835a3e65301c7206ee739a9291c9e5c7ee5790f976039d691edb6b2e88d42b7be10296034fc2216f6caad844c44e9f67ab164c57e6a20891e54cabed8b94d13ca1d84b2b44784af2effba1b94677a92b3e4aaa42050c32f30acf16f53c2ff422e07c27ee0c5d7dca1c7995fcbe65a179a44946b1c63f3ff23376b5cc2b54d43ffdcc78fe846a04e7fcf555a7488b9e044904cc62875830c338ea0986c37fd927b6d2a472695ca9d4c7c72e8218211ae433f979b057a7cd53edbea38a48d094e640a169fe93ac417c8401e619db8463e40397a0bdc04bd67c4e74dc3f9559171d800b8cfa8e82e49b5f8951e9deeb1ed16b372aa02fc62a8f735772cb2d8f89866765311c3d494b286ff4bb0092834515e1b9a5b9b91b8102f91b7d0183078698b9010000102000040000000000040000008002002118840000002001000000400a00810026001000000231004008000000000200008084000000000010000001000000600000040008000080002008020010aa00081200400000020001200140042040004000004104000200010100000000004800040010400000800000100000000000000020400080412600001000000000004000828004900000000000000000002010000000000400000000000c2000000000000000080000090000280400005014000002418000000401200000000000000000000000800000100040001010000200002000001000000000202204000b00000001400000080040200000108100f91a72f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8ee80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8ef80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f080f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f180f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f280f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f380f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8b80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8a80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8980f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8880f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8780f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8680f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc1e80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc1f80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2080f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2180f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2280f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2380f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdbb80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdba80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb980f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb880f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb780f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb680f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf4e80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf4f80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5080f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5180f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5280f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5380f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0eb80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0ea80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e980f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e880f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e780f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e680f8fb94f3390c7351695dbf9b5c09cc5ff1d3564761a519f842a091ee42a3ae048785d7370790775b6bf02c58c5d7bfb5de80f6d7cb27e46a207ea0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545db8a00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000007e00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000f901fa94f3390c7351695dbf9b5c09cc5ff1d3564761a519e1a08c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036b901c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000180000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545d00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000007e0000000000000000000000000000000000000000000000000000000000000000f9013d940000000000000000000000000000000000001010f884a04dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63a00000000000000000000000000000000000000000000000000000000000001010a0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000be188d6641e8b680743a4815dfa0f6208038960fb8a00000000000000000000000000000000000000000000000000003485f213cddb50000000000000000000000000000000000000000000000000372906daeac0fcd000000000000000000000000000000000000000000002a620b355c00535a4598000000000000000000000000000000000000000000000000036f480e8d6f3218000000000000000000000000000000000000000000002a620b38a45f7497234db91cd1f91ccef851a0c8a879906d13b9ce2ee05faa54054062df06b665ea5b2f134e45faf42499e9da80808080808080a0bbb2678c604a6ffa6aa7e8e7fa6d28e50177712abc671ed042807dfd992a8d9e8080808080808080f8f180a0ecd19e5ab9f54ed3524cb4d8a88aa43bd2c2262d35d4b1bb20349c1cd755419fa0535c182a6668d326bd27e321ba4f3fcd804dbc420bb36d8e0baee5b9219439c6a0fb5455f42d1295013b771b8c16ea161d958662ba19701094d13fcf5502c571e8a02a3470e9cd657eaa970f0091bc81d796203284b800d542797a0bf0092900d157a096c7261178d252dabc525a888b73fc8be4850a0b4cc4e3d4f593013c60db3992a0b56eeee8c229f99acd28eb970b1ba22bc04bc5baff9dca810c169f3a57d84551a043d3fb341626914289c6d9b020da154be69ea61c7e8f22c7756e6e03434e8fd8808080808080808080f91b8520b91b8102f91b7d0183078698b9010000102000040000000000040000008002002118840000002001000000400a00810026001000000231004008000000000200008084000000000010000001000000600000040008000080002008020010aa00081200400000020001200140042040004000004104000200010100000000004800040010400000800000100000000000000020400080412600001000000000004000828004900000000000000000002010000000000400000000000c2000000000000000080000090000280400005014000002418000000401200000000000000000000000800000100040001010000200002000001000000000202204000b00000001400000080040200000108100f91a72f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8ee80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8ef80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f080f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f180f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f280f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000c8f380f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8b80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8a80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8980f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8880f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8780f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000ca8680f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc1e80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc1f80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2080f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2180f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2280f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cc2380f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdbb80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdba80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb980f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb880f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb780f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cdb680f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf4e80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf4f80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5080f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5180f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5280f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000cf5380f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0eb80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0ea80f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e980f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e880f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e780f89c94525129b95ba89b9800e47ef3dc7d23fbad27b1a3f884a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000f3390c7351695dbf9b5c09cc5ff1d3564761a519a0000000000000000000000000000000000000000000000000000000000000d0e680f8fb94f3390c7351695dbf9b5c09cc5ff1d3564761a519f842a091ee42a3ae048785d7370790775b6bf02c58c5d7bfb5de80f6d7cb27e46a207ea0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545db8a00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000007e00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000f901fa94f3390c7351695dbf9b5c09cc5ff1d3564761a519e1a08c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036b901c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000180000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545d00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000007e0000000000000000000000000000000000000000000000000000000000000000f9013d940000000000000000000000000000000000001010f884a04dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63a00000000000000000000000000000000000000000000000000000000000001010a0000000000000000000000000baa8c835308f66d608a7dcb948180abc2689545da0000000000000000000000000be188d6641e8b680743a4815dfa0f6208038960fb8a00000000000000000000000000000000000000000000000000003485f213cddb50000000000000000000000000000000000000000000000000372906daeac0fcd000000000000000000000000000000000000000000002a620b355c00535a4598000000000000000000000000000000000000000000000000036f480e8d6f3218000000000000000000000000000000000000000000002a620b38a45f7497234d82000425';
describe('LandTunnel V2', function () {
  it('validPayloadFor105 fails with fxTunnel 1.0.3 and must pass on 1.0.5', async function () {
    const {contract} = await setupLandTunnelV2();
    const goerliChildTunnel = '0xf3390C7351695DBF9B5c09CC5FF1d3564761A519';
    await contract.setFxChildTunnel(goerliChildTunnel);
    // If used with v1.0.3 of fx portal we get a revert with arithmetic error.
    await expect(
      contract.receiveMessage(validPayloadFor105)
    ).to.be.revertedWith('Leaf index is too big');
  });
});