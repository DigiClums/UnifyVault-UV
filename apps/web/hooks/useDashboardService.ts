import * as React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { DashboardService, DashboardData } from '../services/protocol/dashboardService';

/**
 * Custom React hook for polling DashboardData every `intervalMs` (default: 15,000ms).
 * Implements strict cleanup on component unmount to prevent memory leaks.
 */
export function useDashboardService(intervalMs: number = 15000) {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  const [data, setData] = React.useState<DashboardData | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const fetchDashboard = React.useCallback(async () => {
    try {
      const result = await DashboardService.getDashboardData({ userAddress, chainId });
      setData(result);
      setError(undefined);
    } catch (err) {
      console.error('❌ useDashboardService error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, chainId]);

  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchDashboard();
      }
    };

    loadData();

    const timer = setInterval(() => {
      if (isMounted) {
        fetchDashboard();
      }
    }, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [fetchDashboard, intervalMs]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
}
