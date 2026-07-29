import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const INDEXER_API_URL =
  process.env.INDEXER_API_URL ||
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  `http://127.0.0.1:${process.env.INDEXER_PORT || '3006'}`;

const DB_FILE = path.join(process.cwd(), 'public/indexer.json');

export async function GET(request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params;
  const pathName = params.slug ? params.slug.join('/') : '';
  const url = new URL(request.url);
  const search = url.search;

  try {
    const daemonRes = await fetch(`${INDEXER_API_URL}/api/indexer/${pathName}${search}`, {
      cache: 'no-store',
    });
    if (daemonRes.ok) {
      const data = await daemonRes.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Daemon unreachable, fallback to local file
  }

  // Fallback to local public/indexer.json for known routes
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(raw);
      if (pathName === 'stats') {
        return NextResponse.json({
          latestChainBlock: db.lastBlock || 0,
          lastBlock: db.lastBlock || 0,
          lastIndexedBlock: db.lastBlock || 0,
          blocksBehind: 0,
          indexerLag: 0,
          rpcProvider: 'https://sepolia.base.org',
          rpcErrors: 0,
          lastSuccessfulScan: db.updatedAt || new Date().toISOString(),
          uptime: 0,
          status: 'ONLINE',
          depositsCount: (db.deposits || []).length,
          redeemsCount: (db.redeems || []).length,
          transfersCount: (db.transfers || []).length,
          feesCount: (db.fees || []).length,
          oracleUpdatesCount: (db.oracleUpdates || []).length,
          rebalancesCount: (db.rebalances || []).length,
          navSnapshotsCount: (db.navSnapshots || []).length,
          usersCount: Object.keys(db.users || {}).length,
          updatedAt: db.updatedAt || new Date().toISOString(),
        });
      } else if (pathName === 'events') {
        return NextResponse.json({
          deposits: db.deposits || [],
          redeems: db.redeems || [],
          transfers: db.transfers || [],
          fees: db.fees || [],
          oracleUpdates: db.oracleUpdates || [],
          rebalances: db.rebalances || [],
        });
      } else if (pathName === 'tvl') {
        return NextResponse.json(db.tvlSnapshots || []);
      } else if (pathName === 'nav') {
        return NextResponse.json(db.navSnapshots || []);
      }
    }
  } catch (err) {
    // ignore
  }

  return NextResponse.json({ error: 'Indexer data unavailable' }, { status: 503 });
}
