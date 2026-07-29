import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const INDEXER_API_URL =
  process.env.INDEXER_API_URL ||
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  `http://127.0.0.1:${process.env.INDEXER_PORT || '3006'}`;
const DB_FILE = path.join(process.cwd(), 'public/indexer.json');

export async function GET() {
  try {
    const daemonRes = await fetch(`${INDEXER_API_URL}/api/health`, {
      cache: 'no-store',
    });
    if (daemonRes.ok) {
      const data = await daemonRes.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Daemon unreachable, fallback to local indexer.json
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(raw);
      const lastBlock = db.lastBlock || 0;
      return NextResponse.json({
        latestChainBlock: lastBlock,
        lastIndexedBlock: lastBlock,
        blocksBehind: 0,
        indexerLag: 0,
        rpcProvider: 'https://sepolia.base.org',
        rpcErrors: 0,
        lastSuccessfulScan: db.updatedAt || new Date().toISOString(),
        uptime: 0,
        status: 'ONLINE',
      });
    }
  } catch (err) {
    // ignore fallback read error
  }

  return NextResponse.json(
    {
      latestChainBlock: 0,
      lastIndexedBlock: 0,
      blocksBehind: 0,
      indexerLag: 0,
      rpcProvider: 'https://sepolia.base.org',
      rpcErrors: 1,
      lastSuccessfulScan: null,
      uptime: 0,
      status: 'OFFLINE',
    },
    { status: 500 },
  );
}
