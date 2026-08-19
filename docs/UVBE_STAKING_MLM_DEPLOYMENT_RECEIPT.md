# UVBE Dynamic Recurring Reward & MLM Subsystem — Base Sepolia Deployment Receipt

**Network:** Base Sepolia (Chain ID: `84532`)  
**Deployment Timestamp:** 2026-08-19 16:33:34 UTC+05:30  
**Canonical UVBE Token:** `0x006c5DF13C716E5224b33956651C4356BB90DEc0`  
**Timelock Controller:** `0x9094145Cd2AEA2f309eDf14237444a07edF98d02`  
**Deployer / Initial Admin:** `0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1`  
**Genesis Referrer:** `0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1`

---

## 1. Deployed Contract Addresses

| Contract                    | Address                                      | Verification Status   |
| :-------------------------- | :------------------------------------------- | :-------------------- |
| **`UVBERewardReserve`**     | `0xf1E40C0e7aA253CE259A224f1CFEDEDEd6D77Fda` | Deployed & Mesh Wired |
| **`UVBEStakingVault`**      | `0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4` | Deployed & Mesh Wired |
| **`UVBEReferralRegistry`**  | `0xc1F00539B6869b2445d85056EDc036114b939Ddd` | Deployed & Mesh Wired |
| **`UVBERewardDistributor`** | `0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9` | Deployed & Mesh Wired |

---

## 2. On-Chain Deployment Transactions

All 30 transactions were mined and verified successfully on Base Sepolia:

