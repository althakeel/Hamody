import { NextResponse } from 'next/server';
import { getGoogleAuthPublicConfig } from '@/lib/googleAuthPublicConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getGoogleAuthPublicConfig();
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
