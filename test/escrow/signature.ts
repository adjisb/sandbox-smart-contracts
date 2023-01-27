import {BigNumber, Contract} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {signTypedData_v4} from 'eth-sig-util';

export const escrow712Signature = async function (
  contract: Contract,
  signer: string,
  feature: string,
  timeMax: number,
  tokenID: string,
  privateKey = ''
): Promise<Signature> {
  const chainId = BigNumber.from(await contract.getChainId());
  const data = {
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
      EscrowToken: [
        {name: 'feature', type: 'address'},
        {name: 'timeMax', type: 'uint256'},
        {name: 'tokenID', type: 'bytes32'},
      ],
    },
    primaryType: 'EscrowToken',
    domain: {
      name: 'Escrow Signature',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: contract.address,
    },
    message: {
      feature: feature,
      timeMax: timeMax.toString(),
      tokenID: tokenID,
    },
  } as never;

  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    console.log(signer);
    console.log(data);
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      signer,
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
};

export const escrow712Signature2 = async function (
  contract: Contract,
  signer: string,
  feature: string,
  timeMax: string,
  tokenID: string,
  privateKey = ''
): Promise<Signature> {
  const chainId = BigNumber.from(await contract.getChainId());
  console.log('chainId ' + chainId);
  const data = {
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
      EscrowToken: [
        {name: 'feature', type: 'address'},
        {name: 'timeMax', type: 'bytes32'},
        {name: 'tokenID', type: 'bytes32'},
      ],
    },
    primaryType: 'EscrowToken',
    domain: {
      name: 'Escrow Signature',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: contract.address,
    },
    message: {
      feature: feature,
      timeMax: timeMax,
      tokenID: tokenID,
    },
  } as never;

  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    console.log(signer);
    console.log(data);
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      signer,
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
};

export const escrow712Signature3 = async function (
  signer: string,
  privateKey: string /* = '' */
): Promise<Signature> {
  const data = {
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
      EscrowToken: [
        {name: 'feature', type: 'address'},
        {name: 'timeMax', type: 'bytes32'},
        {name: 'tokenID', type: 'bytes32'},
      ],
    },
    primaryType: 'EscrowToken',
    domain: {
      name: 'Escrow Signature',
      version: '1.0',
      chainId: 31337,
      verifyingContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
    message: {
      feature: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      timeMax:
        '0x031a5bc9f56af0c3e35c23c1e5ed90bf02b833dfcb79b0a4f11c5bd105a0a8e1',
      tokenID:
        '0xf51fdad44186cc80c68fa1947a3eec532a67b727219b53ce656cf5f8b7eab370',
    },
  } as never;

  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      signer,
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
};
