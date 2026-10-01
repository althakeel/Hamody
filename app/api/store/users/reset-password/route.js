import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import StoreUser from '@/models/StoreUser';
import { getAuth } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/adminEmails';
import { validatePasswordStrength } from '@/lib/passwordPolicy';
import authSeller from '@/middlewares/authSeller';
import { resolveDashboardAccess } from '@/lib/storeAccessControl';

export const dynamic = 'force-dynamic';

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  const access = await resolveDashboardAccess(decoded.uid, decoded);
  if (!isAdminEmail(decoded.email) && !access.isOwner) {
    return { error: NextResponse.json({ error: 'Only the super admin or store owner can reset passwords' }, { status: 403 }) };
  }

  return { decoded, isOwner: Boolean(access.isOwner) };
}

function accountRow({ uid, name, email, kind }) {
  const id = String(uid || '').trim();
  const mail = String(email || '').trim().toLowerCase();
  if (!id || !mail) return null;
  return {
    uid: id,
    name: String(name || '').trim() || mail.split('@')[0],
    email: mail,
    kind,
  };
}

export async function GET(request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const query = String(new URL(request.url).searchParams.get('q') || '').trim();
    if (query.length < 3) {
      return NextResponse.json({ users: [] });
    }

    await connectDB();
    const storeId = await authSeller(auth.decoded.uid);
    const pattern = new RegExp(escapeRegex(query), 'i');
    const rows = new Map();

    const add = (row) => {
      if (!row) return;
      const existing = rows.get(row.uid);
      if (!existing || (existing.kind === 'customer' && row.kind === 'team')) {
        rows.set(row.uid, row);
      }
    };

    const customers = await User.find({
      $or: [{ email: pattern }, { name: pattern }],
    })
      .select('_id name email firebaseUid')
      .limit(12)
      .lean();

    customers.forEach((user) => {
      add(accountRow({
        uid: user.firebaseUid || user._id,
        name: user.name,
        email: user.email,
        kind: 'customer',
      }));
    });

    if (storeId) {
      const members = await StoreUser.find({
        storeId,
        email: pattern,
      })
        .select('userId email username')
        .limit(12)
        .lean();

      members.forEach((member) => {
        add(accountRow({
          uid: member.userId,
          name: member.username,
          email: member.email,
          kind: 'team',
        }));
      });
    }

    if (query.includes('@')) {
      try {
        const firebaseUser = await getAuth().getUserByEmail(query.toLowerCase());
        add(accountRow({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          kind: rows.has(firebaseUser.uid) ? rows.get(firebaseUser.uid).kind : 'account',
        }));
      } catch {
        // No exact Firebase account for this email.
      }
    }

    const users = [...rows.values()].slice(0, 12);
    const adminAuth = getAuth();
    await Promise.all(users.map(async (user) => {
      try {
        const record = await adminAuth.getUser(user.uid);
        user.blocked = Boolean(record.disabled);
      } catch {
        user.blocked = false;
      }
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[admin-password-reset] search failed', error?.message || error);
    return NextResponse.json({ error: 'Could not search accounts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const uid = String(body.uid || '').trim();
    const password = String(body.password || '');
    const policy = validatePasswordStrength(password);
    if (!uid) {
      return NextResponse.json({ error: 'Choose an account first' }, { status: 400 });
    }
    if (!policy.ok) {
      return NextResponse.json({ error: policy.message }, { status: 400 });
    }

    const adminAuth = getAuth();
    let account;
    try {
      account = await adminAuth.getUser(uid);
    } catch {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await adminAuth.updateUser(uid, { password });
    try {
      await adminAuth.revokeRefreshTokens(uid);
    } catch {
      // The new password is already saved. Old sessions can expire on their own.
    }

    const recipient = String(account.email || '').trim().toLowerCase();
    let emailSent = false;
    if (recipient) {
      try {
        const storeId = await authSeller(auth.decoded.uid);
        const { sendPasswordChangedEmail } = await import('@/lib/email');
        await sendPasswordChangedEmail({
          email: recipient,
          name: account.displayName,
          storeId,
        });
        emailSent = true;
      } catch (mailError) {
        console.error('[admin-password-reset] notice email failed', mailError?.message || mailError);
      }
    }

    return NextResponse.json({
      ok: true,
      email: recipient,
      emailSent,
      message: emailSent
        ? 'Password updated. An email was sent to that person.'
        : 'Password updated, but the notice email could not be sent.',
    });
  } catch (error) {
    console.error('[admin-password-reset] update failed', error?.code || error?.message || 'unknown');
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
  }
}
