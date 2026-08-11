import { NextRequest, NextResponse } from 'next/server';
import { keccak256 } from 'viem';
import fs from 'fs';
import path from 'path';
import { validateReceiptFile } from '../../../../lib/evidence/fileValidator';

/**
 * Returns canonical VPS evidence storage root directory.
 * Environment variable: P2P_EVIDENCE_ROOT
 * Default: /var/lib/unifyvault/p2p-evidence (with fallback to workspace var dir if unprivileged dev environment)
 */
function getEvidenceStorageRoot(): string {
  const envRoot = process.env.P2P_EVIDENCE_ROOT;
  if (envRoot) {
    if (!fs.existsSync(envRoot)) {
      fs.mkdirSync(envRoot, { recursive: true });
    }
    return envRoot;
  }

  const defaultRoot = '/var/lib/unifyvault/p2p-evidence';
  try {
    if (!fs.existsSync(defaultRoot)) {
      fs.mkdirSync(defaultRoot, { recursive: true });
    }
    return defaultRoot;
  } catch {
    const fallbackRoot = path.join(process.cwd(), 'var', 'p2p-evidence');
    if (!fs.existsSync(fallbackRoot)) {
      fs.mkdirSync(fallbackRoot, { recursive: true });
    }
    return fallbackRoot;
  }
}

/**
 * POST /api/p2p/evidence
 * Stores exact original receipt bytes to VPS filesystem storage and returns evidenceHash & CID alias
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No receipt file provided in upload request.' },
        { status: 400 },
      );
    }

    // 1. Convert File to Uint8Array bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // 2. Validate File (Size, MIME, Magic Bytes)
    const fileValidation = validateReceiptFile({
      name: file.name,
      type: file.type,
      size: file.size,
      bytes,
    });

    if (!fileValidation.isValid) {
      return NextResponse.json(
        { success: false, error: fileValidation.errorMessage || 'Invalid receipt file.' },
        { status: 400 },
      );
    }

    // 3. Compute exact keccak256(bytes) for on-chain commitment anchor
    const evidenceHash = keccak256(bytes);

    // 4. Resolve VPS filesystem storage path
    const storageRoot = getEvidenceStorageRoot();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeFilename = `${evidenceHash}.${ext}`;
    const targetFilePath = path.resolve(storageRoot, safeFilename);
    const metadataFilePath = path.resolve(storageRoot, `${evidenceHash}.json`);

    // Path Traversal Security Check
    const resolvedRoot = path.resolve(storageRoot);
    if (!targetFilePath.startsWith(resolvedRoot)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Path traversal attempt blocked.' },
        { status: 403 },
      );
    }

    // 5. Write exact original bytes and metadata JSON to VPS filesystem
    await fs.promises.writeFile(targetFilePath, bytes);

    const metadata = {
      evidenceHash,
      cid: `vps-${evidenceHash}`,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      storedPath: safeFilename,
      createdAt: new Date().toISOString(),
    };

    await fs.promises.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf-8');

    // 6. Return response conforming to evidence interface
    return NextResponse.json({
      success: true,
      cid: `vps-${evidenceHash}`,
      evidenceHash,
      size: file.size,
      mimeType: file.type,
      name: file.name,
      url: `/api/p2p/evidence?hash=${evidenceHash}`,
    });
  } catch (err: any) {
    console.error('VPS evidence storage upload error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error storing evidence on VPS filesystem.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/p2p/evidence?hash=0x... or ?cid=vps-0x...
 * Serves stored evidence file directly from VPS filesystem with strict path traversal security checks
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hashParam = searchParams.get('hash') || searchParams.get('cid');

    if (!hashParam) {
      return NextResponse.json(
        { success: false, error: 'Missing evidence hash parameter.' },
        { status: 400 },
      );
    }

    // Clean hash string (strip vps- prefix if passed as CID)
    const cleanHash = hashParam.replace(/^vps-/, '').trim();

    // Strict regex validation to prevent path traversal
    if (!/^0x[a-fA-F0-9]{64}$/.test(cleanHash)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid evidence hash format. Must be a valid 32-byte hex hash.',
        },
        { status: 400 },
      );
    }

    const storageRoot = getEvidenceStorageRoot();
    const metadataFilePath = path.resolve(storageRoot, `${cleanHash}.json`);
    const resolvedRoot = path.resolve(storageRoot);

    if (!metadataFilePath.startsWith(resolvedRoot)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Path traversal attempt blocked.' },
        { status: 403 },
      );
    }

    if (!fs.existsSync(metadataFilePath)) {
      return NextResponse.json(
        { success: false, error: 'Evidence record not found on VPS storage.' },
        { status: 404 },
      );
    }

    const metadataContent = await fs.promises.readFile(metadataFilePath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    const fileContentPath = path.resolve(storageRoot, metadata.storedPath);
    if (!fileContentPath.startsWith(resolvedRoot) || !fs.existsSync(fileContentPath)) {
      return NextResponse.json(
        { success: false, error: 'Evidence file payload missing from VPS storage.' },
        { status: 404 },
      );
    }

    const fileBuffer = await fs.promises.readFile(fileContentPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': metadata.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(metadata.name || 'receipt')}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    console.error('VPS evidence retrieval error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error retrieving evidence file.' },
      { status: 500 },
    );
  }
}
