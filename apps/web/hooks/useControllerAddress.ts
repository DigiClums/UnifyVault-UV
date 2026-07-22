import {
  useProtocolDirectoryAddresses,
  DEPOSIT_MANAGER_KEY,
} from './useProtocolDirectoryAddresses';

export { DEPOSIT_MANAGER_KEY };

export function useControllerAddress() {
  const { controllerAddress, isLoading, error } = useProtocolDirectoryAddresses();

  return {
    controllerAddress,
    isLoading,
    error,
  };
}
