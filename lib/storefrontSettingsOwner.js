import dbConnect from '@/lib/mongodb';
import NavbarMenuSettings from '@/models/NavbarMenuSettings';

const DEFAULT_NAVBAR_BROWN = '#8f3404';

function hasSavedNavbar(doc) {
  if (!doc) return false;
  if (String(doc.logoUrl || '').trim()) return true;
  const color = String(doc.backgroundColor || '').trim().toLowerCase();
  if (color && color !== DEFAULT_NAVBAR_BROWN) return true;
  if (Array.isArray(doc.navMenuItems) && doc.navMenuItems.length > 0) return true;
  if (Array.isArray(doc.items) && doc.items.length > 0) return true;
  return false;
}

/** One store, one settings record: the approved store owner, not the account that is signed in. */
export async function resolveStorefrontOwnerId(userId = '') {
  await dbConnect();
  const Store = (await import('@/models/Store')).default;
  const uid = String(userId || '').trim();

  if (uid) {
    const owned = await Store.findOne({ userId: uid, status: { $ne: 'rejected' } })
      .select('userId')
      .lean();
    if (owned?.userId) return String(owned.userId);

    try {
      const authSeller = (await import('@/middlewares/authSeller')).default;
      const storeObjectId = await authSeller(uid);
      if (storeObjectId) {
        const store = await Store.findById(storeObjectId).select('userId').lean();
        if (store?.userId) return String(store.userId);
      }
    } catch {
      // Fall through to the approved store.
    }
  }

  const approved = await Store.findOne({ status: 'approved' })
    .sort({ updatedAt: -1 })
    .select('userId')
    .lean();
  return String(approved?.userId || uid || '').trim();
}

/**
 * The approved store has one navbar document.
 * Another account's newer copy must not become the live menu or colors.
 */
export async function findSharedNavbarSettings(ownerId = '') {
  const ownerKey = String(ownerId || '').trim() || await resolveStorefrontOwnerId('');
  if (!ownerKey) return null;
  const owned = await NavbarMenuSettings.find({ storeId: ownerKey })
    .sort({ updatedAt: -1, _id: -1 })
    .lean();
  return owned.find(hasSavedNavbar) || null;
}

/** An open editor must not overwrite a newer save from another person. */
export function navbarSaveIsStale(existing, loadedAt) {
  if (!loadedAt || !existing?.updatedAt) return false;
  const loaded = new Date(loadedAt).getTime();
  const current = new Date(existing.updatedAt).getTime();
  if (!Number.isFinite(loaded) || !Number.isFinite(current)) return false;
  return current > loaded + 1500;
}
