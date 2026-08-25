export const dynamic = "force-static";
import { NextRequest, NextResponse } from 'next/server';
import {
  readDeploymentManifest,
  writeDeploymentManifest,
} from '../../../../lib/deployment/manifestStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainId, expectedVersion } = body;

    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid chainId' }, { status: 400 });
    }

    const currentManifest = await readDeploymentManifest(chainId);

    if (currentManifest.isLocked) {
      return NextResponse.json({
        success: true,
        manifest: currentManifest,
        message: 'Already locked',
      });
    }

    const lockedManifest = {
      ...currentManifest,
      isLocked: true,
      status: 'locked' as const,
      lockedAt: Date.now(),
    };

    const writeRes = await writeDeploymentManifest(lockedManifest, expectedVersion);
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
    console.error('[API /deployment/lock POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}
