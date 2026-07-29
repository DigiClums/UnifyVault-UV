import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
const NAV_DB_FILE = path.join(process.cwd(), 'public/historical-nav.json');

function filterSnapshotsByPeriod(snapshots: NavSnapshot[], period: string): NavSnapshot[] {
  if (!Array.isArray(snapshots)) return [];

  // Deduplicate and sort chronologically
  const map = new Map<string, NavSnapshot>();
  for (const s of snapshots) {
    const key = `${s.blockNumber}-${s.timestamp}`;
    if (!map.has(key)) {
      map.set(key, s);
    }
  }

  const sorted = Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const p = period.toUpperCase();
  if (p === 'ALL') return sorted;

  let periodMs = 0;
  if (p === '1D') periodMs = 24 * 3600 * 1000;
  else if (p === '7D') periodMs = 7 * 24 * 3600 * 1000;
  else if (p === '30D') periodMs = 30 * 24 * 3600 * 1000;
  else if (p === '90D') periodMs = 90 * 24 * 3600 * 1000;
  else return sorted;

  const cutoff = Date.now() - periodMs;
  return sorted.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'ALL';

  // 1. Try fetching from Indexer Daemon service
  try {
    const daemonRes = await fetch(`${INDEXER_API_URL}/api/nav/history?period=${period}`, {
      cache: 'no-store',
    });
    if (daemonRes.ok) {
      const data = await daemonRes.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, max-age=10, s-maxage=30',
          },
        });
      }
    }
  } catch (e) {
    // Daemon un-reachable, fallback to local storage
  }

  // 2. Fallback to local historical-nav.json file storage
  try {
    if (fs.existsSync(NAV_DB_FILE)) {
      const raw = fs.readFileSync(NAV_DB_FILE, 'utf8');
      const snapshots: NavSnapshot[] = JSON.parse(raw);
      const filtered = filterSnapshotsByPeriod(snapshots, period);
      return NextResponse.json(filtered, {
        headers: {
          'Cache-Control': 'public, max-age=10, s-maxage=30',
        },
      });
    }
  } catch (err) {
    console.error('Failed to read historical-nav.json storage:', err);
  }

  return NextResponse.json([], { status: 200 });
}
