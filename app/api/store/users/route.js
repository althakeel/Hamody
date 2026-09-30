import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import StoreUser from '@/models/StoreUser';
import User from '@/models/User';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { resolveDashboardAccess } from '@/lib/storeAccessControl';
import { canAccessDashboardArea } from '@/lib/storeDashboardPermissions';

function usableProfileName(value = '') {
  const name = String(value || '').trim();
  if (!name || name.toLowerCase() === 'unknown') return '';
  return name;
}

async function attachMemberProfileNames(members = []) {
  const ids = [...new Set(members.map((member) => String(member.userId || '').trim()).filter(Boolean))];
  const profiles = ids.length
    ? await User.find({ _id: { $in: ids } }).select('name email').lean()
    : [];
  const namesById = new Map(
    profiles.map((profile) => [String(profile._id), usableProfileName(profile.name)]),
  );

  const missingIds = ids.filter((id) => !namesById.get(id));
  if (missingIds.length) {
    try {
      const auth = getAuth();
      for (let index = 0; index < missingIds.length; index += 100) {
        const chunk = missingIds.slice(index, index + 100);
        const result = await auth.getUsers(chunk.map((uid) => ({ uid })));
        (result.users || []).forEach((user) => {
          const name = usableProfileName(user.displayName);
          if (name) namesById.set(user.uid, name);
        });
      }
    } catch {
      // Team list still loads if Firebase profile names are unavailable.
    }
  }

  return members.map((member) => ({
    ...member,
    name: namesById.get(String(member.userId || '').trim()) || '',
  }));
}

function buildDashboardAccessUsers(store, teamMembers = [], ownerProfile = null) {
  const users = [];

  if (store?.userId) {
    const ownerName = String(ownerProfile?.name || '').trim();
    const ownerEmail = String(ownerProfile?.email || '').trim();

    users.push({
      id: String(store.userId),
      userId: String(store.userId),
      name: ownerName && ownerName.toLowerCase() !== 'unknown'
        ? ownerName
        : (ownerEmail ? ownerEmail.split('@')[0] : 'Store owner'),
      email: ownerEmail,
      role: 'owner',
      label: `${ownerName && ownerName.toLowerCase() !== 'unknown' ? ownerName : (ownerEmail || 'Store owner')} (Owner)`,
    });
  }

  teamMembers.forEach((member) => {
    if (member.permissions?.abandonedCheckout === false) return;

    const username = String(member.username || '').trim();
    const email = String(member.email || '').trim();
    const displayName = usableProfileName(member.name) || username || (email ? email.split('@')[0] : 'Team member');
    const roleLabel = member.role === 'admin' ? 'Admin' : 'Team member';

    users.push({
      id: member.userId ? String(member.userId) : String(member._id),
      userId: member.userId ? String(member.userId) : null,
      storeUserId: String(member._id),
      name: displayName,
      email,
      role: member.role || 'member',
      label: `${displayName} (${roleLabel})`,
    });
  });

  return users;
}

export async function GET(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Resolve storeId for owners or team members
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const store = await Store.findById(storeId).lean();
    const access = await resolveDashboardAccess(userId, decodedToken);
    const isOwner = Boolean(access.isOwner);

    const teamMembers = await attachMemberProfileNames(await StoreUser.find({
      storeId: storeId,
      status: 'approved',
    }).lean());

    const ownerProfile = store?.userId
      ? await User.findById(store.userId).select('name email').lean()
      : null;
    const dashboardAccessUsers = buildDashboardAccessUsers(store, teamMembers, ownerProfile);

    if (!isOwner) {
      const canUseAbandonedCheckout = canAccessDashboardArea(
        access.permissions,
        'abandonedCheckout',
        { isOwner: false }
      );

      if (!canUseAbandonedCheckout) {
        return NextResponse.json({ error: 'You do not have permission to view team users' }, { status: 403 });
      }

      return NextResponse.json({ dashboardAccessUsers });
    }

    // Fetch pending invites (owner only)
    const pending = await StoreUser.find({
      storeId: storeId,
      status: { $in: ['invited', 'pending'] },
    }).lean();

    return NextResponse.json({
      users: teamMembers.map((u) => ({ ...u, id: u._id.toString(), _id: u._id.toString() })),
      pending: pending.map((p) => ({ ...p, id: p._id.toString(), _id: p._id.toString() })),
      dashboardAccessUsers,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
