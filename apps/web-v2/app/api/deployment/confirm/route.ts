export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import {
  readDeploymentManifest,
  writeDeploymentManifest,
} from '../../../../lib/deployment/manifestStore';
import { createPublicClient, http, isAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getRpcUrl } from '../../../../constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainId, stepNumber, contractName, deployedAddress, txHash, expectedVersion } = body;

    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid chainId' }, { status: 400 });
    }

    if (!stepNumber || typeof stepNumber !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid stepNumber' }, { status: 400 });
    }

    const currentManifest = await readDeploymentManifest(chainId);

    if (currentManifest.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: 'Deployment is LOCKED on server. Step cannot be overwritten or redeployed.',
          manifest: currentManifest,
        },
        { status: 403 },
      );
    }

    // Verify on-chain if deployedAddress was provided (with retry for L2 node propagation)
    if (deployedAddress && isAddress(deployedAddress)) {
      const rpcUrls = [
        getRpcUrl(chainId),
        'https://base-rpc.publicnode.com',
        'https://mainnet.base.org',
      ];
      let bytecodeFound = false;

      for (const rpc of rpcUrls) {
        try {
          const client = createPublicClient({
            chain: chainId === 8453 ? base : baseSepolia,
            transport: http(rpc),
          });
          // Retry up to 3 times with a short delay for state propagation
          for (let attempt = 0; attempt < 3; attempt++) {
            const bytecode = await client.getBytecode({ address: deployedAddress });
            if (bytecode && bytecode !== '0x') {
              bytecodeFound = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 600));
          }
          if (bytecodeFound) break;
        } catch {}
      }

      if (!bytecodeFound) {
        return NextResponse.json(
          {
            success: false,
            error: `Verification failed: No contract bytecode found at ${deployedAddress} on chain ${chainId}.`,
          },
          { status: 400 },
        );
      }
    }

    const updatedRecords = { ...currentManifest.stepRecords };
    updatedRecords[stepNumber] = {
      stepNumber,
      stepId: `step_${stepNumber}`,
      status: 'confirmed',
      deployedAddress: deployedAddress as `0x${string}` | undefined,
      txHash: txHash as `0x${string}` | undefined,
      timestamp: Date.now(),
    };

    const updatedContracts = { ...currentManifest.contracts };
    if (contractName && deployedAddress && isAddress(deployedAddress)) {
      (updatedContracts as any)[contractName] = deployedAddress;
    }

    const nextStepIndex = Math.max(currentManifest.currentStepIndex, stepNumber);
    const isCompleted = nextStepIndex >= currentManifest.totalSteps;

    const updatedManifest = {
      ...currentManifest,
      contracts: updatedContracts,
      stepRecords: updatedRecords,
      currentStepIndex: nextStepIndex,
      status: isCompleted ? ('completed' as const) : currentManifest.status,
    };

    const writeRes = await writeDeploymentManifest(updatedManifest, expectedVersion);
    if (!writeRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: writeRes.error,
          manifest: writeRes.manifest,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, manifest: writeRes.manifest });
  } catch (err: any) {
    console.error('[API /deployment/confirm POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}
