import { parseAbi } from 'viem';

export const STABILIZER_VAULT_ABI = parseAbi([
  'function maxTradeUsdc() view returns (uint256)',
  'function maxDailyExposureUsdc() view returns (uint256)',
  'function cooldownDuration() view returns (uint256)',
  'function minPoolLiquidity() view returns (uint256)',
  'function lastStabilizeTimestamp() view returns (uint256)',
  'function dailyExposureAccumulator() view returns (uint256)',
  'function paused() view returns (bool)',
  'function EXPECTED_POOL_ID() view returns (bytes32)',
  'function getPoolId() view returns (bytes32)',
  'function stabilize() external',
  'function emergencyHalt() external',
  'event StabilizationExecuted(uint256 indexed navPrice, uint256 dexPrice, uint256 deviationBps, bool isBuy, uint256 usdcAmount, uint256 uvbeAmount, uint256 timestamp, bytes32 poolId)',
  'event StabilizationSkipped(string reason, uint256 navPrice, uint256 dexPrice, uint256 timestamp)',
  'event EmergencyHalt(uint256 deviationBps, uint256 navPrice, uint256 dexPrice, uint256 timestamp)',
  'event ConfigurationChanged(uint256 maxTradeUsdc, uint256 maxDailyExposureUsdc, uint256 cooldownDuration, uint256 minPoolLiquidity, address indexed admin)',
]);
