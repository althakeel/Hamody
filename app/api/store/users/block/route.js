import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StoreUser from '@/models/StoreUser';
import { getAuth } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/adminEmails';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isAdminEmail(decoded.email)) {
    return { error: NextResponse.json({ error: 'Only the super admin can block accounts' }, { status: 403 }) };
  }

  return { decoded };
}

export async function POST(request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const blocked = body.blocked !== false;
    const email = String(body.email || body.accountEmail || '').trim().toLowerCase();
    let uid = String(body.uid || '').trim();
    const adminAuth = getAuth();

    if (!uid && email) {
      try {
        const found = await adminAuth.getUserByEmail(email);
        uid = found.uid;
      } catch {
        uid = '';
      }
    }

    if (!uid) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    if (uid === auth.decoded.uid) {
      return NextResponse.json({ error: 'You cannot block your own account' }, { status: 400 });
    }

    let account;
    try {
      account = await adminAuth.getUser(uid);
    } catch {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const accountEmail = String(account.email || email).trim().toLowerCase();
    if (isAdminEmail(accountEmail)) {
      return NextResponse.json({ error: 'The super admin account cannot be blocked' }, { status: 400 });
    }

    await adminAuth.updateUser(uid, { disabled: blocked });
    if (blocked) {
      try {
        await adminAuth.revokeRefreshTokens(uid);
      } catch {
        // The account is already disabled. Existing sessions expire on the next refresh.
      }
    }

    await connectDB();
    if (accountEmail) {
      await StoreUser.updateMany(
        { $or: [{ userId: uid }, { email: accountEmail }] },
        { $set: { status: blocked ? 'blocked' : 'approved', userId: uid } },
      );
    }

    return NextResponse.json({
      ok: true,
      blocked,
      email: accountEmail,
      message: blocked
        ? 'Account blocked. They cannot sign in.'
        : 'Account unblocked. They can sign in again.',
    });
  } catch (error) {
    console.error('[admin-block-account] failed', error?.code || error?.message || 'unknown');
    return NextResponse.json({ error: 'Could not update this account' }, { status: 500 });
  }
}
