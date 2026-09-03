/**
 * Options Protocol Contract Configuration
 * Strictly defines network-specific addresses, ABIs, and adapter metadata.
 * Missing addresses are cleanly represented without fake fallbacks.
 */

export interface OptionsProtocolContracts {
  chainId: number;
  networkName: string;
  indexManager?: `0x${string}`;
  uvNiftyIndex?: `0x${string}`;
  optionMarketFactory?: `0x${string}`;
  optionPricingEngine?: `0x${string}`;
  optionMarginEngine?: `0x${string}`;
  optionPositionManager?: `0x${string}`;
  optionLiquidityVault?: `0x${string}`;
  optionSettlementVault?: `0x${string}`;
  uvbeToken: `0x${string}`;
  oracleManager: `0x${string}`;
  isDeployed: boolean;
}

export const OPTIONS_CONTRACTS: Record<number, OptionsProtocolContracts> = {
  // Base Mainnet (Chain ID 8453)
  8453: {
    chainId: 8453,
    networkName: 'Base Mainnet',
    uvbeToken: '0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde', // UVBE V2 Token
    oracleManager: '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6',
    isDeployed: false, // Options sub-modules pending live governance deployment
  },
  // Base Sepolia (Chain ID 84532)
  84532: {
    chainId: 84532,
    networkName: 'Base Sepolia Testnet',
    uvbeToken: '0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde',
    oracleManager: '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6',
    isDeployed: false,
  },
};

export function getOptionsContracts(chainId?: number): OptionsProtocolContracts {
  if (!chainId || !OPTIONS_CONTRACTS[chainId]) {
    return OPTIONS_CONTRACTS[8453]; // default to Base Mainnet config
  }
  return OPTIONS_CONTRACTS[chainId];
}
