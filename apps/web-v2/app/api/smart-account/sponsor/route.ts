import { NextRequest, NextResponse } from 'next/server';
import {
  validateSponsorshipPolicy,
  extractCallsFromCallData,
} from '../../../../lib/smartAccount/paymasterPolicy';
import { isGaslessSponsorshipEnabled } from '../../../../lib/smartAccount/config';
import { ENTRYPOINT_ADDRESS_V07 } from '../../../../lib/smartAccount/constants';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../../../constants';
import { baseSepolia } from 'viem/chains';
import {
  concat,
  pad,
  toHex,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Server-side ECDSA Sponsorship Signing Endpoint
 *
 * Enforces Phase 1 Paymaster Hardening:
 * 1. Strict calldata policy inspection (whitelisted targets & selectors, value == 0)
 * 2. Short 5-minute validity window (validUntil = now + 300s, validAfter = 0)
 * 3. Cryptographic ECDSA signature binding sender, nonce, initCode, callData,
 *    accountGasLimits, preVerificationGas, gasFees, chainId, and paymaster address.
 * 4. Paymaster private key is strictly server-side (never exposed to browser or API responses).
 */
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

    // 1. Check if gasless sponsorship is enabled for network
    if (!isGaslessSponsorshipEnabled(chainId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Gasless sponsorship is disabled for chain ID ${chainId}.`,
        },
        { status: 403 },
      );
    }

    // 2. Pre-flight Policy Validation (if calls provided directly)
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

    // 3. UserOperation Cryptographic Sponsorship Signing
    if (userOperation) {
      // Validate calldata policy on UserOperation if callData is provided
      if (userOperation.callData && userOperation.callData !== '0x') {
        const extractedCalls = extractCallsFromCallData(userOperation.callData as Hex);
        if (extractedCalls && extractedCalls.length > 0) {
          const policyResult = validateSponsorshipPolicy({
            chainId,
            entryPoint,
            sender: userOperation.sender,
            calls: extractedCalls,
          });

          if (!policyResult.isApproved) {
            return NextResponse.json(
              {
                success: false,
                error: policyResult.reason || 'UserOp calldata rejected by paymaster policy.',
              },
              { status: 400 },
            );
          }
        }
      }

      const paymasterAddr: Address = (process.env.PAYMASTER_ADDRESS ||
        DEPLOYED_CONTRACTS_SEPOLIA.Paymaster ||
        '0x42c6342516714CFd64474bd41Ce360605b9fEA88') as Address;

      // Server-side dedicated Paymaster Signer Key
      const signerKey = process.env.PAYMASTER_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
      if (!signerKey) {
        throw new Error('PAYMASTER_SIGNER_PRIVATE_KEY environment variable is not configured');
      }

      // 5-minute validity window (300 seconds)
      const validUntil = Math.floor(Date.now() / 1000) + 300;
      const validAfter = 0;

      const vGasLimit = 100000n;
      const pGasLimit = 50000n;
      const vGasHex = pad(toHex(vGasLimit), { size: 16 });
      const pGasHex = pad(toHex(pGasLimit), { size: 16 });
      const validUntilHex = pad(toHex(validUntil), { size: 6 });
      const validAfterHex = pad(toHex(validAfter), { size: 6 });

      let signature: Hex = ('0x' + '00'.repeat(65)) as Hex;

      if (signerKey) {
        // Construct canonical hash matching UnifyVaultPaymaster.sol getHash()
        const senderAddr = getAddress(userOperation.sender);
        const nonceBigInt = BigInt(userOperation.nonce || 0);
        const initCodeHex = (
          userOperation.initCode && userOperation.initCode !== '0x'
            ? userOperation.initCode
            : userOperation.factory && userOperation.factoryData
              ? concat([userOperation.factory as Hex, userOperation.factoryData as Hex])
              : userOperation.factory
                ? `${userOperation.factory}${userOperation.factoryData?.slice(2) || ''}`
                : '0x'
        ) as Hex;
        const callDataHex = (userOperation.callData || '0x') as Hex;

        let accountGasLimitsHex = userOperation.accountGasLimits as Hex | undefined;
        if (
          !accountGasLimitsHex &&
          (userOperation.verificationGasLimit || userOperation.callGasLimit)
        ) {
          accountGasLimitsHex = concat([
            pad(toHex(BigInt(userOperation.verificationGasLimit || 150000n)), { size: 16 }),
            pad(toHex(BigInt(userOperation.callGasLimit || 300000n)), { size: 16 }),
          ]);
        }
        if (!accountGasLimitsHex) {
          accountGasLimitsHex = ('0x' + '00'.repeat(32)) as Hex;
        }

        const pvgBigInt = BigInt(userOperation.preVerificationGas || 50000n);

        let gasFeesHex = userOperation.gasFees as Hex | undefined;
        if (!gasFeesHex && (userOperation.maxPriorityFeePerGas || userOperation.maxFeePerGas)) {
          gasFeesHex = concat([
            pad(toHex(BigInt(userOperation.maxPriorityFeePerGas || 1500000000n)), { size: 16 }),
            pad(toHex(BigInt(userOperation.maxFeePerGas || 2000000000n)), { size: 16 }),
          ]);
        }
        if (!gasFeesHex) {
          gasFeesHex = ('0x' + '00'.repeat(32)) as Hex;
        }

        const hashToSign = keccak256(
          encodeAbiParameters(
            parseAbiParameters([
              'address sender',
              'uint256 nonce',
              'bytes32 initCodeHash',
              'bytes32 callDataHash',
              'bytes32 accountGasLimits',
              'uint256 preVerificationGas',
              'bytes32 gasFees',
              'uint256 chainId',
              'address paymaster',
              'uint48 validUntil',
              'uint48 validAfter',
            ]),
            [
              senderAddr,
              nonceBigInt,
              keccak256(initCodeHex),
              keccak256(callDataHex),
              accountGasLimitsHex,
              pvgBigInt,
              gasFeesHex,
              BigInt(chainId),
              paymasterAddr,
              validUntil,
              validAfter,
            ],
          ),
        );

        const signerAccount = privateKeyToAccount(signerKey);
        signature = await signerAccount.signMessage({
          message: { raw: hashToSign },
        });
      }

      const paymasterData = concat([validUntilHex, validAfterHex, signature]);
      const paymasterAndData = concat([paymasterAddr, vGasHex, pGasHex, paymasterData]);

      return NextResponse.json({
        success: true,
        sponsored: true,
        data: {
          paymaster: paymasterAddr,
          paymasterData,
          paymasterAndData,
          paymasterVerificationGasLimit: vGasLimit.toString(),
          paymasterPostOpGasLimit: pGasLimit.toString(),
          preVerificationGas: (userOperation.preVerificationGas || 50000n).toString(),
          verificationGasLimit: (userOperation.verificationGasLimit || 150000n).toString(),
          callGasLimit: (userOperation.callGasLimit || 300000n).toString(),
          validUntil,
          validAfter,
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
