import { NextResponse } from 'next/server';

const INDEXER_API_URL =
  process.env.INDEXER_API_URL ||
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  `http://127.0.0.1:${process.env.INDEXER_PORT || '3006'}`;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

export async function GET() {
  try {
    const daemonRes = await fetch(`${INDEXER_API_URL}/api/health`, {
      cache: 'no-store',
    });
    if (daemonRes.ok) {
      const data = await daemonRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Daemon unreachable
  }

  return NextResponse.json(
    {
      latestChainBlock: 0,
      lastIndexedBlock: 0,
      blocksBehind: 0,
      indexerLag: 0,
      rpcProvider: RPC_URL,
      rpcErrors: 1,
      lastSuccessfulScan: null,
      uptime: 0,
      status: 'OFFLINE',
    },
    { status: 500 },
  );
}
