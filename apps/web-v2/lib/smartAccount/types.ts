import { Address, Hex } from 'viem';

export interface SmartAccountCall {
  to: Address;
  value?: bigint;
  data: Hex;
}

export interface GaslessDepositParams {
  amount: bigint;
  minSharesOut: bigint;
  receiver: Address;
  usdcAddress?: Address;
  controllerAddress?: Address;
}

export interface GaslessRedeemParams {
  shares: bigint;
  minAssetsOut: bigint;
  receiver: Address;
  deadline?: bigint;
  usdcAddress?: Address;
  controllerAddress?: Address;
}

export interface SponsorshipValidationRequest {
  chainId: number;
  entryPoint: Address;
  sender: Address;
  calls: SmartAccountCall[];
}

export interface SponsorshipValidationResult {
  isApproved: boolean;
  reason?: string;
  operationType?: 'deposit' | 'redeem' | 'batch_deposit';
}

export interface SmartAccountState {
  address: Address | null;
  ownerAddress: Address | null;
  isDeployed: boolean;
  isLoading: boolean;
  error: string | null;
}
