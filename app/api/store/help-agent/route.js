import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { gatherStoreHelpFacts, shouldOfferHelpExport } from '@/lib/storeHelpAgent';
import { polishStoreHelpReply } from '@/lib/storeHelpAgentReply';
import { helpHowToFallback, isHelpHowToQuestion, matchHelpHowTo } from '@/lib/storeHelpPages';
import { matchStoreHelpKnowledge } from '@/lib/storeHelpKnowledge';
import {
  extractProductQuery,
  isWebsiteHelpQuestion,
  mergeHelpDownloadContext,
  wantsCustomerListExport,
  wantsCustomerLookup,
  wantsPeriodSalesLookup,
  wantsProductSalesLookup,
} from '@/lib/storeHelpAgentFacts';
import {
  applyHelpAdminUnlockCookie,
  HELP_ADMIN_PIN_PROMPT,
  HELP_ADMIN_PIN_WRONG,
  pinGateHelpQuestion,
} from '@/lib/storeHelpAgentPin';

export const dynamic = 'force-dynamic';

async function requireSeller(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return { error: NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 }) };
    }
    return { storeId };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function POST(request) {
  try {
    const seller = await requireSeller(request);
    if (seller.error) return seller.error;

    const body = await request.json();
    const mergedQuestion = mergeHelpDownloadContext(body?.question, body?.priorQuestion);
    const gated = pinGateHelpQuestion(request, { ...body, question: mergedQuestion });
    const question = String(gated.question || '').trim();
    if (!question) {
      if (gated.pinWrong) {
        return NextResponse.json({
          answer: HELP_ADMIN_PIN_WRONG,
          links: [],
          readOnly: true,
          canExport: false,
          needsPin: true,
          pendingQuestion: String(body?.pendingQuestion || '').trim(),
        });
      }
      if (gated.unlockToken) {
        const response = NextResponse.json({
          answer: 'PIN accepted. Ask about sales or a customer.',
          links: [],
          readOnly: true,
          canExport: false,
        });
        return applyHelpAdminUnlockCookie(response, gated.unlockToken);
      }
      return NextResponse.json({ error: 'Enter a question.' }, { status: 400 });
    }
    if (question.length > 1200) {
      return NextResponse.json({ error: 'Keep the question under 1200 characters.' }, { status: 400 });
    }

    if (gated.needsPin) {
      return NextResponse.json({
        answer: gated.pinWrong ? HELP_ADMIN_PIN_WRONG : HELP_ADMIN_PIN_PROMPT,
        links: [],
        readOnly: true,
        canExport: false,
        needsPin: true,
        pendingQuestion: question,
        question,
      });
    }

    const searchTerms = extractProductQuery(question);
    const liveDataAsk = !isWebsiteHelpQuestion(question)
      && (
        wantsCustomerLookup(question)
        || wantsCustomerListExport(question)
        || wantsPeriodSalesLookup(question, searchTerms)
        || wantsProductSalesLookup(question, searchTerms)
      );
    const knowledge = liveDataAsk ? null : matchStoreHelpKnowledge(question);
    if (knowledge) {
      const response = NextResponse.json({
        answer: knowledge.answer,
        links: knowledge.links || [],
        readOnly: true,
        canExport: shouldOfferHelpExport({}, question),
        question,
      });
      return applyHelpAdminUnlockCookie(response, gated.unlockToken);
    }

    const howTo = liveDataAsk
      ? null
      : (matchHelpHowTo(question) || (isHelpHowToQuestion(question) ? helpHowToFallback() : null));
    if (howTo) {
      const response = NextResponse.json({
        answer: `${howTo.answer} Use Excel or PDF below to download these details.`,
        links: [{ label: howTo.label, href: howTo.href }],
        readOnly: true,
        canExport: true,
        question,
      });
      return applyHelpAdminUnlockCookie(response, gated.unlockToken);
    }

    await connectDB();
    const facts = await gatherStoreHelpFacts(seller.storeId, question);
    const reply = await polishStoreHelpReply(facts, question);
    const response = NextResponse.json({
      answer: reply.answer,
      links: reply.links || [],
      readOnly: true,
      canExport: Boolean(reply.canExport),
      question,
    });
    return applyHelpAdminUnlockCookie(response, gated.unlockToken);
  } catch (error) {
    console.error('[store/help-agent POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to check this question' }, { status: 500 });
  }
}
