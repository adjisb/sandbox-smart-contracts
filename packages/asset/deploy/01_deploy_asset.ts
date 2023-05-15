import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { TRUSTED_FORWARDER_ADDRESS } from "../constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, uriSetter, upgradeAdmin } = await getNamedAccounts();

  await deploy("Asset", {
    from: deployer,
    contract: "Asset",
    proxy: {
      owner: upgradeAdmin,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          "https://test.com",
          TRUSTED_FORWARDER_ADDRESS,
          uriSetter,
          1, // chain index for polygon network
          [1, 2, 3, 4, 5, 6],
          [2, 4, 6, 8, 10, 12],
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = ["Asset"];
