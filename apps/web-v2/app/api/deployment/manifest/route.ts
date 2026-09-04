export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import {
  readDeploymentManifest,
  writeDeploymentManifest,
} from '../../../../lib/deployment/manifestStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? Number(chainIdParam) : 84532;

    const manifest = await readDeploymentManifest(chainId);
    return NextResponse.json({ success: true, manifest });
  } catch (err: any) {
    console.error('[API /deployment/manifest GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { manifest, expectedVersion } = body;

    if (!manifest || !manifest.chainId) {
      return NextResponse.json(
        { success: false, error: 'Missing manifest or chainId.' },
        { status: 400 },
      );
    }

    const result = await writeDeploymentManifest(manifest, expectedVersion);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, manifest: result.manifest },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, manifest: result.manifest });
  } catch (err: any) {
    console.error('[API /deployment/manifest POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? Number(chainIdParam) : 84532;

    const emptyManifest = {
      manifestVersion: 1,
      chainId,
      network: chainId === 8453 ? 'Base Mainnet' : 'Base Sepolia',
      deploymentVersion: 'V2',
      protocolVersion: '2.0.0',
      deployer: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
      status: 'in_progress' as const,
      isLocked: false,
      currentStepIndex: 0,
      totalSteps: 55,
      contracts: {},
      stepRecords: {},
      verificationResults: [],
      lastUpdated: Date.now(),
    };

    const result = await writeDeploymentManifest(emptyManifest);
    return NextResponse.json({ success: true, manifest: result.manifest });
  } catch (err: any) {
    console.error('[API /deployment/manifest DELETE] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}
