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
 * Prefer the owner's saved navbar. An empty row created by another login
 * must not replace the logo, colors, or menu with defaults.
 */
export async function findSharedNavbarSettings(ownerId = '') {
  const ownerKey = String(ownerId || '').trim();
  if (ownerKey) {
    const owned = await NavbarMenuSettings.find({ storeId: ownerKey })
      .sort({ updatedAt: -1, _id: -1 })
      .lean();
    const saved = owned.find(hasSavedNavbar);
    if (saved) return saved;
  }

  const savedAnywhere = await NavbarMenuSettings.find({})
    .sort({ updatedAt: -1, _id: -1 })
    .limit(20)
    .lean();
  return savedAnywhere.find(hasSavedNavbar) || null;
}
