import { NextResponse } from 'next/server';

const INDEXER_API_URL =
  process.env.INDEXER_API_URL ||
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  `http://127.0.0.1:${process.env.INDEXER_PORT || '3006'}`;

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
  } catch {
    // Daemon unreachable
  }

  return NextResponse.json(
    { error: 'Production indexer service is currently offline or unreachable.' },
    { status: 503 },
  );
}
