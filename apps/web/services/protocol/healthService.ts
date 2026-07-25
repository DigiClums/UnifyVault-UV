import { ProtocolService } from './protocolService';

export interface ProtocolHealthCheckReport {
  isHealthy: boolean;
  isDirectoryResolved: boolean;
  isControllerActive: boolean;
  isOracleHealthy: boolean;
  paused: boolean;
  modulesCount: number;
  oracleFeedsCount: number;
  freshFeedsCount: number;
  timestamp: number;
  checks: Array<{
    name: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    message: string;
  }>;
}

export const HealthService = {
  async runProtocolHealthCheck(chainId?: number): Promise<ProtocolHealthCheckReport> {
    try {
      const metrics = await ProtocolService.fetchRawMetrics(undefined, chainId);
      const addresses = metrics.addresses;

      const isDirectoryResolved =
        addresses.directory !== '0x0000000000000000000000000000000000000000' &&
        addresses.controller !== '0x0000000000000000000000000000000000000000' &&
        addresses.vault !== '0x0000000000000000000000000000000000000000' &&
        addresses.treasury !== '0x0000000000000000000000000000000000000000' &&
        addresses.token !== '0x0000000000000000000000000000000000000000';

      const freshFeeds = metrics.oracleFeeds.filter((f) => f.isFresh);
      const isOracleHealthy = metrics.isOracleHealthy && freshFeeds.length > 0;

      const checks: ProtocolHealthCheckReport['checks'] = [
        {
          name: 'ProtocolDirectory Resolution',
          status: isDirectoryResolved ? 'PASS' : 'FAIL',
          message: isDirectoryResolved
            ? 'All core protocol modules resolved via ProtocolDirectory'
            : 'ProtocolDirectory contains unresolved zero-address modules',
        },
        {
          name: 'Controller Pause Status',
          status: !metrics.isControllerPaused ? 'PASS' : 'WARN',
          message: !metrics.isControllerPaused
            ? 'UnifyVaultController is active and unpaused'
            : 'UnifyVaultController is currently paused',
        },
        {
          name: 'Chainlink Oracle Freshness',
          status: isOracleHealthy ? 'PASS' : 'WARN',
          message: isOracleHealthy
            ? `All ${freshFeeds.length} pricing feeds are fresh`
            : `Stale or missing oracle pricing feeds detected (${freshFeeds.length}/${metrics.oracleFeeds.length} fresh)`,
        },
      ];

      const isHealthy = isDirectoryResolved && !metrics.isControllerPaused && isOracleHealthy;

      return {
        isHealthy,
        isDirectoryResolved,
        isControllerActive: !metrics.isControllerPaused,
        isOracleHealthy,
        paused: metrics.isControllerPaused,
        modulesCount: Object.values(addresses).filter(
          (a) => a !== '0x0000000000000000000000000000000000000000',
        ).length,
        oracleFeedsCount: metrics.oracleFeeds.length,
        freshFeedsCount: freshFeeds.length,
        timestamp: Date.now(),
        checks,
      };
    } catch (error) {
      console.error('HealthService: Failed to execute protocol health check:', error);
      return {
        isHealthy: false,
        isDirectoryResolved: false,
        isControllerActive: false,
        isOracleHealthy: false,
        paused: false,
        modulesCount: 0,
        oracleFeedsCount: 0,
        freshFeedsCount: 0,
        timestamp: Date.now(),
        checks: [
          {
            name: 'System Health Check',
            status: 'FAIL',
            message: error instanceof Error ? error.message : 'Unknown protocol health error',
          },
        ],
      };
    }
  },
};
