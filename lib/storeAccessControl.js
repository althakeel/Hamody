import Store from '@/models/Store';
import StoreUser from '@/models/StoreUser';
import User from '@/models/User';
import authSeller from '@/middlewares/authSeller';
import { buildDeniedPermissions, getDefaultPermissions } from '@/lib/storePermissionDefaults';
import { canAccessDashboardArea } from '@/lib/storeDashboardPermissions';

export function mergeTeamPermissions(storeUser) {
  if (!storeUser) {
    return buildDeniedPermissions();
  }

  return {
    ...getDefaultPermissions(),
    ...(storeUser.permissions || {}),
  };
}

export async function findStoreUserMembership({ storeId, userId, email }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const orConditions = [{ userId: String(userId) }];

  if (normalizedEmail) {
    orConditions.push({ email: normalizedEmail });
  }

  return StoreUser.findOne({
    storeId: String(storeId),
    status: { $in: ['approved', 'pending', 'invited'] },
    $or: orConditions,
  })
    .select('role permissions email userId username')
    .lean();
}

export async function assertStoreOwner(userId) {
  const store = await Store.findOne({ userId: String(userId) }).select('_id userId').lean();
  if (!store) {
    const error = new Error('Only the store owner can perform this action');
    error.statusCode = 403;
    throw error;
  }
  return store;
}

export async function resolveDashboardAccess(userId, decodedToken = {}) {
  const storeId = await authSeller(userId, decodedToken?.email);
  if (!storeId) {
    return {
      isSeller: false,
      isOwner: false,
      storeId: null,
      accessRole: 'member',
      permissions: buildDeniedPermissions(),
    };
  }

  const store = await Store.findById(storeId).lean();
  const isOwner = Boolean(store?.userId && String(store.userId) === String(userId));

  if (isOwner) {
    return {
      isSeller: true,
      isOwner: true,
      storeId: String(storeId),
      store,
      accessRole: 'owner',
      permissions: getDefaultPermissions(),
    };
  }

  const tokenEmail = String(decodedToken?.email || '').trim().toLowerCase();
  const userProfile = await User.findById(userId).select('email').lean();
  const resolvedEmail = tokenEmail || String(userProfile?.email || '').trim().toLowerCase();

  let storeUser = await findStoreUserMembership({
    storeId,
    userId,
    email: resolvedEmail,
  });

  if (storeUser && !storeUser.userId) {
    await StoreUser.updateOne(
      { _id: storeUser._id },
      { $set: { userId: String(userId), status: 'approved' } }
    );
    storeUser = { ...storeUser, userId: String(userId), status: 'approved' };
  }

  const accessRole = storeUser?.role === 'admin' ? 'admin' : 'member';

  return {
    isSeller: true,
    isOwner: false,
    storeId: String(storeId),
    store,
    accessRole,
    permissions: mergeTeamPermissions(storeUser),
    storeUser,
  };
}

export function canUseProductAi(access = {}) {
  if (!access?.isSeller) return false;
  if (access.isOwner) return true;
  return canAccessDashboardArea(access.permissions, 'addProduct', { isOwner: false })
    || canAccessDashboardArea(access.permissions, 'manageProduct', { isOwner: false });
}

export async function requireStorePermission(userId, decodedToken = {}, permissionId = '') {
  const access = await resolveDashboardAccess(userId, decodedToken);
  if (!access.isSeller || !access.storeId) {
    return { error: 'Store not found', status: 404 };
  }
  if (permissionId && !canAccessDashboardArea(access.permissions, permissionId, { isOwner: access.isOwner })) {
    return { error: 'You do not have access to this area', status: 403 };
  }
  return { storeId: String(access.storeId), access };
}