|  #  | Action / Function                            | Target Contract         | Transaction Hash                                                     |
| :-: | :------------------------------------------- | :---------------------- | :------------------------------------------------------------------- |
|  1  | `CREATE`                                     | `UVBERewardReserve`     | `0x8cf4c33f86835efa5c993c129e442c76608c4cd4a078ab5a1528463e3036d017` |
|  2  | `CREATE`                                     | `UVBEStakingVault`      | `0x4bb3447979f17261cede00d67b7ef1b28df3c9c9718d822c69e392a1600dcece` |
|  3  | `CREATE`                                     | `UVBEReferralRegistry`  | `0xb3c71fdc4e84790642abd6853d6f37551c74bb4afd83d37bc79107e70bcedb31` |
|  4  | `CREATE`                                     | `UVBERewardDistributor` | `0xb84f6539029e97130983e2e0e3890f997d0056cba426cb4c38f7ce6233a3e1b8` |
|  5  | `setDistributor(distributor)`                | `UVBERewardReserve`     | `0x8d6627039e4f00000a83db1bda9b5b52d0a77124c64dbc0d00a48beadda78f40` |
|  6  | `setModules(registry, distributor)`          | `UVBEStakingVault`      | `0xd1295e51589df259fccd329f608c7b8b3f31736caaf12cd7e92f9b946b82ab15` |
|  7  | `setModules(vault, distributor)`             | `UVBEReferralRegistry`  | `0xca382e66c07f4c5d08d50517e44bf325193d0d3b49f03fc81dcf4307e5456d50` |
|  8  | `setModules(reserve, vault, registry)`       | `UVBERewardDistributor` | `0x90b5f1f5c543a2f7b63169173c04726903bbab4b86260e34d984eb79c2fd57b7` |
|  9  | `grantRole(DEFAULT_ADMIN_ROLE, timelock)`    | `UVBERewardReserve`     | `0x5719974bf3aa9833f72beb9e43a05dac2282ba359922658e8ccd7e3afaaa5287` |
| 10  | `grantRole(GOVERNANCE_ROLE, timelock)`       | `UVBERewardReserve`     | `0x4b819d1d3498511ae61493c8f59b4c3a2c4d72bf823e8060b3943dce206abf6f` |
| 11  | `grantRole(GUARDIAN_ROLE, guardian)`         | `UVBERewardReserve`     | `0xa5c4f038541b0b2e3f2a9055949f0fe7cd973280471db47c7529d4a7a4da78c0` |
| 12  | `grantRole(DEFAULT_ADMIN_ROLE, timelock)`    | `UVBEStakingVault`      | `0xa22aee53e61f792c0368ed6af7b352e58dd7c69e4f78f7b9df982184b8eee4cf` |
| 13  | `grantRole(GOVERNANCE_ROLE, timelock)`       | `UVBEStakingVault`      | `0x032fe59ba66a9f32d8fd89d6644aa1fd0d454ac352c3ba4749fef0b6a385f658` |
| 14  | `grantRole(GUARDIAN_ROLE, guardian)`         | `UVBEStakingVault`      | `0x10c8639289903430876e60911bf629e85a9864ebe2da404c6ca5016e3ffe1c0b` |
| 15  | `grantRole(DEFAULT_ADMIN_ROLE, timelock)`    | `UVBEReferralRegistry`  | `0x0eeac715fed03f33e6ca5400d44d3d21a31b99edccb55f982da5bb398adba46d` |
| 16  | `grantRole(GOVERNANCE_ROLE, timelock)`       | `UVBEReferralRegistry`  | `0x3df96afd81ec7fe102fcfba4a5cd2a3aaa7289cd14aa0861750cd1df9fa7e608` |
| 17  | `grantRole(DEFAULT_ADMIN_ROLE, timelock)`    | `UVBERewardDistributor` | `0x57b6474d7d58833cbbe8f87b385160c164287f0c804eed4accb56e527372a8ce` |
| 18  | `grantRole(GOVERNANCE_ROLE, timelock)`       | `UVBERewardDistributor` | `0x86955a4e10d484cf3db2e31bdb240967ff9d38c3d1aecc3124cac6a6cffcb910` |
| 19  | `grantRole(GUARDIAN_ROLE, guardian)`         | `UVBERewardDistributor` | `0x41f46e2189f03e4a7b40054062e3743e7cfad77f930c015e412b069b4cdbf820` |
| 20  | `renounceRole(GUARDIAN_ROLE, deployer)`      | `UVBERewardReserve`     | `0x8e6286d723cabf159ccba629008caf8c5023188bfbdea7591260d125cee75a59` |
| 21  | `renounceRole(GOVERNANCE_ROLE, deployer)`    | `UVBERewardReserve`     | `0x5c93f3bd8731b77912207b43606f886360ac2aa8dd7dd751a328db6c7dbf10c2` |
| 22  | `renounceRole(DEFAULT_ADMIN_ROLE, deployer)` | `UVBERewardReserve`     | `0x27c79d18c4d933df5c71fa7c5b1ddc6aaf2ba94d5324b0171a2d1690b165d981` |
| 23  | `renounceRole(GUARDIAN_ROLE, deployer)`      | `UVBEStakingVault`      | `0x9aafa35e45f2b7fdcad0f8ad4f37c72f3450cf66c8a6769be914c3d79852b85f` |
| 24  | `renounceRole(GOVERNANCE_ROLE, deployer)`    | `UVBEStakingVault`      | `0x1a3e3569aa9117d89a72a219f6793f8b3837e3a50e2203e2d143e930df52bff1` |
| 25  | `renounceRole(DEFAULT_ADMIN_ROLE, deployer)` | `UVBEStakingVault`      | `0x6d9e8db7b3d1f74c2494b9165adf4ce8ad1cfade58a0ad0e7cb1572890e46026` |
| 26  | `renounceRole(GOVERNANCE_ROLE, deployer)`    | `UVBEReferralRegistry`  | `0xa4dada0df32d65e67953ef27043ed8d3e7e881b98b092bcb2b6fa50b37f6aae0` |
| 27  | `renounceRole(DEFAULT_ADMIN_ROLE, deployer)` | `UVBEReferralRegistry`  | `0xee8e892e805e7b40835e2aabe83d9c1c23818d8df70237d638f3a98e04c18329` |
| 28  | `renounceRole(GUARDIAN_ROLE, deployer)`      | `UVBERewardDistributor` | `0xa97d54ffaa7b6593649d0e354cf5fbb8f0188f1c7ceca26341299e9d16e77098` |
| 29  | `renounceRole(GOVERNANCE_ROLE, deployer)`    | `UVBERewardDistributor` | `0x00a5e140a1920004e4dad081849f40a33833c01c4cfa0a156ba70c46c07d68a3` |
| 30  | `renounceRole(DEFAULT_ADMIN_ROLE, deployer)` | `UVBERewardDistributor` | `0xcc0e7f7658a1daf2921c41ae5d3bfa2a0dda7b863da878b8df3d0fe766e77484` |

---

## 3. On-Chain Verification Matrix

### 3.1 Module Mesh Interconnection (Immutable & Frozen)

