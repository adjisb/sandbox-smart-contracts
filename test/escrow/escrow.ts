import {expect} from 'chai';
import {setupEscrow} from './fixtures';
import {escrow712Signature, escrow712Signature2} from './signature';
import {ethers} from 'hardhat';
import {waitFor} from '../utils';
import {BigNumber} from 'ethers';

describe('Escrow.sol XXXXXX VVVVVV ', function () {
  it('register a new token', async function () {
    const {
      user,
      owner,
      mintableERC721,
      mintableERC721AsOwner,
      escrowContractAsOwner,
    } = await setupEscrow();

    //deposit
    const tokenId = 123;
    await mintableERC721.mint(owner, tokenId);
    await mintableERC721AsOwner.approve(escrowContractAsOwner.address, tokenId);
    await escrowContractAsOwner.deposit(mintableERC721.address, tokenId, 1);
    await mintableERC721.mint(owner, 1);
    await mintableERC721.mint(owner, 2);
    await mintableERC721.mint(owner, 3);
    await mintableERC721.mint(owner, 4);
    await mintableERC721.mint(owner, 5);
    await mintableERC721.mint(owner, 6);
    await escrowContractAsOwner.withdraw(mintableERC721.address, tokenId);
  });
  it('bitwise test', async function () {
    /* const one = '01';
    const seven = '07';
    const thirty = '20';
    const sixty = '41';
    const ninety = 'BE';
    const oneeighty = '143C';
    const year = '2495'; */
    const times = [1, 7, 32, 65, 1090, 5180, 9365];
    const timesHex = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40];
    const timesHex2 = [];
    const combinations = [];

    for (let i = 0; i < times.length; i++) {
      timesHex2.push(times[i].toString(16));
    }

    console.log(timesHex2);

    //yourNumber = parseInt(hexString, 16);

    for (let i = 0; i < times.length; i++) {
      let result = 0x00;
      for (let j = i; j < times.length; j++) {
        result = timesHex[j] + result;
      }
      combinations.push(result);
    }
    console.log(combinations);

    //verify if they belong
    for (let i = 0; i < combinations.length; i++) {
      for (let j = 0; j < times.length; j++) {
        const result = combinations[i] & timesHex[j];
        console.log(result);
      }
    }
  });

  it('signature for timelock', async function () {
    const {
      owner,
      mintableERC721,
      mintableERC721AsOwner,
      escrowContractAsOwner,
      rentingContract,
      escrowContract,
    } = await setupEscrow();

    //deposit
    const tokenId = 123;
    await mintableERC721.mint(owner, tokenId);
    await mintableERC721AsOwner.approve(escrowContractAsOwner.address, tokenId);
    //await escrowContractAsOwner.deposit(mintableERC721.address, tokenId, 1);

    //console.log(signature);
    const hashedTokenId = ethers.utils.solidityKeccak256(
      ['bytes'],
      [
        ethers.utils.solidityPack(
          ['address', 'uint'],
          [mintableERC721.address, tokenId]
        ),
      ]
    );

    const {v, r, s} = await escrow712Signature(
      escrowContract,
      owner,
      rentingContract.address,
      0x27,
      hashedTokenId
    );

    //const receipt = await rentingContract.rent(owner, tokenId, v, r, s);
    const receipt = await waitFor(
      rentingContract.rent(owner, tokenId, 0x27, 0x20, v, r, s)
    );
    console.log(receipt.gasUsed.toString());
  });

  it('second signature for timelock', async function () {
    const {
      owner,
      mintableERC721,
      mintableERC721AsOwner,
      escrowContractAsOwner,
      rentingContract,
      escrowContract,
    } = await setupEscrow();

    //deposit
    const tokenId = 123;
    await mintableERC721.mint(owner, tokenId);
    await mintableERC721AsOwner.approve(escrowContractAsOwner.address, tokenId);

    console.log('sig recovery');
    let recAdds = await escrowContractAsOwner.Pverify(
      27,
      '0x47b448b0a30798c51274d8f7fd3fb0c9eb75e89aec2f9fbe3d604cf4f26d2a30',
      '0x165585cb4a821ef23ff259be2dbf0624e339e7cbca0c43a836d9f1a753c9837f',
      '0x1b2b37315783790f31a72d073632333423ba506315ad4c61c60524544e941575',
      [1]
    );
    console.log('recovered sig');
    console.log(recAdds);

    /* function Pverify(
      uint8 v,
      bytes32 r,
      bytes32 s,
      bytes32 tokenID,
      address originalOwner,
      uint256[] calldata timesAvaliable
 */
    /* v
      EscrowView.jsx:296 27
      EscrowView.jsx:297 r
      EscrowView.jsx:298 0x47b448b0a30798c51274d8f7fd3fb0c9eb75e89aec2f9fbe3d604cf4f26d2a30
      EscrowView.jsx:299 s
      EscrowView.jsx:300 0x165585cb4a821ef23ff259be2dbf0624e339e7cbca0c43a836d9f1a753c9837f
      EscrowView.jsx:301 0x3d68af2C576A1B4072174EaF5bD981A02751Ec31
      EscrowView.jsx:302 123
      EscrowView.jsx:303 ['1'] */

    //owner token times
    //console.log(signature);
    const hashedTokenId = ethers.utils.solidityKeccak256(
      ['bytes'],
      [
        ethers.utils.solidityPack(
          ['address', 'uint'],
          [mintableERC721.address, tokenId]
        ),
      ]
    );

    const hashedTimes = ethers.utils.solidityKeccak256(
      ['bytes'],
      [ethers.utils.solidityPack(['uint[]'], [[1, 7, 30]])]
    );

    //const possibleTimes = ethers.utils.solidityPack(['uint[]'], [[1, 7, 30]]);

    const {v, r, s} = await escrow712Signature2(
      escrowContract,
      owner,
      rentingContract.address,
      hashedTimes,
      hashedTokenId
    );
    console.log('sig parts');
    console.log(v);
    console.log(r);
    console.log(s);

    recAdds = await escrowContractAsOwner.Pverify(v, r, s, hashedTokenId, [
      1,
      7,
      30,
    ]);
    console.log('recovered sig');
    console.log(recAdds);
    console.log('owner');
    console.log(owner);

    //const receipt = await rentingContract.rent(owner, tokenId, v, r, s);
    const receipt = await waitFor(
      rentingContract.rent2(owner, tokenId, [1, 7, 30], 7, v, r, s)
    );
    console.log(receipt.gasUsed.toString());
  });
});
