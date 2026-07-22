import { useProtocolDirectoryAddresses, INDEX_TOKEN_KEY } from './useProtocolDirectoryAddresses';

export { INDEX_TOKEN_KEY };

export function useIndexTokenAddress() {
  const { indexTokenAddress, isLoading, error } = useProtocolDirectoryAddresses();

  return {
    indexTokenAddress,
    isLoading,
    error,
  };
}
