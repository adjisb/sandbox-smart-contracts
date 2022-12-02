import type { BigNumberish, ContractTransaction } from "ethers";

import { BigNumber, constants, utils } from "ethers";
import { getAddress, keccak256, toUtf8Bytes } from "ethers/lib/utils";


export const toBN = (n: BigNumberish) => BigNumber.from(toHex(n));

export const toAddress = (n: BigNumberish) => getAddress(toHex(n, 20));

export const toKey = (n: BigNumberish) => toHex(n, 32);
const hexRegex = /[A-Fa-fx]/g;

export const toHex = (n: BigNumberish, numBytes: number = 0) => {
    const asHexString = BigNumber.isBigNumber(n)
      ? n.toHexString().slice(2)
      : typeof n === "string"
      ? hexRegex.test(n)
        ? n.replace(/0x/, "")
        : Number(n).toString(16)
      : Number(n).toString(16);
    return `0x${asHexString.padStart(numBytes * 2, "0")}`;
  };

export type AdditionalRecipient = {
  amount: BigNumber;
  recipient: string;
};

export type FulfillmentComponent = {
  orderIndex: number;
  itemIndex: number;
};

export type Fulfillment = {
  offerComponents: FulfillmentComponent[];
  considerationComponents: FulfillmentComponent[];
};

export type CriteriaResolver = {
  orderIndex: number;
  side: 0 | 1;
  index: number;
  identifier: BigNumber;
  criteriaProof: string[];
};

export type BasicOrderParameters = {
  considerationToken: string;
  considerationIdentifier: BigNumber;
  considerationAmount: BigNumber;
  offerer: string;
  zone: string;
  offerToken: string;
  offerIdentifier: BigNumber;
  offerAmount: BigNumber;
  basicOrderType: number;
  startTime: string | BigNumber | number;
  endTime: string | BigNumber | number;
  zoneHash: string;
  salt: string;
  offererConduitKey: string;
  fulfillerConduitKey: string;
  totalOriginalAdditionalRecipients: BigNumber;
  additionalRecipients: AdditionalRecipient[];
  signature: string;
};

export type OfferItem = {
  itemType: number;
  token: string;
  identifierOrCriteria: BigNumber;
  startAmount: BigNumber;
  endAmount: BigNumber;
};
export type ConsiderationItem = {
  itemType: number;
  token: string;
  identifierOrCriteria: BigNumber;
  startAmount: BigNumber;
  endAmount: BigNumber;
  recipient: string;
};

export type OrderParameters = {
  offerer: string;
  zone: string;
  offer: OfferItem[];
  consideration: ConsiderationItem[];
  orderType: number;
  startTime: string | BigNumber | number;
  endTime: string | BigNumber | number;
  zoneHash: string;
  salt: string;
  conduitKey: string;
  totalOriginalConsiderationItems: string | BigNumber | number;
};

export type OrderComponents = Omit<
  OrderParameters,
  "totalOriginalConsiderationItems"
> & {
  counter: BigNumber;
};

export type Order = {
  parameters: OrderParameters;
  signature: string;
};

export type AdvancedOrder = {
  parameters: OrderParameters;
  numerator: string | BigNumber | number;
  denominator: string | BigNumber | number;
  signature: string;
  extraData: string;
};
export const calculateOrderHash = (orderComponents: OrderComponents) => {
  const offerItemTypeString =
    "OfferItem(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount)";
  const considerationItemTypeString =
    "ConsiderationItem(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount,address recipient)";
  const orderComponentsPartialTypeString =
    "OrderComponents(address offerer,address zone,OfferItem[] offer,ConsiderationItem[] consideration,uint8 orderType,uint256 startTime,uint256 endTime,bytes32 zoneHash,uint256 salt,bytes32 conduitKey,uint256 counter)";
  const orderTypeString = `${orderComponentsPartialTypeString}${considerationItemTypeString}${offerItemTypeString}`;

  const offerItemTypeHash = keccak256(toUtf8Bytes(offerItemTypeString));
  const considerationItemTypeHash = keccak256(
    toUtf8Bytes(considerationItemTypeString)
  );
  const orderTypeHash = keccak256(toUtf8Bytes(orderTypeString));

  const offerHash = keccak256(
    "0x" +
      orderComponents.offer
        .map((offerItem) => {
          return keccak256(
            "0x" +
              [
                offerItemTypeHash.slice(2),
                offerItem.itemType.toString().padStart(64, "0"),
                offerItem.token.slice(2).padStart(64, "0"),
                toBN(offerItem.identifierOrCriteria)
                  .toHexString()
                  .slice(2)
                  .padStart(64, "0"),
                toBN(offerItem.startAmount)
                  .toHexString()
                  .slice(2)
                  .padStart(64, "0"),
                toBN(offerItem.endAmount)
                  .toHexString()
                  .slice(2)
                  .padStart(64, "0"),
              ].join("")
          ).slice(2);
        })
        .join("")
  );

  const considerationHash = keccak256(
    "0x" +
      orderComponents.consideration
        .map((considerationItem) => {
          return keccak256(
            "0x" +
              [
                considerationItemTypeHash.slice(2),
                considerationItem.itemType.toString().padStart(64, "0"),
                considerationItem.token.slice(2).padStart(64, "0"),
                toBN(considerationItem.identifierOrCriteria)
                  .toHexString()
                  .slice(2)
                  .padStart(64, "0"),
                toBN(considerationItem.startAmount)
                  .toHexString()
                  .slice(2)
                  .padStart(64, "0"),
                toBN(considerationItem.endAmount)
                  .toHexString()
                  .slice(2)
                  .padStart(64, "0"),
                considerationItem.recipient.slice(2).padStart(64, "0"),
              ].join("")
          ).slice(2);
        })
        .join("")
  );

  const derivedOrderHash = keccak256(
    "0x" +
      [
        orderTypeHash.slice(2),
        orderComponents.offerer.slice(2).padStart(64, "0"),
        orderComponents.zone.slice(2).padStart(64, "0"),
        offerHash.slice(2),
        considerationHash.slice(2),
        orderComponents.orderType.toString().padStart(64, "0"),
        toBN(orderComponents.startTime)
          .toHexString()
          .slice(2)
          .padStart(64, "0"),
        toBN(orderComponents.endTime).toHexString().slice(2).padStart(64, "0"),
        orderComponents.zoneHash.slice(2),
        orderComponents.salt.slice(2).padStart(64, "0"),
        orderComponents.conduitKey.slice(2).padStart(64, "0"),
        toBN(orderComponents.counter).toHexString().slice(2).padStart(64, "0"),
      ].join("")
  );

  return derivedOrderHash;
};

