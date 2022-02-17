import {ethers} from 'hardhat';
import {setupPolygonAsset} from './fixtures';
import {waitFor} from '../../utils';
import {transferSand} from '../catalyst/utils';
import BN from 'bn.js';
import crypto from 'crypto';
import {BigNumber, constants} from 'ethers';
import {assert, expect} from 'chai';

const zeroAddress = constants.AddressZero;

// eslint-disable-next-line mocha/no-skipped-tests
describe('assetSignedAuctionAuth', function () {
  const startingPrice = new BN('1000000000000000000');
  const endingPrice = new BN('5000000000000000000');
  const duration = 1000;
  const packs = 1;
  const buyAmount = 1;
  const amounts = [1];

  it('should be able to claim seller offer in ETH', async function () {
    const {
      Asset,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
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
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
          ],
        },
        primaryType: 'Auction',
        domain: {
          name: 'The Sandbox',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          from: seller,
          token: zeroAddress,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
        },
      },
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    const prevSellerEtherBalance = await ethers.provider.getBalance(
      users[0].address
    );

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    );

    assert.equal(
      new BN(
        (await ethers.provider.getBalance(users[0].address)).toString()
      ).cmp(new BN(prevSellerEtherBalance.toString())),
      1
    );
    assert.equal(
      new BN(
        await Asset.balanceOfBatch([users[0].address], [tokenId])
      ).toString(),
      '19'
    );
    assert.equal(
      new BN(
        await Asset.balanceOfBatch([users[1].address], [tokenId])
      ).toString(),
      '1'
    );
  });

  it('should NOT be able to claim offer if signature mismatches', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
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
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
          ],
        },
        primaryType: 'Auction',
        domain: {
          name: 'Wrong domain',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          from: seller,
          token: zeroAddress,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
        },
      },
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('signer != from');
  });

  it('should be able to claim seller offer in SAND', async function () {
    const {
      Asset,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      Sand,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const sandAsUser = Sand.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
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
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
          ],
        },
        primaryType: 'Auction',
        domain: {
          name: 'The Sandbox',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          from: seller,
          token: Sand.address,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
        },
      },
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await transferSand(
      Sand,
      users[1].address,
      BigNumber.from('5000000000000000000')
    );

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );
    await sandAsUser.approve(
      assetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    const prevSellerSandBalance = await Sand.balanceOf(users[0].address);

    expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: users[1].address,
        seller: users[0].address,
        token: Sand.address,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      })
    ).to.be.ok;

    assert.equal(
      new BN(
        await Asset.balanceOfBatch([users[0].address], [tokenId])
      ).toString(),
      '19'
    );
    assert.equal(
      new BN(
        await Asset.balanceOfBatch([users[1].address], [tokenId])
      ).toString(),
      '1'
    );

    assert.equal(
      new BN((await Sand.balanceOf(users[0].address)).toString()).cmp(
        new BN(prevSellerSandBalance.toString())
      ),
      1
    );
  });

  it('should be able to claim seller offer with basic signature', async function () {
    const {
      Asset,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const hashedData = ethers.utils.solidityKeccak256(
      [
        'address',
        'bytes',
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes',
        'bytes',
      ],
      [
        assetSignedAuctionAuthContract.address,
        ethers.utils.solidityKeccak256(
          ['string'],
          [
            'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
          ]
        ),
        seller,
        zeroAddress,
        offerId,
        startingPrice.toString(),
        endingPrice.toString(),
        startedAt,
        duration,
        packs,
        ethers.utils.solidityKeccak256(['uint[]'], [[tokenId.toString()]]),
        ethers.utils.solidityKeccak256(['uint[]'], [amounts]),
      ]
    );

    const wallet = await ethers.getSigner(users[0].address);

    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    const prevSellerEtherBalance = await ethers.provider.getBalance(
      users[0].address
    );

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    );

    assert.equal(
      new BN(
        (await ethers.provider.getBalance(users[0].address)).toString()
      ).cmp(new BN(prevSellerEtherBalance.toString())),
      1
    );
    assert.equal(
      new BN(
        await Asset.balanceOfBatch([users[0].address], [tokenId])
      ).toString(),
      '19'
    );
    assert.equal(
      new BN(
        await Asset.balanceOfBatch([users[1].address], [tokenId])
      ).toString(),
      '1'
    );
  });

  it('should be able to cancel offer', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    await assetSignedAuctionAuthContract.cancelSellerOffer(offerId);

    const hashedData = ethers.utils.solidityKeccak256(
      [
        'address',
        'bytes',
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes',
        'bytes',
      ],
      [
        assetSignedAuctionAuthContract.address,
        ethers.utils.solidityKeccak256(
          ['string'],
          [
            'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
          ]
        ),
        seller,
        zeroAddress,
        offerId,
        startingPrice.toString(),
        endingPrice.toString(),
        startedAt,
        duration,
        packs,
        ethers.utils.solidityKeccak256(['uint[]'], [[tokenId.toString()]]),
        ethers.utils.solidityKeccak256(['uint[]'], [amounts]),
      ]
    );

    const wallet = await ethers.getSigner(users[0].address);

    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Auction cancelled');
  });

  it('should NOT be able to claim offer without sending ETH', async function () {
    const {
      Asset,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // await assetSignedAuctionAuthContract.cancelSellerOffer(offerId);

    const hashedData = ethers.utils.solidityKeccak256(
      [
        'address',
        'bytes',
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes',
        'bytes',
      ],
      [
        assetSignedAuctionAuthContract.address,
        ethers.utils.solidityKeccak256(
          ['string'],
          [
            'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
          ]
        ),
        seller,
        zeroAddress,
        offerId,
        startingPrice.toString(),
        endingPrice.toString(),
        startedAt,
        duration,
        packs,
        ethers.utils.solidityKeccak256(['uint[]'], [[tokenId.toString()]]),
        ethers.utils.solidityKeccak256(['uint[]'], [amounts]),
      ]
    );

    const wallet = await ethers.getSigner(users[0].address);

    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await Asset.setApprovalForAll(assetSignedAuctionAuthContract.address, true);

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig({
        buyer: users[1].address,
        seller: users[0].address,
        token: zeroAddress,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      })
    ).to.be.revertedWith('ETH < total');
  });

  it('should NOT be able to claim offer without enough SAND', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      Sand,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const sandAsUser = Sand.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
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
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
          ],
        },
        primaryType: 'Auction',
        domain: {
          name: 'The Sandbox',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          from: seller,
          token: Sand.address,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
        },
      },
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );
    await sandAsUser.approve(
      assetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    await sandAsUser.transfer(
      users[2].address,
      (await Sand.balanceOf(users[1].address)).toString()
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: users[1].address,
        seller: users[0].address,
        token: Sand.address,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      })
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it('should NOT be able to claim offer if it did not start yet', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) + 1000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
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
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
          ],
        },
        primaryType: 'Auction',
        domain: {
          name: 'The Sandbox',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          from: seller,
          token: zeroAddress,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
        },
      },
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith("Auction didn't start yet");
  });

  it('should NOT be able to claim offer if it already ended', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 10000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
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
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
          ],
        },
        primaryType: 'Auction',
        domain: {
          name: 'The Sandbox',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          from: seller,
          token: zeroAddress,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
        },
      },
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Auction finished');
  });
});
