# Contract Summary & Source Code Map

| Contract File                                                                                                           | Line Count | Primary Function                         | Access Control Role                |
| :---------------------------------------------------------------------------------------------------------------------- | :--------: | :--------------------------------------- | :--------------------------------- |
| [`UnifyVaultController.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/controller/UnifyVaultController.sol)   |    ~350    | Core deposit & redemption engine         | `CONTROLLER_ROLE`, `GUARDIAN_ROLE` |
| [`CustodyVault.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/vault/CustodyVault.sol)                        |    ~250    | Collateral asset custody & accounting    | `CONTROLLER_ROLE`                  |
| [`Treasury.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/vault/Treasury.sol)                                |    ~200    | Protocol fee reserve vault               | `DEFAULT_ADMIN_ROLE`               |
| [`StrategyManager.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/strategy/StrategyManager.sol)               |    ~220    | Target index weights calculation         | `STRATEGIST_ROLE`                  |
| [`PortfolioManager.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/strategy/PortfolioManager.sol)             |    ~280    | Portfolio rebalancing orchestrator       | `STRATEGIST_ROLE`                  |
| [`FeeManager.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/treasury/FeeManager.sol)                         |    ~150    | Fee calculation & parameter caps         | `DEFAULT_ADMIN_ROLE`               |
| [`OracleManager.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/oracle/OracleManager.sol)                     |    ~260    | Price feed aggregator & staleness guards | `DEFAULT_ADMIN_ROLE`               |
| [`ChainlinkOracleProvider.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/oracle/ChainlinkOracleProvider.sol) |    ~180    | Chainlink AggregatorV3 wrapper           | `DEFAULT_ADMIN_ROLE`               |
| [`ProtocolDirectory.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/ProtocolDirectory.sol)                    |    ~150    | On-chain module address registry         | `GOVERNANCE_ROLE`                  |
| [`UnifyVaultTimelock.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/governance/UnifyVaultTimelock.sol)       |    ~120    | 48-Hour mandatory governance timelock    | `DEFAULT_ADMIN_ROLE`               |
| [`UVBTCETHToken.sol`](file:///var/www/UnifyVault-UV/packages/protocol/src/token/UVBTCETHToken.sol)                      |    ~130    | ERC20 index vault share token            | `CONTROLLER_ROLE`                  |
