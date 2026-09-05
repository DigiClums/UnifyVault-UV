import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';
export const revalidate = 0;

const VERSION_PATH = path.join(process.cwd(), 'public', 'version.json');

export async function GET() {
  try {
    if (!fs.existsSync(VERSION_PATH)) {
      return NextResponse.json({ enabled: false });
    }
    const content = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
    return NextResponse.json(content.maintenance || { enabled: false }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ enabled: false, error: err.message }, { status: 500 });
  }
}
