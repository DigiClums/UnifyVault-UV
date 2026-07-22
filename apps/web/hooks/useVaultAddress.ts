import { useProtocolDirectoryAddresses, VAULT_KEY } from './useProtocolDirectoryAddresses';

export { VAULT_KEY };

export function useVaultAddress() {
  const { vaultAddress, isLoading, error } = useProtocolDirectoryAddresses();

  return {
    vaultAddress,
    isLoading,
    error,
  };
}
