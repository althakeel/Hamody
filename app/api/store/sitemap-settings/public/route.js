import dbConnect from '@/lib/mongodb';
import SitemapSettings from '@/models/SitemapSettings';
import { NextResponse } from 'next/server';
import { resolveStorefrontOwnerId } from '@/lib/storefrontSettingsOwner';

export async function GET(request) {
  try {
    await dbConnect();
    
    const ownerId = await resolveStorefrontOwnerId('');
    const settings = ownerId
      ? await SitemapSettings.findOne({ storeId: ownerId }).lean()
      : await SitemapSettings.findOne({
          enabled: true,
          categories: { $exists: true, $ne: [] },
        }).lean();

    if (settings && settings.categories && settings.enabled) {
      return NextResponse.json({
        categories: settings.categories
      }, { status: 200 });
    }

    return NextResponse.json({
      categories: []
    }, { status: 200 });
  } catch (error) {
    console.error('[API /store/sitemap-settings/public GET] error:', error);
    return NextResponse.json(
      { categories: [] },
      { status: 200 }
    );
  }
}
