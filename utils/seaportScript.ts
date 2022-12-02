import { keccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {calculateOrderHash,OrderComponents,toBN,ConsiderationItem,OfferItem} from "./type";
const abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "conduitController",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "BadContractSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BadFraction",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BadReturnValueFromERC20OnTransfer",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      }
    ],
    "name": "BadSignatureV",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConsiderationCriteriaResolverOutOfRange",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "orderIndex",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "considerationIndex",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "shortfallAmount",
        "type": "uint256"
      }
    ],
    "name": "ConsiderationNotMet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CriteriaNotEnabledForItem",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "identifiers",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "ERC1155BatchTransferGenericFailure",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "EtherTransferGenericFailure",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InexactFraction",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientEtherSupplied",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Invalid1155BatchTransferEncoding",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidBasicOrderParameterEncoding",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "conduit",
        "type": "address"
      }
    ],
    "name": "InvalidCallToConduit",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCanceller",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "conduitKey",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "conduit",
        "type": "address"
      }
    ],
    "name": "InvalidConduit",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidERC721TransferAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFulfillmentComponentData",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "InvalidMsgValue",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidNativeOfferItem",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProof",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "InvalidRestrictedOrder",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSigner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTime",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MismatchedFulfillmentOfferAndConsiderationComponents",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "enum Side",
        "name": "side",
        "type": "uint8"
      }
    ],
    "name": "MissingFulfillmentComponentOnAggregation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MissingItemAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MissingOriginalConsiderationItems",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "NoContract",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoReentrantCalls",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoSpecifiedOrdersAvailable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OfferAndConsiderationRequiredOnFulfillment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OfferCriteriaResolverOutOfRange",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "OrderAlreadyFilled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OrderCriteriaResolverOutOfRange",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "OrderIsCancelled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "OrderPartiallyFilled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PartialFillsNotEnabledForOrder",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "identifier",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokenTransferGenericFailure",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnresolvedConsiderationCriteria",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnresolvedOfferCriteria",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnusedItemParameters",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newCounter",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "offerer",
        "type": "address"
      }
    ],
    "name": "CounterIncremented",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "offerer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "zone",
        "type": "address"
      }
    ],
    "name": "OrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "offerer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "zone",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "enum ItemType",
            "name": "itemType",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "identifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct SpentItem[]",
        "name": "offer",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "enum ItemType",
            "name": "itemType",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "identifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "recipient",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct ReceivedItem[]",
        "name": "consideration",
        "type": "tuple[]"
      }
    ],
    "name": "OrderFulfilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "offerer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "zone",
        "type": "address"
      }
    ],
    "name": "OrderValidated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "zone",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifierOrCriteria",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "startAmount",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct OfferItem[]",
            "name": "offer",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifierOrCriteria",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "startAmount",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endAmount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct ConsiderationItem[]",
            "name": "consideration",
            "type": "tuple[]"
          },
          {
            "internalType": "enum OrderType",
            "name": "orderType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "zoneHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "salt",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "conduitKey",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "counter",
            "type": "uint256"
          }
        ],
        "internalType": "struct OrderComponents[]",
        "name": "orders",
        "type": "tuple[]"
      }
    ],
    "name": "cancel",
    "outputs": [
      {
        "internalType": "bool",
        "name": "cancelled",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "uint120",
            "name": "numerator",
            "type": "uint120"
          },
          {
            "internalType": "uint120",
            "name": "denominator",
            "type": "uint120"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "extraData",
            "type": "bytes"
          }
        ],
        "internalType": "struct AdvancedOrder",
        "name": "advancedOrder",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "enum Side",
            "name": "side",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "index",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "identifier",
            "type": "uint256"
          },
          {
            "internalType": "bytes32[]",
            "name": "criteriaProof",
            "type": "bytes32[]"
          }
        ],
        "internalType": "struct CriteriaResolver[]",
        "name": "criteriaResolvers",
        "type": "tuple[]"
      },
      {
        "internalType": "bytes32",
        "name": "fulfillerConduitKey",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "fulfillAdvancedOrder",
    "outputs": [
      {
        "internalType": "bool",
        "name": "fulfilled",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "uint120",
            "name": "numerator",
            "type": "uint120"
          },
          {
            "internalType": "uint120",
            "name": "denominator",
            "type": "uint120"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "extraData",
            "type": "bytes"
          }
        ],
        "internalType": "struct AdvancedOrder[]",
        "name": "advancedOrders",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "enum Side",
            "name": "side",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "index",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "identifier",
            "type": "uint256"
          },
          {
            "internalType": "bytes32[]",
            "name": "criteriaProof",
            "type": "bytes32[]"
          }
        ],
        "internalType": "struct CriteriaResolver[]",
        "name": "criteriaResolvers",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "itemIndex",
            "type": "uint256"
          }
        ],
        "internalType": "struct FulfillmentComponent[][]",
        "name": "offerFulfillments",
        "type": "tuple[][]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "itemIndex",
            "type": "uint256"
          }
        ],
        "internalType": "struct FulfillmentComponent[][]",
        "name": "considerationFulfillments",
        "type": "tuple[][]"
      },
      {
        "internalType": "bytes32",
        "name": "fulfillerConduitKey",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maximumFulfilled",
        "type": "uint256"
      }
    ],
    "name": "fulfillAvailableAdvancedOrders",
    "outputs": [
      {
        "internalType": "bool[]",
        "name": "availableOrders",
        "type": "bool[]"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifier",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct ReceivedItem",
            "name": "item",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "conduitKey",
            "type": "bytes32"
          }
        ],
        "internalType": "struct Execution[]",
        "name": "executions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct Order[]",
        "name": "orders",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "itemIndex",
            "type": "uint256"
          }
        ],
        "internalType": "struct FulfillmentComponent[][]",
        "name": "offerFulfillments",
        "type": "tuple[][]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "itemIndex",
            "type": "uint256"
          }
        ],
        "internalType": "struct FulfillmentComponent[][]",
        "name": "considerationFulfillments",
        "type": "tuple[][]"
      },
      {
        "internalType": "bytes32",
        "name": "fulfillerConduitKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "maximumFulfilled",
        "type": "uint256"
      }
    ],
    "name": "fulfillAvailableOrders",
    "outputs": [
      {
        "internalType": "bool[]",
        "name": "availableOrders",
        "type": "bool[]"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifier",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct ReceivedItem",
            "name": "item",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "conduitKey",
            "type": "bytes32"
          }
        ],
        "internalType": "struct Execution[]",
        "name": "executions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "considerationToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "considerationIdentifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "considerationAmount",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "zone",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "offerToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "offerIdentifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "offerAmount",
            "type": "uint256"
          },
          {
            "internalType": "enum BasicOrderType",
            "name": "basicOrderType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "zoneHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "salt",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "offererConduitKey",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "fulfillerConduitKey",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "totalOriginalAdditionalRecipients",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct AdditionalRecipient[]",
            "name": "additionalRecipients",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct BasicOrderParameters",
        "name": "parameters",
        "type": "tuple"
      }
    ],
    "name": "fulfillBasicOrder",
    "outputs": [
      {
        "internalType": "bool",
        "name": "fulfilled",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct Order",
        "name": "order",
        "type": "tuple"
      },
      {
        "internalType": "bytes32",
        "name": "fulfillerConduitKey",
        "type": "bytes32"
      }
    ],
    "name": "fulfillOrder",
    "outputs": [
      {
        "internalType": "bool",
        "name": "fulfilled",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "offerer",
        "type": "address"
      }
    ],
    "name": "getCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "counter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "zone",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifierOrCriteria",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "startAmount",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct OfferItem[]",
            "name": "offer",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifierOrCriteria",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "startAmount",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endAmount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct ConsiderationItem[]",
            "name": "consideration",
            "type": "tuple[]"
          },
          {
            "internalType": "enum OrderType",
            "name": "orderType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "zoneHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "salt",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "conduitKey",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "counter",
            "type": "uint256"
          }
        ],
        "internalType": "struct OrderComponents",
        "name": "order",
        "type": "tuple"
      }
    ],
    "name": "getOrderHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderHash",
        "type": "bytes32"
      }
    ],
    "name": "getOrderStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isValidated",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isCancelled",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalFilled",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalSize",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "incrementCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "newCounter",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "information",
    "outputs": [
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "domainSeparator",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "conduitController",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "uint120",
            "name": "numerator",
            "type": "uint120"
          },
          {
            "internalType": "uint120",
            "name": "denominator",
            "type": "uint120"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "extraData",
            "type": "bytes"
          }
        ],
        "internalType": "struct AdvancedOrder[]",
        "name": "advancedOrders",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "orderIndex",
            "type": "uint256"
          },
          {
            "internalType": "enum Side",
            "name": "side",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "index",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "identifier",
            "type": "uint256"
          },
          {
            "internalType": "bytes32[]",
            "name": "criteriaProof",
            "type": "bytes32[]"
          }
        ],
        "internalType": "struct CriteriaResolver[]",
        "name": "criteriaResolvers",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "orderIndex",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "itemIndex",
                "type": "uint256"
              }
            ],
            "internalType": "struct FulfillmentComponent[]",
            "name": "offerComponents",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "orderIndex",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "itemIndex",
                "type": "uint256"
              }
            ],
            "internalType": "struct FulfillmentComponent[]",
            "name": "considerationComponents",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct Fulfillment[]",
        "name": "fulfillments",
        "type": "tuple[]"
      }
    ],
    "name": "matchAdvancedOrders",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifier",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct ReceivedItem",
            "name": "item",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "conduitKey",
            "type": "bytes32"
          }
        ],
        "internalType": "struct Execution[]",
        "name": "executions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct Order[]",
        "name": "orders",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "orderIndex",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "itemIndex",
                "type": "uint256"
              }
            ],
            "internalType": "struct FulfillmentComponent[]",
            "name": "offerComponents",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "orderIndex",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "itemIndex",
                "type": "uint256"
              }
            ],
            "internalType": "struct FulfillmentComponent[]",
            "name": "considerationComponents",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct Fulfillment[]",
        "name": "fulfillments",
        "type": "tuple[]"
      }
    ],
    "name": "matchOrders",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "enum ItemType",
                "name": "itemType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "identifier",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
              }
            ],
            "internalType": "struct ReceivedItem",
            "name": "item",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "offerer",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "conduitKey",
            "type": "bytes32"
          }
        ],
        "internalType": "struct Execution[]",
        "name": "executions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "contractName",
        "type": "string"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "offerer",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "zone",
                "type": "address"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct OfferItem[]",
                "name": "offer",
                "type": "tuple[]"
              },
              {
                "components": [
                  {
                    "internalType": "enum ItemType",
                    "name": "itemType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "identifierOrCriteria",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "startAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "endAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "address payable",
                    "name": "recipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct ConsiderationItem[]",
                "name": "consideration",
                "type": "tuple[]"
              },
              {
                "internalType": "enum OrderType",
                "name": "orderType",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "zoneHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "conduitKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "totalOriginalConsiderationItems",
                "type": "uint256"
              }
            ],
            "internalType": "struct OrderParameters",
            "name": "parameters",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct Order[]",
        "name": "orders",
        "type": "tuple[]"
      }
    ],
    "name": "validate",
    "outputs": [
      {
        "internalType": "bool",
        "name": "validated",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
const transactionHash = "0xee880064392aea25d8c44ab81bf5ce756546bea163e3b1b99d3006499b25b3e1";
const seaportAddress = "0x00000000006c3852cbEf3e08E8dF289169EdE581";
const counterStorageSlot = "0000000000000000000000000000000000000000000000000000000000000001";
const signerAddress = "0x95C30fb60380175059781d3a730757d254b4485B";
const inter = new ethers.utils.Interface(abi);
async function main() {

  // Get the transaction from transaction hash 
  const transaction = await  ethers.provider.getTransaction(transactionHash)
  console.log(transaction);

  // decode the function argument 
  const decodedInput = inter.parseTransaction({ data: transaction.data, value: transaction.value});

  // get counter of the offerer 
  const counter = await ethers.provider.getStorageAt(seaportAddress,ethers.utils.keccak256(concat(decodedInput.args[0].offerer,counterStorageSlot)),transaction.blockNumber);
  console.log({counter});
  

  // create the order of the offerer
  const offer:OfferItem = {
    itemType: 1,
    token: decodedInput.args[0].offerToken,
    identifierOrCriteria: decodedInput.args[0].offerIdentifier,
    startAmount: decodedInput.args[0].offerAmount,
    endAmount: decodedInput.args[0].offerAmount
  }

  const consideration:ConsiderationItem = {
    itemType: 3,
    token: decodedInput.args[0].considerationToken,
    identifierOrCriteria: decodedInput.args[0].considerationIdentifier,
    startAmount: decodedInput.args[0].considerationAmount,
    endAmount: decodedInput.args[0].considerationAmount,
    recipient: decodedInput.args[0].offerer,
  }

  const AdditionalRecipient1:ConsiderationItem = {
    itemType: 1,
    token: decodedInput.args[0].offerToken,
    identifierOrCriteria: decodedInput.args[0].offerIdentifier,
    startAmount: decodedInput.args[0].additionalRecipients[0].amount,
    endAmount:decodedInput.args[0].additionalRecipients[0].amount,
    recipient:decodedInput.args[0].additionalRecipients[0].recipient
  }

  const AdditionalRecipient2:ConsiderationItem = {
    itemType: 1,
    token: decodedInput.args[0].offerToken,
    identifierOrCriteria: decodedInput.args[0].offerIdentifier,
    startAmount: decodedInput.args[0].additionalRecipients[1].amount,
    endAmount:decodedInput.args[0].additionalRecipients[1].amount,
    recipient:decodedInput.args[0].additionalRecipients[1].recipient
  }

  const order:OrderComponents = {
    offerer: decodedInput.args[0].offerer,
    zone:  decodedInput.args[0].zone,
    offer: [offer],
    consideration: [consideration,AdditionalRecipient1,AdditionalRecipient2],
    orderType:(decodedInput.args[0].basicOrderType%4),
    startTime: decodedInput.args[0].startTime,
    endTime: decodedInput.args[0].endTime,
    zoneHash:  decodedInput.args[0].zoneHash,
    salt:  decodedInput.args[0].salt._hex,
    conduitKey:decodedInput.args[0].offererConduitKey,
    counter: toBN(counter)
  }

  // get the order hash 
  const orderHash = calculateOrderHash(order);
  console.log(decodedInput.args[0].basicOrderType%4);
  console.log(orderHash);

  const signer = await ethers.getSigner(signerAddress)

  const seaport = new ethers.Contract(seaportAddress,abi,signer);
 
  // get the order status 
  const orderStatus = await seaport.getOrderStatus(orderHash
    );

  console.log(orderStatus);
}


function concat(arg1:string,arg2:string){
   return `0x000000000000000000000000${arg1.slice(2)}` + arg2
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
