import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { gatherStoreHelpExport } from '@/lib/storeHelpAgent';
import { mergeHelpDownloadContext } from '@/lib/storeHelpAgentFacts';
import {
  buildHelpExportPdf,
  getHelpExportFileName,
  hasExportableHelpPayload,
  writeHelpExportWorkbook,
} from '@/lib/storeHelpAgentExport';
import {
  applyHelpAdminUnlockCookie,
  HELP_ADMIN_PIN_PROMPT,
  pinGateHelpQuestion,
} from '@/lib/storeHelpAgentPin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 });
    }

    const body = await request.json();
    const mergedQuestion = mergeHelpDownloadContext(body?.question, body?.priorQuestion);
    const gated = pinGateHelpQuestion(request, { ...body, question: mergedQuestion });
    const question = String(gated.question || '').trim();
    const format = String(body?.format || 'xlsx').toLowerCase() === 'pdf' ? 'pdf' : 'xlsx';
    if (!question) {
      return NextResponse.json({ error: 'Enter a question to export.' }, { status: 400 });
    }
    if (gated.needsPin) {
      return NextResponse.json({ error: HELP_ADMIN_PIN_PROMPT, needsPin: true }, { status: 403 });
    }

    await connectDB();
    const payload = await gatherStoreHelpExport(storeId, question);
    if (!hasExportableHelpPayload(payload)) {
      return NextResponse.json({ error: 'No details to export for that question.' }, { status: 404 });
    }

    const exportPayload = { ...payload, question };
    const buffer = format === 'pdf'
      ? buildHelpExportPdf(exportPayload)
      : await writeHelpExportWorkbook(exportPayload);
    const fileName = getHelpExportFileName(payload, format);

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    return applyHelpAdminUnlockCookie(response, gated.unlockToken);
  } catch (error) {
    console.error('[store/help-agent/export POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to export help details' }, { status: 500 });
  }
}
