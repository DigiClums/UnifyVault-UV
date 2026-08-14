import { Address, Hash, Hex } from 'viem';
import { SmartAccountCall, SponsorshipValidationResult } from '../types';

/**
 * Standard UserOperation Gas Price representation
 */
export interface UserOperationGasPrice {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/**
 * Paymaster sponsorship response structure conforming to ERC-7677 / ERC-4337 v0.7
 */
export interface PaymasterSponsorshipData {
  paymaster: Address;
  paymasterData?: Hex;
  paymasterAndData?: Hex;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
  preVerificationGas?: bigint;
  verificationGasLimit?: bigint;
  callGasLimit?: bigint;
}

/**
 * Generic Bundler Provider Interface (Self-hosted Alto, Rundler, Skandha, or generic RPC)
 */
export interface IBundlerProvider {
  rpcUrl: string;
  chainId: number;
  sendUserOperation(userOp: any, entryPoint: Address): Promise<Hash>;
  estimateUserOperationGas(
    userOp: any,
    entryPoint: Address,
  ): Promise<{
    preVerificationGas: bigint;
    verificationGasLimit: bigint;
    callGasLimit: bigint;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
  }>;
  getUserOperationReceipt(hash: Hash): Promise<any>;
  getUserOperationGasPrice(): Promise<UserOperationGasPrice>;
}

/**
 * Generic Paymaster Provider Interface (UnifyVault self-managed, ERC-7677, or local mock)
 */
export interface IPaymasterProvider {
  paymasterAddress?: Address;
  chainId: number;
  getPaymasterStubData(userOp: any, entryPoint: Address): Promise<PaymasterSponsorshipData>;
  getPaymasterData(userOp: any, entryPoint: Address): Promise<PaymasterSponsorshipData>;
  validatePolicy(params: {
    sender: Address;
    entryPoint: Address;
    calls: SmartAccountCall[];
  }): Promise<SponsorshipValidationResult>;
}

/**
 * Full Account Abstraction Configuration
 */
export interface AAInfrastructureConfig {
  chainId: number;
  entryPointAddress: Address;
  bundlerRpcUrl: string;
  paymasterRpcUrl?: string;
  paymasterAddress?: Address;
  isSponsorshipEnabled: boolean;
  isSelfHosted: boolean;
}
