import { revalidatePath, revalidateTag } from 'next/cache';
import {
  clearCache,
  getCacheStats,
  invalidateStorefrontProductCaches,
} from '@/lib/cache';
import WebsiteCacheSettings from '@/models/WebsiteCacheSettings';

const SETTINGS_KEY = 'website-cache';

const PUBLIC_PATHS = [
  '/',
  '/shop',
  '/offers',
  '/blogs',
  '/about-us',
  '/return-policy',
];

export function revalidatePublicWebsite() {
  revalidateTag('homepage');
  revalidatePath('/', 'layout');
  PUBLIC_PATHS.forEach((path) => {
    revalidatePath(path);
  });
}

export async function getWebsiteCacheSettings() {
  const doc = await WebsiteCacheSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, defaultScope: 'storefront' } },
    { new: true, upsert: true },
  ).lean();

  return {
    defaultScope: doc?.defaultScope === 'all' ? 'all' : 'storefront',
    lastClearedAt: doc?.lastClearedAt || null,
    lastClearedBy: doc?.lastClearedBy || '',
    lastScope: doc?.lastScope || '',
    lastClearedCount: Number(doc?.lastClearedCount || 0),
    history: Array.isArray(doc?.history) ? doc.history.slice(0, 12) : [],
    stats: getCacheStats(),
  };
}

export async function saveWebsiteCacheSettings({ defaultScope } = {}) {
  const scope = defaultScope === 'all' ? 'all' : 'storefront';
  await WebsiteCacheSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { defaultScope: scope } },
    { upsert: true },
  );

  return getWebsiteCacheSettings();
}

export async function purgeWebsiteCache({ scope = 'storefront', actorEmail = '' } = {}) {
  const nextScope = scope === 'all' ? 'all' : 'storefront';
  const before = getCacheStats();
  if (nextScope === 'all') {
    clearCache();
  } else {
    invalidateStorefrontProductCaches();
  }
  revalidatePublicWebsite();
  const after = getCacheStats();
  const clearedCount = Math.max(0, before.size - after.size);
  const actor = String(actorEmail || '').trim().toLowerCase();
  const clearedAt = new Date();

  await WebsiteCacheSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        lastClearedAt: clearedAt,
        lastClearedBy: actor,
        lastScope: nextScope,
        lastClearedCount: clearedCount,
      },
      $push: {
        history: {
          $each: [{ at: clearedAt, by: actor, scope: nextScope, clearedCount }],
          $position: 0,
          $slice: 20,
        },
      },
      $setOnInsert: { key: SETTINGS_KEY, defaultScope: 'storefront' },
    },
    { upsert: true },
  );

  return getWebsiteCacheSettings();
}
