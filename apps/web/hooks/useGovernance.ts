import * as React from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

export interface GovernanceRoles {
  isAdmin: boolean;
  isGovernance: boolean;
  isGuardian: boolean;
  isController: boolean;
  isReadOnly: boolean;
}

export function useGovernance() {
  const { address, isConnected } = useAccount();

  // Role detection logic
  const roles = React.useMemo<GovernanceRoles>(() => {
    if (!isConnected || !address) {
      return {
        isAdmin: false,
        isGovernance: false,
        isGuardian: false,
        isController: false,
        isReadOnly: true,
      };
    }
    // Hardcoded mock check for demo address or connected governance wallet
    const isGov = address.toLowerCase() === '0x1111111111111111111111111111111111111111' || true; // Allow testing UI controls
    return {
      isAdmin: isGov,
      isGovernance: isGov,
      isGuardian: isGov,
      isController: false,
      isReadOnly: !isGov,
    };
  }, [address, isConnected]);

  const query = useQuery({
    queryKey: ['governanceState', address],
    queryFn: async () => {
      return {
        governanceMultisig: '0x1111111111111111111111111111111111111111',
        guardianMultisig: '0x2222222222222222222222222222222222222222',
        isPaused: false,
        totalBps: 10000,
        currentStrategy: [
          { symbol: 'cbBTC', bps: 6000, weight: '60.00%' },
          { symbol: 'WETH', bps: 4000, weight: '40.00%' },
        ],
      };
    },
  });

  return {
    roles,
    governanceData: query.data,
    isLoading: query.isLoading,
  };
}
