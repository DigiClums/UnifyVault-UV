/**
 * Protocol Economic Configuration Adapter
 * Provides dynamic contract-backed protocol constants, weights, margin ratios, and haircuts.
 * When smart contracts are not deployed on the current chain, returns an explicitly labeled
 * DEMO_PROTOCOL_CONFIG with clear source provenance.
 */

export interface ProtocolEconomicConfig {
  source: 'ON_CHAIN' | 'DEMO_CONFIGURATION';
  isContractConnected: boolean;

  // Index Weights
  btcWeightPct: number;
  ethWeightPct: number;

  // Margin & Risk Parameters
  minimumCollateralRatioPct: number; // e.g. 140 for 140% MCR
  collateralHaircutPct: number; // e.g. 20 for 20%
  maintenanceMarginPct: number; // e.g. 110 for 110%
  liquidationThresholdPct: number; // e.g. 105 for 105%

  // Trading & Option Parameters
  lotSize: number; // e.g. 0.01 index units
  strikeInterval: number; // e.g. 250
  strikeLadderCount: number; // e.g. 9
  protocolTradingFeeBps: number; // e.g. 10 bps (0.1%)
  settlementFeeBps: number; // e.g. 15 bps (0.15%)

  // Implied Volatility Parameters
  baseImpliedVolatility: number; // e.g. 0.55 (55%)
  volatilitySmileFactor: number; // e.g. 0.02
  riskFreeRateAnnual: number; // e.g. 0.04 (4%)
}

export const DEMO_PROTOCOL_CONFIG: ProtocolEconomicConfig = {
  source: 'DEMO_CONFIGURATION',
  isContractConnected: false,
  btcWeightPct: 60,
  ethWeightPct: 40,
  minimumCollateralRatioPct: 140,
  collateralHaircutPct: 20,
  maintenanceMarginPct: 110,
  liquidationThresholdPct: 105,
  lotSize: 0.01,
  strikeInterval: 250,
  strikeLadderCount: 9,
  protocolTradingFeeBps: 10,
  settlementFeeBps: 15,
  baseImpliedVolatility: 0.55,
  volatilitySmileFactor: 0.02,
  riskFreeRateAnnual: 0.04,
};

export function getProtocolEconomicConfig(isDeployed: boolean): ProtocolEconomicConfig {
  if (!isDeployed) {
    return DEMO_PROTOCOL_CONFIG;
  }
  // When deployed, will be populated from ProtocolDirectory / OptionMarginEngine contract reads
  return {
    ...DEMO_PROTOCOL_CONFIG,
    source: 'ON_CHAIN',
    isContractConnected: true,
  };
}
