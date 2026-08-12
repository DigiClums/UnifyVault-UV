import type { Address } from 'viem';

export type TransactionState =
  | 'IDLE'
  | 'PREPARING'
  | 'WALLET_REQUEST'
  | 'WALLET_REQUEST_TIMEOUT'
  | 'USER_REJECTED'
  | 'SUBMITTED'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'FAILED';

export interface TransactionProgressState {
  state: TransactionState;
  attemptId: string | null;
  txHash: `0x${string}` | null;
  errorMessage: string | null;
  rawError: unknown | null;
  stepName: string | null;
  stepDescription: string | null;
  allowanceChecked: boolean;
  allowanceRequired: bigint | null;
  allowanceCurrent: bigint | null;
  allowanceSkipped: boolean;
  timeoutSeconds: number;
}

export interface AllowanceCheckParams {
  assetAddress: Address;
  spenderAddress: Address;
  requiredAmount: bigint;
  userAddress?: Address;
}

export interface ExecuteTransactionOptions {
  stepName?: string;
  stepDescription?: string;
  timeoutMs?: number;
  onTxHash?: (hash: `0x${string}`) => void;
  onSuccess?: (receipt: any) => void;
}

export interface ExecuteWithApprovalOptions extends ExecuteTransactionOptions {
  assetAddress?: Address;
  spenderAddress?: Address;
  requiredAmount?: bigint;
  approvalStepName?: string;
  approvalStepDescription?: string;
}
