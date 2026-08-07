import { QueryClient } from '@tanstack/react-query';

/**
 * Universal Cache Invalidation Helper for Blockchain Sync.
 * Forces TanStack Query to immediately invalidate all cached wagmi contract reads
 * and refetch active queries across the entire dashboard.
 */
export async function invalidateProtocolQueries(queryClient: QueryClient) {
  try {
    await queryClient.invalidateQueries({ queryKey: ['readContracts'] });
    await queryClient.invalidateQueries({ queryKey: ['readContract'] });
    await queryClient.invalidateQueries({ type: 'all' });
    await queryClient.refetchQueries({ type: 'active' });
  } catch (err) {
    console.error('Failed to invalidate protocol queries:', err);
  }
}
