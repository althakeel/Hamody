import dbConnect from '@/lib/mongodb';
import NavbarMenuSettings from '@/models/NavbarMenuSettings';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import { DEFAULT_NAVBAR_LAYOUT, normalizeNavbarLayout } from '@/lib/navbarLayoutSettings';
import { findSharedNavbarSettings, navbarSaveIsStale, resolveStorefrontOwnerId } from '@/lib/storefrontSettingsOwner';

const MAX_ITEMS = 20;

function toFiniteNumber(value) {
  if (value == null) return null;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  if (typeof value === 'object' && typeof value.toString === 'function') {
    const fromString = Number(value.toString());
    if (Number.isFinite(fromString)) return fromString;
  }
  const parsedInt = Number.parseInt(String(value), 10);
  if (Number.isFinite(parsedInt)) return parsedInt;
  const parsedFloat = Number.parseFloat(String(value));
  if (Number.isFinite(parsedFloat)) return parsedFloat;
  return null;
}

function pickNavbarLayout(settings = {}) {
  return {
    ...normalizeNavbarLayout({
      extraButtons: settings?.navExtraButtons,
      searchMaxWidth: settings?.searchMaxWidth,
      searchAlign: settings?.searchAlign,
      searchPlaceholder: settings?.searchPlaceholder,
      searchPlaceholderAr: settings?.searchPlaceholderAr,
      searchStyle: settings?.searchStyle,
      navbarMaxWidth: settings?.navbarMaxWidth,
      itemGap: settings?.itemGap,
      logoGap: settings?.logoGap,
      mobileItemGap: settings?.mobileItemGap,
      stickyHeader: settings?.stickyHeader,
      showCategoriesButton: settings?.showCategoriesButton,
      categoriesButtonLabel: settings?.categoriesButtonLabel,
      categoriesButtonLabelAr: settings?.categoriesButtonLabelAr,
      categoriesButtonStyle: settings?.categoriesButtonStyle,
      itemOrder: settings?.navbarItemOrder || settings?.itemOrder,
      itemAlign: settings?.navbarItemAlign || settings?.itemAlign,
      unifyNavbarText: settings?.unifyNavbarText,
      unifiedTextFontFamily: settings?.unifiedTextFontFamily,
      unifiedTextFontSize: settings?.unifiedTextFontSize,
    }),
    layoutUpdatedAt: toIsoTimestamp(settings?.updatedAt),
  };
}

