import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/adminEmails';
import LowStockAlertSettings from '@/models/LowStockAlertSettings';
import {
  getDefaultLowStockAlertSettings,
  normalizeCustomLowStockProducts,
  normalizeLowStockAlertSettings,
  parseLowStockRecipients,
  validateLowStockAlertSettings,
} from '@/lib/lowStockAlertSettings';
import { runCustomLowStockDigest, runLowStockDigest } from '@/lib/lowStockDigest';
import { requireStorePermission } from '@/lib/storeAccessControl';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Super admin, store owner, or member with Stock Alerts permission. */
async function requireStockAlertsAccess(request) {
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

  if (isAdminEmail(decoded.email)) {
    return { decoded, isSuperAdmin: true };
  }

  const seller = await requireStorePermission(decoded.uid, decoded, 'stockAlerts');
  if (seller.error) {
    return {
      error: NextResponse.json(
        { error: seller.error === 'You do not have access to this area'
          ? 'You do not have Stock Alerts access. Ask an admin to enable it in Team Access.'
          : seller.error },
        { status: seller.status || 403 },
      ),
    };
  }

  return {
    decoded,
    isSuperAdmin: false,
    isOwner: Boolean(seller.access?.isOwner),
    storeId: seller.storeId,
  };
}

function buildSettingsFromBody(body = {}) {
  return normalizeLowStockAlertSettings({
    enabled: body.enabled,
    threshold: Number(body.threshold),
    intervalHours: Number(body.intervalHours),
    recipients: parseLowStockRecipients(body.recipients),
    customEnabled: body.customEnabled,
    customThreshold: Number(body.customThreshold),
    customIntervalHours: Number(body.customIntervalHours),
    customRecipients: parseLowStockRecipients(body.customRecipients),
    customProducts: normalizeCustomLowStockProducts(body.customProducts),
  });
}

function sendNowMessage(result, label) {
  if (!result?.skipped) {
    return `${label} sent to ${(result.sendResult?.to || []).join(', ') || 'recipients'} (${result.itemCount} item(s)).`;
  }
  if (result.reason === 'no_low_stock_items') {
    return `No ${label.toLowerCase()} items are currently below ${result.threshold} units.`;
  }
  if (result.reason === 'disabled' || result.reason === 'custom_disabled') {
    return `Enable ${label.toLowerCase()}, save settings, then try Send now.`;
  }
  if (result.reason === 'no_custom_products') {
    return 'Add at least one custom product, save, then try Send now.';
  }
  return `${label} was not sent (${result.reason}).`;
}

export async function GET(request) {
  try {
    const access = await requireStockAlertsAccess(request);
    if (access.error) return access.error;

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
    const access = await requireStockAlertsAccess(request);
    if (access.error) return access.error;

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }
    const validationError = validateLowStockAlertSettings(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await connectDB();
    const settings = buildSettingsFromBody(body);
    const saved = await LowStockAlertSettings.findOneAndUpdate(
      { _id: 'global' },
      { $set: { ...settings, updatedBy: access.decoded.email || '' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json({
      settings: normalizeLowStockAlertSettings(saved),
      message: 'Stock alert settings saved.',
    });
  } catch (error) {
    console.error('[store/settings/low-stock-alerts PATCH]', error);
    return NextResponse.json({ error: 'Failed to save low-stock alert settings.' }, { status: 500 });
  }
}

/** Super Admin: send catalog/custom alert now, or a lightweight test email. */
export async function POST(request) {
  try {
    const access = await requireStockAlertsAccess(request);
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    if (
      action !== 'sendNow'
      && action !== 'sendNowCustom'
      && action !== 'sendTestCustom'
      && action !== 'sendTest'
    ) {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    if (action === 'sendTestCustom' || action === 'sendTest') {
      const isCustom = action === 'sendTestCustom';
      await connectDB();
      const saved = await LowStockAlertSettings.findById('global').lean();
      const settings = normalizeLowStockAlertSettings(saved || getDefaultLowStockAlertSettings());
      const fromBody = parseLowStockRecipients(
        isCustom ? body.customRecipients : body.recipients,
      );
      const recipients = fromBody.length
        ? fromBody
        : (isCustom ? settings.customRecipients : settings.recipients);

      if (!recipients.length) {
        return NextResponse.json({
          success: false,
          message: 'Add at least one recipient email before sending a test.',
        });
      }

      const { sendAdminLowStockDigestEmail } = await import('@/lib/email');
      const sendResult = await sendAdminLowStockDigestEmail({
        items: [{
          productId: 'test',
          name: 'TEST — Stock alert email is working',
          sku: 'TEST-SKU',
          stock: 0,
          variant: 'This is a test message from Store1920 settings',
        }],
        threshold: isCustom ? settings.customThreshold : settings.threshold,
        intervalHours: isCustom ? settings.customIntervalHours : settings.intervalHours,
        slotKey: `test-${isCustom ? 'custom' : 'catalog'}-${Date.now()}`,
        recipients,
        mode: isCustom ? 'custom' : 'catalog',
      });

      return NextResponse.json({
        success: true,
        test: true,
        sendResult,
        message: `Test ${isCustom ? 'custom' : 'catalog'} stock alert emailed to ${recipients.join(', ')}.`,
      });
    }

    const isCustom = action === 'sendNowCustom';
    const result = isCustom
      ? await runCustomLowStockDigest({ force: true })
      : await runLowStockDigest({ force: true });
    const label = isCustom ? 'Custom stock alert' : 'Catalog low-stock alert';
    const message = sendNowMessage(result, label);

    return NextResponse.json({
      success: !result.skipped,
      ...result,
      message,
    });
  } catch (error) {
    console.error('[store/settings/low-stock-alerts POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send low-stock alert.' },
      { status: 500 },
    );
  }
}
