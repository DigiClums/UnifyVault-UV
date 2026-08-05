import { NextResponse } from 'next/server';

export interface NavSnapshot {
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  nav: number;
  totalAssets: number;
  totalSupply: number;
  btcPrice: number;
  ethPrice: number;
  btcWeight: number;
  ethWeight: number;
  sharePrice: number;
}

const INDEXER_API_URL =
  process.env.INDEXER_API_URL ||
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  `http://127.0.0.1:${process.env.INDEXER_PORT || '3006'}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'ALL';
  const chainId = searchParams.get('chainId') || '84532';

  // 1. Fetch from Indexer Daemon service with chainId filter
  try {
    const daemonRes = await fetch(
      `${INDEXER_API_URL}/api/nav/history?period=${period}&chainId=${chainId}`,
      {
        cache: 'no-store',
      },
    );
    if (daemonRes.ok) {
      const data = await daemonRes.json();
      if (Array.isArray(data)) {
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, max-age=10, s-maxage=30',
          },
        });
      }
    }
  } catch (e) {
    // Daemon unreachable
  }

  return NextResponse.json([], { status: 200 });
}
