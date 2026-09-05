import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VERSION_PATH = path.join(process.cwd(), 'public', 'version.json');

export async function GET() {
  try {
    if (!fs.existsSync(VERSION_PATH)) {
      return NextResponse.json({ error: 'version.json not found' }, { status: 404 });
    }
    const content = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
    return NextResponse.json(content.maintenance || { enabled: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!fs.existsSync(VERSION_PATH)) {
      return NextResponse.json({ error: 'version.json not found' }, { status: 404 });
    }

    const currentContent = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
    currentContent.maintenance = {
      ...currentContent.maintenance,
      ...body,
    };

    fs.writeFileSync(VERSION_PATH, JSON.stringify(currentContent, null, 2) + '\n', 'utf8');

    return NextResponse.json({ success: true, maintenance: currentContent.maintenance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
