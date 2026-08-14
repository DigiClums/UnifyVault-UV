import { Address, Hex, concat, pad, toHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { validateSponsorshipPolicy } from '../paymasterPolicy';
import { SmartAccountCall, SponsorshipValidationResult } from '../types';
import { IPaymasterProvider, PaymasterSponsorshipData } from './types';
import { ENTRYPOINT_ADDRESS_V07 } from '../constants';

function stringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
}

/**
 * Paymaster Provider for UnifyVault Account Abstraction.
 * Connects to UnifyVault's self-managed paymaster backend (/api/smart-account/sponsor)
 * or standard ERC-7677/ERC-4337 v0.7 paymaster endpoints.
 */
export class PaymasterProvider implements IPaymasterProvider {
  public readonly paymasterAddress?: Address;
  public readonly rpcUrl: string;
  public readonly chainId: number;

  constructor(params: { paymasterAddress?: Address; rpcUrl?: string; chainId?: number }) {
    this.paymasterAddress = params.paymasterAddress;
    this.rpcUrl = params.rpcUrl || '/api/smart-account/sponsor';
    this.chainId = params.chainId || baseSepolia.id;
  }

  /**
   * Client-side policy validation before invoking the server/paymaster
   */
  async validatePolicy(params: {
    sender: Address;
    entryPoint?: Address;
    calls: SmartAccountCall[];
  }): Promise<SponsorshipValidationResult> {
    return validateSponsorshipPolicy({
      chainId: this.chainId,
      entryPoint: params.entryPoint || ENTRYPOINT_ADDRESS_V07,
      sender: params.sender,
      calls: params.calls,
    });
  }

  /**
   * Returns stub paymaster data for fee estimation (ERC-7677 / ERC-4337 v0.7)
   */
  async getPaymasterStubData(
    userOp: any,
    entryPoint: Address = ENTRYPOINT_ADDRESS_V07,
  ): Promise<PaymasterSponsorshipData> {
    const paymaster =
      this.paymasterAddress || ('0x0000000000000000000000000000000000000000' as Address);

    // In ERC-4337 v0.7:
    // paymasterAndData: [paymaster(20) | verificationGasLimit(16) | postOpGasLimit(16) | stubPaymasterData(77)]
    const dummyPaymasterData = ('0x' + '00'.repeat(77)) as Hex;
    const vGas = pad(toHex(100000n), { size: 16 });
    const pGas = pad(toHex(50000n), { size: 16 });
    const paymasterAndData = concat([paymaster, vGas, pGas, dummyPaymasterData]);

    return {
      paymaster,
      paymasterData: dummyPaymasterData,
      paymasterAndData,
      paymasterVerificationGasLimit: 100000n,
      paymasterPostOpGasLimit: 50000n,
      preVerificationGas: 50000n,
      verificationGasLimit: 150000n,
      callGasLimit: 300000n,
    };
  }

  /**
   * Returns final paymaster data with valid sponsorship signatures or policy tokens
   */
  async getPaymasterData(
    userOp: any,
    entryPoint: Address = ENTRYPOINT_ADDRESS_V07,
  ): Promise<PaymasterSponsorshipData> {
    const paymaster =
      this.paymasterAddress || ('0x0000000000000000000000000000000000000000' as Address);
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: stringifyWithBigInt({
          chainId: this.chainId,
          entryPoint,
          userOperation: userOp,
          sender: userOp.sender,
        }),
      });

      if (!response.ok) {
        throw new Error(`Paymaster sponsorship request failed: ${response.statusText}`);
      }

      const json = await response.json();
      if (!json.success && json.error) {
        throw new Error(`Paymaster sponsorship rejected: ${json.error}`);
      }

      if (json.data?.paymasterAndData) {
        return {
          paymaster: json.data.paymaster || paymaster,
          paymasterData: json.data.paymasterData || (('0x' + '00'.repeat(77)) as Hex),
          paymasterAndData: json.data.paymasterAndData,
          paymasterVerificationGasLimit: json.data.paymasterVerificationGasLimit
            ? BigInt(json.data.paymasterVerificationGasLimit)
            : 100000n,
          paymasterPostOpGasLimit: json.data.paymasterPostOpGasLimit
            ? BigInt(json.data.paymasterPostOpGasLimit)
            : 50000n,
        };
      }

      // If backend approved policy without remote signer (pure on-chain paymaster)
      return await this.getPaymasterStubData(userOp, entryPoint);
    } catch (err: any) {
      console.error('[PaymasterProvider Error]', err);
      // In browser/production, rethrow descriptive error
      if (typeof window !== 'undefined' && !err?.message?.includes('mock')) {
        throw new Error(`Gas sponsorship authorization failed: ${err?.message || 'Server error'}`);
      }
      return await this.getPaymasterStubData(userOp, entryPoint);
    }
  }
}
