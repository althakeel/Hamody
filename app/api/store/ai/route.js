import { canUseProductAi, resolveDashboardAccess } from '@/lib/storeAccessControl';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { isProductAiConfigured, runProductAutofill } from '@/lib/runProductAutofill';
import {
    getAiErrorMessage,
    getAiErrorStatus,
} from '@/lib/aiProviderErrors';
import { getProductAiRuntimeConfig } from '@/lib/productAiConfig';
import { runInProductAiQueue } from '@/lib/aiRequestQueue';
import { loadProductImageForAi } from '@/lib/loadProductImageForAi';
import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function normalizeBase64Input(base64Image, mimeType) {
    const normalizedMime = String(mimeType || 'image/jpeg').split(';')[0].trim().toLowerCase();
    const normalizedBase64 = String(base64Image || '').trim();

    if (!normalizedBase64 || !normalizedMime.startsWith('image/')) {
        throw new Error('A valid product image is required for AI autofill.');
    }

    const estimatedBytes = Math.ceil((normalizedBase64.length * 3) / 4);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
        throw new Error('Image is too large for AI autofill. Upload a smaller image and try again.');
    }

    return {
        base64Image: normalizedBase64,
        mimeType: normalizedMime,
    };
}

export async function POST(request) {
    try {
        if (!isProductAiConfigured()) {
            return NextResponse.json({ error: 'AI is disabled (set GEMINI_API_KEY or OPENAI_API_KEY)' }, { status: 503 });
        }

        const authHeader = request.headers.get('authorization');
        let userId = null;
        let decodedToken = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            try {
                const { getAuth } = await import('@/lib/firebase-admin');
                const adminAuth = getAuth();
                decodedToken = await adminAuth.verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (e) {
                return NextResponse.json({ error: 'Auth verification failed', detail: e.message }, { status: 401 });
            }
        }

        const access = await resolveDashboardAccess(userId, decodedToken || {});
        if (!canUseProductAi(access)) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        await connectDB();
        const storeCategories = await Category.find({}).select('_id name').sort({ name: 1 }).lean();

        const body = await request.json();
        const {
            base64Image,
            mimeType,
            imageUrl,
            additionalContext,
            includeArabic,
        } = body || {};

        let resolvedImage;
        if (imageUrl) {
            resolvedImage = await loadProductImageForAi(imageUrl);
        } else if (base64Image && mimeType) {
            resolvedImage = normalizeBase64Input(base64Image, mimeType);
        } else {
            return NextResponse.json(
                { error: 'Upload a product image first, then run AI autofill.' },
                { status: 400 }
            );
        }

        const result = await runInProductAiQueue(() => runProductAutofill({
            base64Image: resolvedImage.base64Image,
            mimeType: resolvedImage.mimeType,
            additionalContext: additionalContext || '',
            includeArabic: Boolean(includeArabic),
            storeCategories,
        }));
        return NextResponse.json(result);
    } catch (error) {
        console.error('[API /store/ai]', error);
        const runtime = getProductAiRuntimeConfig();
        const provider = error?.provider || runtime.activeProviders[0] || runtime.preference;
        const safeStatus = getAiErrorStatus(error);
        const message = getAiErrorMessage(error, provider);

        return NextResponse.json(
            {
                error: message,
                provider,
                attemptedProviders: error?.attemptedProviders || [provider],
                retryable: safeStatus === 429,
            },
            {
                status: safeStatus,
                headers: safeStatus === 429 ? { 'Retry-After': '60' } : undefined,
            }
        );
    }
}
