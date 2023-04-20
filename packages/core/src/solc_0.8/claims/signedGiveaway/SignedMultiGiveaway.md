# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

# Features

This contract give rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing. The
message is composed of:

- A list of signatures. If the contract holt too much value more than one signature is needed. Ideally the systems that
  sign must be independent.
- A list of claim ids used by the backend to avoid double spending.
- Expiration the expiration time of the message in unix timestamp. After the expiration the message cannot be used
  anymore.
- From: usually the rewards must be transferred to the contract and this value is address(this), if a strategy with
  approve and transfer is used this is the address of the source.
- To: the destination address that will get the rewards.
- Claims: A list of union structs that include: token type (ERC20, ERC721, ERC1155), token address and a data field that
  depending on the token type may have: amount, tokenId, etc.

```solidity
Signature[] calldata sigs,
uint256[] calldata claimIds,
uint256 expiration,
address from, // address(this)
address to,
ClaimEntry[] calldata claims
```

## Roles

- SIGNERS: This role corresponds to the addresses authorized to sign claims.
- DEFAULT_ADMIN_ROLE: This role can grant and revoke access to the other roles also it is in charge of setting the
  limits and un-pausing the contract.
- BACKOFFICE_ADMIN: Addresses in this role help the admin but with fewer privileges. They can revoke claims, pause the
  contract in the case of an emergency (but cannot unpause it).

## Limits

Even if we blindly trust the backend to give rewards we have some upper case limits in the contract to mitigate the lost
we can have in the case of a stolen key or backend code bug.

There are two kind of limit that can be set by the admin role:

1. Strict limits that apply to some amount but don't depend on time.
2. Rate limits that depends on how many claims per sec we receive. Rate limits are described as a time base in secs plus
   and amount, for example if the rate is `10eth/week`, `10 eth` is the amount and `week` == `60*60*24*7 secs` is the
   time base.

The limits can be imposed over a certain token address and for ERC1155 a token address plus token id.

We have the following limits:

- number of signatures: number of backend signatures needed to approve a claim.
- max entries per claim: maximum amount of claim entries (token transferred) that can be done in one claim.
- max wei per claim: maximum amount of tokens transferred for each claim entry. This is a strict limit that applies to
  each entry.
- max wei per token: total amount of tokens per sec transferred. This is a rate limit that applies to the total amount
  transferred for each token/tokenId.

## Functions info

### CLAIM_ENTRY_TYPEHASH (0xba94ec0d)

```solidity
function CLAIM_ENTRY_TYPEHASH() external view returns (bytes32);
```

### CLAIM_TYPEHASH (0x6b0509b1)

```solidity
function CLAIM_TYPEHASH() external view returns (bytes32);
```

### DEFAULT_ADMIN_ROLE (0xa217fddf)

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
```

### SIGNER_ROLE (0xa1ebf35d)

```solidity
function SIGNER_ROLE() external view returns (bytes32);
```

### claim (0xbec74704)

```solidity
function claim(
  tuple[] sigs,
  uint256[] claimIds,
  uint256 expiration,
  address from,
  address to,
  tuple[] claims
) external;
```

verifies the ERC712 signatures and transfer tokens from the source user to the destination user.

Parameters:

| Name     | Type      | Description                                                     |
| :------- | :-------- | :-------------------------------------------------------------- |
| sigs     | tuple[]   | signature part (v,r,s) the array of signatures M in N of M sigs |
| claimIds | uint256[] | unique claim ids, used by the backend to avoid double spending  |
| from     | address   | source user                                                     |
| to       | address   | destination user                                                |
| claims   | tuple[]   | list of tokens to do transfer                                   |

### claimed (0xdbe7e3bd)

```solidity
function claimed(uint256 claimId) external view returns (bool);
```

Return true if already claimed

### domainSeparator (0xf698da25)

```solidity
function domainSeparator() external view returns (bytes32);
```

EIP712 domain separator

Return values:

| Name | Type    | Description                      |
| :--- | :------ | :------------------------------- |
| _0   | bytes32 | the hash of the domain separator |

### getRoleAdmin (0x248a9ca3)

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32);
```

Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role's admin, use {_
setRoleAdmin}.

### getTrustedForwarder (0xce1b815f)

```solidity
function getTrustedForwarder() external view returns (address);
```

### grantRole (0x2f2ff15d)

```solidity
function grantRole(bytes32 role, address account) external;
```

Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements:
- the caller must have ``role``'s admin role.

### hasRole (0x91d14854)

```solidity
function hasRole(bytes32 role, address account) external view returns (bool);
```

Returns `true` if `account` has been granted `role`.

### initialize (0x485cc955)

```solidity
function initialize(address trustedForwarder_, address admin_) external;
```

### isTrustedForwarder (0x572b6c05)

```solidity
function isTrustedForwarder(address forwarder) external view returns (bool);
```

### name (0x06fdde03)

```solidity
function name() external view returns (string);
```

### onERC1155BatchReceived (0xbc197c81)

