import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/adminEmails';
import LowStockAlertSettings from '@/models/LowStockAlertSettings';
import {
  getDefaultLowStockAlertSettings,
  normalizeLowStockAlertSettings,
  parseLowStockRecipients,
  validateLowStockAlertSettings,
} from '@/lib/lowStockAlertSettings';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin(request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(authorization.slice('Bearer '.length));
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isAdminEmail(decoded.email)) {
    return { error: NextResponse.json({ error: 'Only the super admin can manage low-stock alerts.' }, { status: 403 }) };
  }
  return { decoded };
}

export async function GET(request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (admin.error) return admin.error;

    await connectDB();
    const saved = await LowStockAlertSettings.findById('global').lean();
    return NextResponse.json({
      settings: normalizeLowStockAlertSettings(saved || getDefaultLowStockAlertSettings()),
    });
  } catch (error) {
    console.error('[store/settings/low-stock-alerts GET]', error);
    return NextResponse.json({ error: 'Failed to load low-stock alert settings.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (admin.error) return admin.error;

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }
    const validationError = validateLowStockAlertSettings(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await connectDB();
    const settings = normalizeLowStockAlertSettings({
      enabled: body.enabled,
      threshold: Number(body.threshold),
      intervalHours: Number(body.intervalHours),
      recipients: parseLowStockRecipients(body.recipients),
    });
    const saved = await LowStockAlertSettings.findOneAndUpdate(
      { _id: 'global' },
      { $set: { ...settings, updatedBy: admin.decoded.email || '' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json({
      settings: normalizeLowStockAlertSettings(saved),
      message: 'Low-stock alert settings saved.',
    });
  } catch (error) {
    console.error('[store/settings/low-stock-alerts PATCH]', error);
    return NextResponse.json({ error: 'Failed to save low-stock alert settings.' }, { status: 500 });
  }
}
