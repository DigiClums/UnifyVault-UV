import { NextRequest, NextResponse } from 'next/server';
import { validateSponsorshipPolicy } from '@/lib/smartAccount/paymasterPolicy';
import { getPaymasterRpcUrl, isGaslessSponsorshipEnabled } from '@/lib/smartAccount/config';
import { ENTRYPOINT_ADDRESS_V07 } from '@/lib/smartAccount/constants';
import { baseSepolia } from 'viem/chains';
import { concat, pad, toHex, type Hex, type Address } from 'viem';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chainId = baseSepolia.id,
      entryPoint = ENTRYPOINT_ADDRESS_V07,
      sender,
      calls,
      userOperation,
    } = body;

    // 1. Strict Paymaster Sponsorship Policy Validation (if calls provided directly)
    if (calls && Array.isArray(calls) && calls.length > 0) {
      const policyResult = validateSponsorshipPolicy({
        chainId,
        entryPoint,
        sender,
        calls,
      });

      if (!policyResult.isApproved) {
        return NextResponse.json(
          {
            success: false,
            error: policyResult.reason || 'Operation rejected by paymaster policy.',
          },
          { status: 400 },
        );
      }
    }

    // 2. Check if sponsorship is enabled for network
    if (!isGaslessSponsorshipEnabled(chainId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Gasless sponsorship is disabled for chain ID ${chainId}.`,
        },
        { status: 403 },
      );
    }

    // 3. Server-side signing or Paymaster RPC forwarding if userOperation is provided
    if (userOperation) {
      const paymasterRpc = process.env.PAYMASTER_RPC_URL;

      // If a dedicated paymaster JSON-RPC endpoint is configured, forward standard request
      if (paymasterRpc && !paymasterRpc.includes('/api/smart-account/sponsor')) {
        try {
          const response = await fetch(paymasterRpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'pm_sponsorUserOperation',
              params: [userOperation, entryPoint],
            }),
          });

          const pmData = await response.json();
          if (pmData.error) {
            return NextResponse.json(
              {
                success: false,
                error: pmData.error.message || 'Paymaster sponsorship failed at upstream provider.',
              },
              { status: 502 },
            );
          }

          return NextResponse.json({
            success: true,
            sponsored: true,
            data: pmData.result,
          });
        } catch (forwardErr: any) {
          console.warn(
            '[Paymaster API] Upstream RPC forward failed, falling back to local policy response:',
            forwardErr?.message,
          );
        }
      }

      // Generate standard ERC-4337 v0.7 Paymaster Data for UnifyVault Paymaster
      const paymasterAddr: Address = (process.env.PAYMASTER_ADDRESS ||
        '0x0000000000000000000000000000000000000000') as Address;
      const vGas = pad(toHex(100000n), { size: 16 });
      const pGas = pad(toHex(50000n), { size: 16 });
      const validUntil = Math.floor(Date.now() / 1000) + 3600;
      const validAfter = 0;
      const validUntilHex = pad(toHex(validUntil), { size: 6 });
      const validAfterHex = pad(toHex(validAfter), { size: 6 });
      const dummySig = ('0x' + '00'.repeat(65)) as Hex;

      const paymasterData = concat([validUntilHex, validAfterHex, dummySig]);
      const paymasterAndData = concat([paymasterAddr, vGas, pGas, paymasterData]);

      return NextResponse.json({
        success: true,
        sponsored: true,
        data: {
          paymaster: paymasterAddr,
          paymasterAndData,
          paymasterVerificationGasLimit: 100000n.toString(),
          paymasterPostOpGasLimit: 50000n.toString(),
          preVerificationGas: 50000n.toString(),
          verificationGasLimit: 150000n.toString(),
          callGasLimit: 300000n.toString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      policyApproved: true,
      sponsored: true,
      message: 'UnifyVault Paymaster policy pre-approval successful.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error processing sponsorship.',
      },
      { status: 500 },
    );
  }
}