- `UVBERewardReserve.distributor()` == `0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9` ✅
- `UVBEStakingVault.registry()` == `0xc1F00539B6869b2445d85056EDc036114b939Ddd` ✅
- `UVBEStakingVault.distributor()` == `0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9` ✅
- `UVBEReferralRegistry.vault()` == `0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4` ✅
- `UVBEReferralRegistry.distributor()` == `0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9` ✅
- `UVBERewardDistributor.reserve()` == `0xf1E40C0e7aA253CE259A224f1CFEDEDEd6D77Fda` ✅
- `UVBERewardDistributor.vault()` == `0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4` ✅
- `UVBERewardDistributor.registry()` == `0xc1F00539B6869b2445d85056EDc036114b939Ddd` ✅

### 3.2 Canonical UVBE Token Binding

- `UVBERewardReserve.token()` == `0x006c5DF13C716E5224b33956651C4356BB90DEc0` ✅
- `UVBEStakingVault.token()` == `0x006c5DF13C716E5224b33956651C4356BB90DEc0` ✅
- `UVBERewardDistributor.token()` == `0x006c5DF13C716E5224b33956651C4356BB90DEc0` ✅

### 3.3 Dynamic APY & Parameters

- `UVBERewardDistributor.MAX_RECURRING_ANNUAL_BPS()` == `10000` (100.00% ceiling) ✅
- `UVBERewardDistributor.getCurrentAnnualBps()` == `0` (Initial APY without funded reserve) ✅
- `UVBERewardDistributor.SECONDS_PER_YEAR()` == `31536000` (365 days) ✅
- `UVBERewardDistributor.DAO_POOL_BPS()` == `100` (1.00%) ✅
- `UVBERewardDistributor.totalOutstandingLiabilities()` == `0` ✅
- `UVBERewardReserve.getAvailableReserve()` == `0` ✅

### 3.4 Treasury Fee & Vault Parameters

- `UVBEStakingVault.ADMIN_FEE_BPS()` == `500` (5.00% Treasury Fee) ✅
- `UVBEStakingVault.treasury()` == `0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1` ✅
- `UVBEStakingVault.MIN_STAKE()` == `50 * 1e18` (50 UVBE) ✅
- `UVBEStakingVault.MAX_STAKE()` == `100,000 * 1e18` (100,000 UVBE) ✅
- `UVBEStakingVault.totalPermanentStaked()` == `0` ✅

### 3.5 Referral Registry Configuration

- `UVBEReferralRegistry.genesisReferrer()` == `0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1` ✅
- `UVBEReferralRegistry.MIN_ACTIVE_STAKE()` == `50 * 1e18` (50 UVBE) ✅
- `UVBEReferralRegistry.MAX_GENERATION_DEPTH()` == `10` generations ✅

### 3.6 Access Roles & Privilege Handover

- **Deployer Roles (`0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1`):**
  - `UVBERewardReserve`: Admin = `false`, Governance = `false`, Guardian = `false` ✅
  - `UVBEStakingVault`: Admin = `false`, Governance = `false`, Guardian = `false` ✅
  - `UVBEReferralRegistry`: Admin = `false`, Governance = `false` ✅
  - `UVBERewardDistributor`: Admin = `false`, Governance = `false`, Guardian = `false` ✅
- **Timelock / Guardian Roles (`0x9094145Cd2AEA2f309eDf14237444a07edF98d02`):**
  - `UVBERewardReserve`: Admin = `true`, Governance = `true`, Guardian = `true` ✅
  - `UVBEStakingVault`: Admin = `true`, Governance = `true`, Guardian = `true` ✅
  - `UVBEReferralRegistry`: Admin = `true`, Governance = `true` ✅
  - `UVBERewardDistributor`: Admin = `true`, Governance = `true`, Guardian = `true` ✅

### 3.7 Zero-Touch Core UVBE Isolation

- `UVBEV2.hasRole(CONTROLLER_ROLE, UVBERewardReserve)` == `false` ✅
- `UVBEV2.hasRole(CONTROLLER_ROLE, UVBEStakingVault)` == `false` ✅
- `UVBEV2.hasRole(CONTROLLER_ROLE, UVBEReferralRegistry)` == `false` ✅
- `UVBEV2.hasRole(CONTROLLER_ROLE, UVBERewardDistributor)` == `false` ✅