```solidity
function onERC1155BatchReceived(
  address,
  address,
  uint256[],
  uint256[],
  bytes
) external returns (bytes4);
```

### onERC1155Received (0xf23a6e61)

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) external returns (bytes4);
```

### onERC721Received (0x150b7a02)

```solidity
function onERC721Received(address, address, uint256, bytes) external returns (bytes4);
```

See {IERC721Receiver-onERC721Received}. Always returns `IERC721Receiver.onERC721Received.selector`.

### pause (0x8456cb59)

```solidity
function pause() external;
```

Triggers stopped state. No mre claims are accepted.

### paused (0x5c975abb)

```solidity
function paused() external view returns (bool);
```

Returns true if the contract is paused, and false otherwise.

### recoverAssets (0x2bea1a5d)

```solidity
function recoverAssets(address to, tuple[] claims) external;
```

let the admin recover tokens from the contract

Parameters:

| Name   | Type    | Description                               |
| :----- | :------ | :---------------------------------------- |
| to     | address | destination address of the recovered fund |
| claims | tuple[] | list of the tokens to transfer            |

### renounceRole (0x36568abe)

```solidity
function renounceRole(bytes32 role, address account) external;
```

Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function's
purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted
device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the
caller must be `account`.

### revokeClaims (0xe5dac0d0)

```solidity
function revokeClaims(uint256[] claimIds) external;
```

let the admin revoke some claims so they cannot be used anymore

Parameters:

| Name     | Type      | Description                      |
| :------- | :-------- | :------------------------------- |
| claimIds | uint256[] | and array of claim Ids to revoke |

### revokeRole (0xd547741f)

```solidity
function revokeRole(bytes32 role, address account) external;
```

Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the
caller must have ``role``'s admin role.

### setLimitPerId (0xb906966c)

```solidity
function setLimitPerId(
  address token,
  uint256 tokenId,
  uint32 timeBase,
  uint128 maxWeiPerTimeBase,
  uint96 maxWeiPerClaim
) external;
```

set the limits per token and tokenId

Parameters:

| Name              | Type    | Description                                                          |
| :---------------- | :------ | :------------------------------------------------------------------- |
| token             | address | the token to which will assign the limit                             |
| tokenId           | uint256 | the id of the token                                                  |
| timeBase          | uint32  | the base time of the rate limit in secs for 10eth/week => 60*60*24*7 |
| maxWeiPerTimeBase | uint128 | the max amount of the rate limit for 10eth/week => 10eth             |
| maxWeiPerClaim    | uint96  | the max amount per each claim, for example 0.01eth per claim         |

### setLimitPerToken (0xa61ccb5d)

```solidity
function setLimitPerToken(
  address token,
  uint32 timeBase,
  uint128 maxWeiPerTimeBase,
  uint96 maxWeiPerClaim
) external;
```

set the limits per token

Parameters:

| Name              | Type    | Description                                                          |
| :---------------- | :------ | :------------------------------------------------------------------- |
| token             | address | the token to which will assign the limit                             |
| timeBase          | uint32  | the base time of the rate limit in secs for 10eth/week => 60*60*24*7 |
| maxWeiPerTimeBase | uint128 | the max amount of the rate limit for 10eth/week => 10eth             |
| maxWeiPerClaim    | uint96  | the max amount per each claim, for example 0.01eth per claim         |

### setLimits (0x3f34c514)

```solidity
function setLimits(uint64 numberOfSignatures, uint64 maxClaimEntries) external;
```

set the global limits of the contract

Parameters:

| Name               | Type   | Description                                                                            |
| :----------------- | :----- | :------------------------------------------------------------------------------------- |
| numberOfSignatures | uint64 | number of signatures needed to approve a claim (default to 1)                          |
| maxClaimEntries    | uint64 | maximum number of entries in a claim (amount of transfers) that can be claimed at once |

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool);
```

See {IERC165-supportsInterface}.

### trustedForwarder (0x7da0a877)

```solidity
function trustedForwarder() external view returns (address);
```

### unpause (0x3f4ba83a)

```solidity
function unpause() external;
```

Returns to the normal state. Accept claims.

### verifySignature (0xe4564c5b)

```solidity
function verifySignature(
  tuple sig,
  uint256[] claimIds,
  uint256 expiration,
  address from,
  address to,
  tuple[] claims
) external view returns (address);
```

verifies a ERC712 signature for the Claim data type.

Parameters:

| Name       | Type      | Description                             |
| :--------- | :-------- | :-------------------------------------- |
| sig        | tuple     | signature part (v,r,s)                  |
| claimIds   | uint256[] | unique id used to avoid double spending |
| expiration | uint256   | expiration timestamp                    |
| from       | address   | source user                             |
| to         | address   | destination user                        |
| claims     | tuple[]   | list of tokens to do transfer           |

Return values:

| Name | Type    | Description                                          |
| :--- | :------ | :--------------------------------------------------- |
| _0   | address | the recovered address must match the signing address |

### version (0x54fd4d50)

```solidity
function version() external view returns (string);
```