function toIsoTimestamp(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function mergeNavbarLayoutSource(base = {}, latest = {}) {
  if (!latest) return base;
  return {
    ...base,
    navExtraButtons: latest.navExtraButtons ?? base.navExtraButtons,
    searchMaxWidth: latest.searchMaxWidth ?? base.searchMaxWidth,
    searchAlign: latest.searchAlign ?? base.searchAlign,
    searchPlaceholder: latest.searchPlaceholder ?? base.searchPlaceholder,
    searchPlaceholderAr: latest.searchPlaceholderAr ?? base.searchPlaceholderAr,
    searchStyle: latest.searchStyle ?? base.searchStyle,
    navbarMaxWidth: latest.navbarMaxWidth ?? base.navbarMaxWidth,
    itemGap: latest.itemGap ?? base.itemGap,
    logoGap: latest.logoGap ?? base.logoGap,
    mobileItemGap: latest.mobileItemGap ?? base.mobileItemGap,
    stickyHeader: latest.stickyHeader ?? base.stickyHeader,
    showCategoriesButton: latest.showCategoriesButton ?? base.showCategoriesButton,
    categoriesButtonLabel: latest.categoriesButtonLabel ?? base.categoriesButtonLabel,
    categoriesButtonLabelAr: latest.categoriesButtonLabelAr ?? base.categoriesButtonLabelAr,
    categoriesButtonStyle: latest.categoriesButtonStyle ?? base.categoriesButtonStyle,
    navbarItemOrder: latest.navbarItemOrder ?? base.navbarItemOrder,
    itemOrder: latest.navbarItemOrder ?? latest.itemOrder ?? base.navbarItemOrder ?? base.itemOrder,
    unifyNavbarText: latest.unifyNavbarText ?? base.unifyNavbarText,
    unifiedTextFontFamily: latest.unifiedTextFontFamily ?? base.unifiedTextFontFamily,
    unifiedTextFontSize: latest.unifiedTextFontSize ?? base.unifiedTextFontSize,
    navbarItemAlign: latest.navbarItemAlign ?? base.navbarItemAlign,
    itemAlign: latest.navbarItemAlign ?? latest.itemAlign ?? base.navbarItemAlign ?? base.itemAlign,
    updatedAt: latest.updatedAt || base.updatedAt,
  };
}

function pickFooterBranding(settings = {}, navbarLogoUrl = '') {
  const sameAsNavbar = settings?.footerLogoSameAsNavbar !== false;
  const customFooterUrl = String(settings?.footerLogoUrl || '').trim();
  return {
    footerLogoSameAsNavbar: sameAsNavbar,
    footerLogoUrl: customFooterUrl,
    footerLogoWidth: toFiniteNumber(settings?.footerLogoWidth) ?? 160,
    footerLogoHeight: toFiniteNumber(settings?.footerLogoHeight) ?? 40,
    // Resolved URL the storefront should render.
    resolvedFooterLogoUrl: sameAsNavbar
      ? String(navbarLogoUrl || '').trim()
      : (customFooterUrl || String(navbarLogoUrl || '').trim()),
  };
}

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

export async function GET(req) {
  try {
    await dbConnect();

    const token = parseAuthHeader(req);
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        const ownerId = await resolveStorefrontOwnerId(decoded.uid);
        const shared = await findSharedNavbarSettings(ownerId);
        const settingsDocs = shared ? [shared] : [];

        console.log('[API GET /store/navbar-menu] Found docs:', settingsDocs.length);
        if (settingsDocs.length > 0) {
          console.log('[API GET /store/navbar-menu] All docs found:', settingsDocs.map(doc => ({
            _id: doc._id.toString().slice(-8),
            storeId: doc.storeId,
            logoUrl: doc?.logoUrl ? '(has URL)' : '(empty)',
            logoUrl_value: doc?.logoUrl || '(null/empty)'
          })));
          console.log('[API GET /store/navbar-menu] First doc details:', {
            _id: settingsDocs[0]._id,
            storeId: settingsDocs[0].storeId,
            enabled: settingsDocs[0].enabled,
            logoUrl: settingsDocs[0]?.logoUrl || '(empty)',
            logoWidth: settingsDocs[0]?.logoWidth,
            logoHeight: settingsDocs[0]?.logoHeight,
            backgroundColor: settingsDocs[0]?.backgroundColor
          });
        } else {
          console.log('[API GET /store/navbar-menu] NO DOCUMENTS FOUND for storeId:', decoded.uid);
        }

        const settings = settingsDocs[0] || null;
        let resolvedWidth = toFiniteNumber(settings?.logoWidth);
        let resolvedHeight = toFiniteNumber(settings?.logoHeight);
        let resolvedLogoUrl = String(settings?.logoUrl || '').trim();

        // Prefer any sibling doc for this seller that already has a logo / dimensions.
        if ((!resolvedLogoUrl || resolvedWidth == null || resolvedHeight == null) && settingsDocs.length > 1) {
          const fallbackDoc = settingsDocs.find((doc) => {
            const hasLogo = String(doc?.logoUrl || '').trim();
            const w = toFiniteNumber(doc?.logoWidth);
            const h = toFiniteNumber(doc?.logoHeight);
            if (!resolvedLogoUrl && hasLogo) return true;
            if ((resolvedWidth == null || resolvedHeight == null) && w != null && h != null) return true;
            return false;
          });

          if (fallbackDoc) {
            if (!resolvedLogoUrl) resolvedLogoUrl = String(fallbackDoc.logoUrl || '').trim();
            if (resolvedWidth == null) resolvedWidth = toFiniteNumber(fallbackDoc.logoWidth);
            if (resolvedHeight == null) resolvedHeight = toFiniteNumber(fallbackDoc.logoHeight);
          }
        }

        // Also check store ObjectId docs (legacy saves used Store._id instead of Firebase uid).
        if (!resolvedLogoUrl) {
          try {
            const authSeller = (await import('@/middlewares/authSeller')).default;
            const storeObjectId = await authSeller(decoded.uid);
            if (storeObjectId && String(storeObjectId) !== String(decoded.uid)) {
              const storeDoc = await NavbarMenuSettings.findOne({ storeId: String(storeObjectId) })
                .sort({ updatedAt: -1, _id: -1 })
                .lean();
              if (storeDoc?.logoUrl) {
                resolvedLogoUrl = String(storeDoc.logoUrl).trim();
                if (resolvedWidth == null) resolvedWidth = toFiniteNumber(storeDoc.logoWidth);
                if (resolvedHeight == null) resolvedHeight = toFiniteNumber(storeDoc.logoHeight);
              }
            }
          } catch {
            // Ignore seller lookup failures; fall through with whatever we have.
          }
        }

        const response = {
          enabled: settings?.enabled ?? true,
          logoUrl: resolvedLogoUrl,
          logoWidth: resolvedWidth ?? 120,
          logoHeight: resolvedHeight ?? 40,
          backgroundColor: String(settings?.backgroundColor || '').trim(),
          items: settings?.items || [],
          ...pickNavbarLayout(settings),
          ...pickFooterBranding(settings, resolvedLogoUrl),
          updatedAt: settings?.updatedAt || null,
        };

        console.log('[API GET /store/navbar-menu] Sending response:', {
          logoUrl: response.logoUrl || '(empty)',
          logoWidth: response.logoWidth,
          logoHeight: response.logoHeight
        });

        return NextResponse.json(response, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        console.warn('[API GET /store/navbar-menu] token verify failed:', error?.message || error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    console.log('[API GET /store/navbar-menu] No auth token - fetching public settings');
    const ownerId = await resolveStorefrontOwnerId('');
    const settings = await findSharedNavbarSettings(ownerId);

    let resolvedWidth = toFiniteNumber(settings?.logoWidth);
    let resolvedHeight = toFiniteNumber(settings?.logoHeight);

    return NextResponse.json(
      {
        enabled: settings?.enabled ?? false,
        logoUrl: settings?.logoUrl || '',
        logoWidth: resolvedWidth ?? 120,
        logoHeight: resolvedHeight ?? 40,
        backgroundColor: String(settings?.backgroundColor || '').trim(),
        items: settings?.items || [],
        ...pickNavbarLayout(settings),
        ...pickFooterBranding(settings, settings?.logoUrl || ''),
        updatedAt: settings?.updatedAt || null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API GET /store/navbar-menu] error:', error);
    return NextResponse.json(
      {
        enabled: false,
        logoUrl: '',
        logoWidth: 120,
        logoHeight: 40,
        backgroundColor: '',
        items: [],
        footerLogoSameAsNavbar: true,
        footerLogoUrl: '',
        footerLogoWidth: 160,
        footerLogoHeight: 40,
        resolvedFooterLogoUrl: '',
        ...DEFAULT_NAVBAR_LAYOUT,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(req) {
  try {
    const token = parseAuthHeader(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const userId = await resolveStorefrontOwnerId(decoded.uid);

    await dbConnect();

    const body = await req.json();

    if (body?.footerLogoOnly) {
      const existing = await findSharedNavbarSettings(userId);
      const sameAsNavbar = body.footerLogoSameAsNavbar !== false;
      const clearFooterLogo = Boolean(body.clearFooterLogo);
      const incomingFooterUrl = String(body.footerLogoUrl || '').trim();
      const existingFooterUrl = String(existing?.footerLogoUrl || '').trim();
      const nextFooterUrl = clearFooterLogo ? '' : (incomingFooterUrl || existingFooterUrl);
      const width = Math.max(40, Math.min(400, Number.parseInt(String(body.footerLogoWidth ?? existing?.footerLogoWidth ?? 160), 10) || 160));
      const height = Math.max(16, Math.min(160, Number.parseInt(String(body.footerLogoHeight ?? existing?.footerLogoHeight ?? 48), 10) || 48));

      await NavbarMenuSettings.findOneAndUpdate(
        { storeId: userId },
        {
          $set: {
            storeId: userId,
            footerLogoSameAsNavbar: sameAsNavbar,
            footerLogoUrl: sameAsNavbar ? existingFooterUrl : nextFooterUrl,
            footerLogoWidth: width,
            footerLogoHeight: height,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const settings = await NavbarMenuSettings.findOne({ storeId: userId }).sort({ updatedAt: -1, _id: -1 }).lean();
      const navbarLogoUrl = String(settings?.logoUrl || '').trim();
      return NextResponse.json({
        message: 'Footer logo updated',
        data: pickFooterBranding(settings, navbarLogoUrl),
      });
    }

    const {
      enabled = true,
      items = [],
      logoUrl = '',
      logoWidth,
      logoHeight,
      backgroundColor = '',
      clearLogo = false,
      removeLogo = false,
      extraButtons,
      searchMaxWidth,
      searchAlign,
      searchPlaceholder,
      searchPlaceholderAr,
      searchStyle,
      navbarMaxWidth,
      itemGap,
      logoGap,
      mobileItemGap,
      stickyHeader,
      showCategoriesButton,
      categoriesButtonLabel,
      categoriesButtonLabelAr,
      categoriesButtonStyle,
      itemOrder,
      navbarItemOrder,
      itemAlign,
      navbarItemAlign,
      unifyNavbarText,
      unifiedTextFontFamily,
      unifiedTextFontSize,
      settingsUpdatedAt,
    } = body || {};

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items format' }, { status: 400 });
    }

    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Maximum ${MAX_ITEMS} items allowed` }, { status: 400 });
    }

    const sanitizedItems = items.map((item, index) => {
      const label = (item?.label || '').trim();
      const url = (item?.url || '').trim();
      const categoryId = (item?.categoryId || '').trim();

      if (!label) {
        throw new Error(`Item ${index + 1}: Label is required`);
      }
      if (!url) {
        throw new Error(`Item ${index + 1}: URL is required`);
      }

      return { label, url, categoryId: categoryId || null };
    });

    const parsedLogoWidth = Number.parseInt(String(logoWidth), 10);
    const parsedLogoHeight = Number.parseInt(String(logoHeight), 10);

    if (!Number.isFinite(parsedLogoWidth) || !Number.isFinite(parsedLogoHeight)) {
      return NextResponse.json({ error: 'logoWidth and logoHeight must be valid numbers' }, { status: 400 });
    }

    const nextLogoWidth = Math.max(20, Math.min(400, parsedLogoWidth));
    const nextLogoHeight = Math.max(10, Math.min(200, parsedLogoHeight));

    const existing = await findSharedNavbarSettings(userId);
    if (navbarSaveIsStale(existing, settingsUpdatedAt)) {
      return NextResponse.json(
        { error: 'These settings were just saved. Reload the page, then save again.' },
        { status: 409 },
      );
    }

    const incomingBackgroundColor = String(backgroundColor || '').trim();
    const existingBackgroundColor = String(existing?.backgroundColor || '').trim();
    const nextBackgroundColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(incomingBackgroundColor)
      ? incomingBackgroundColor
      : existingBackgroundColor;

    // Also check legacy store ObjectId docs so we don't lose a logo saved under Store._id.
    let existingLogoUrl = String(existing?.logoUrl || '').trim();
    if (!existingLogoUrl) {
      try {
        const authSeller = (await import('@/middlewares/authSeller')).default;
        const storeObjectId = await authSeller(userId);
        if (storeObjectId && String(storeObjectId) !== String(userId)) {
          const legacy = await NavbarMenuSettings.findOne({ storeId: String(storeObjectId) })
            .sort({ updatedAt: -1, _id: -1 })
            .lean();
          existingLogoUrl = String(legacy?.logoUrl || '').trim();
        }
      } catch {
        // ignore
      }
    }

    const incomingLogoUrl = String(logoUrl || '').trim();
    const shouldClearLogo = Boolean(clearLogo || removeLogo);
    // Never wipe a saved logo just because the dashboard form loaded empty and user hit Save.
    const nextLogoUrl = shouldClearLogo
      ? ''
      : (incomingLogoUrl || existingLogoUrl);

    const nextLayout = normalizeNavbarLayout({
      extraButtons: extraButtons ?? existing?.navExtraButtons,
      searchMaxWidth: searchMaxWidth ?? existing?.searchMaxWidth,
      searchAlign: searchAlign ?? existing?.searchAlign,
      searchPlaceholder: searchPlaceholder ?? existing?.searchPlaceholder,
      searchPlaceholderAr: searchPlaceholderAr ?? existing?.searchPlaceholderAr,
      searchStyle: searchStyle ?? existing?.searchStyle,
      navbarMaxWidth: navbarMaxWidth ?? existing?.navbarMaxWidth,
      itemGap: itemGap ?? existing?.itemGap,
      logoGap: logoGap ?? existing?.logoGap,
      mobileItemGap: mobileItemGap ?? existing?.mobileItemGap,
      stickyHeader: stickyHeader ?? existing?.stickyHeader,
      showCategoriesButton: showCategoriesButton ?? existing?.showCategoriesButton,
      categoriesButtonLabel: categoriesButtonLabel ?? existing?.categoriesButtonLabel,
      categoriesButtonLabelAr: categoriesButtonLabelAr ?? existing?.categoriesButtonLabelAr,
      categoriesButtonStyle: categoriesButtonStyle ?? existing?.categoriesButtonStyle,
      itemOrder: itemOrder ?? navbarItemOrder ?? existing?.navbarItemOrder ?? existing?.itemOrder,
      itemAlign: itemAlign ?? navbarItemAlign ?? existing?.navbarItemAlign ?? existing?.itemAlign,
      unifyNavbarText: unifyNavbarText ?? existing?.unifyNavbarText,
      unifiedTextFontFamily: unifiedTextFontFamily ?? existing?.unifiedTextFontFamily,
      unifiedTextFontSize: unifiedTextFontSize ?? existing?.unifiedTextFontSize,
    });

    console.log('[API /store/navbar-menu POST] Saving:', {
      userId,
      logoUrl: nextLogoUrl || '(empty)',
      preservedExisting: !incomingLogoUrl && !shouldClearLogo && Boolean(existingLogoUrl),
      logoWidth: nextLogoWidth,
      logoHeight: nextLogoHeight,
    });

    await NavbarMenuSettings.findOneAndUpdate(
      { storeId: userId },
      {
        $set: {
          storeId: userId,
          enabled: !!enabled,
          logoUrl: nextLogoUrl,
          logoWidth: nextLogoWidth,
          logoHeight: nextLogoHeight,
          backgroundColor: nextBackgroundColor,
          items: sanitizedItems,
          navExtraButtons: nextLayout.extraButtons,
          searchMaxWidth: nextLayout.searchMaxWidth,
          searchAlign: nextLayout.searchAlign,
          searchPlaceholder: nextLayout.searchPlaceholder,
          searchPlaceholderAr: nextLayout.searchPlaceholderAr,
          searchStyle: nextLayout.searchStyle,
          navbarMaxWidth: nextLayout.navbarMaxWidth,
          itemGap: nextLayout.itemGap,
          logoGap: nextLayout.logoGap,
          mobileItemGap: nextLayout.mobileItemGap,
          stickyHeader: nextLayout.stickyHeader,
          showCategoriesButton: nextLayout.showCategoriesButton,
          categoriesButtonLabel: nextLayout.categoriesButtonLabel,
          categoriesButtonLabelAr: nextLayout.categoriesButtonLabelAr,
          categoriesButtonStyle: nextLayout.categoriesButtonStyle,
          navbarItemOrder: nextLayout.itemOrder,
          navbarItemAlign: nextLayout.itemAlign,
          unifyNavbarText: nextLayout.unifyNavbarText,
          unifiedTextFontFamily: nextLayout.unifiedTextFontFamily,
          unifiedTextFontSize: nextLayout.unifiedTextFontSize,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    let settings = await NavbarMenuSettings.findOne({ storeId: userId })
      .sort({ updatedAt: -1, _id: -1 })
      .lean();
    
    console.log('[API /store/navbar-menu POST] DB Settings after save:', {
      logoUrl: settings?.logoUrl || '(empty)',
      logoWidth: settings?.logoWidth,
      logoHeight: settings?.logoHeight
    });

    // Self-heal legacy/malformed docs that may miss explicit dimensions.
    const afterSaveWidth = toFiniteNumber(settings?.logoWidth);
    const afterSaveHeight = toFiniteNumber(settings?.logoHeight);
    if (afterSaveWidth == null || afterSaveHeight == null) {
      await NavbarMenuSettings.updateMany(
        { storeId: userId },
        {
          $set: {
            logoWidth: nextLogoWidth,
            logoHeight: nextLogoHeight,
          },
        }
      );
      settings = await NavbarMenuSettings.findOne({ storeId: userId })
        .sort({ updatedAt: -1, _id: -1 })
        .lean();
    }

    if (!settings) {
      return NextResponse.json({ error: 'Saved settings could not be reloaded' }, { status: 500 });
    }

    let finalSavedWidth = toFiniteNumber(settings?.logoWidth);
    let finalSavedHeight = toFiniteNumber(settings?.logoHeight);
    if (finalSavedWidth == null || finalSavedHeight == null) {
      await NavbarMenuSettings.updateMany(
        { storeId: userId },
        {
          $set: {
            logoWidth: nextLogoWidth,
            logoHeight: nextLogoHeight,
          },
        }
      );
      finalSavedWidth = nextLogoWidth;
      finalSavedHeight = nextLogoHeight;
    }

    return NextResponse.json(
      {
        message: 'Navbar menu updated',
        data: {
          enabled: settings.enabled,
          logoUrl: settings.logoUrl,
          logoWidth: finalSavedWidth,
          logoHeight: finalSavedHeight,
          backgroundColor: settings.backgroundColor,
          items: settings.items,
          ...pickNavbarLayout(settings),
          updatedAt: settings.updatedAt || null,
        },
        meta: {
          storeId: settings.storeId,
          updatedAt: settings.updatedAt,
          receivedLogoWidth: parsedLogoWidth,
          receivedLogoHeight: parsedLogoHeight,
          savedLogoWidth: finalSavedWidth,
          savedLogoHeight: finalSavedHeight,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /store/navbar-menu POST] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save menu' }, { status: 500 });
  }
}
