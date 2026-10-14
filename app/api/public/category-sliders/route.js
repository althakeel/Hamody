import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import { getCachedData, setCachedData } from '@/lib/cache';
import { NextResponse } from 'next/server';
import { serializeCategorySliderMobileImageRatio } from '@/lib/categorySliderTheme';
import { serializeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { ensureCategorySliderSlug } from '@/lib/categorySliderSlug';

const CACHE_KEY = 'public:category-sliders:v5';
const CACHE_TTL = 120;

export async function GET() {
  try {
    const cached = getCachedData(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { sliders: cached },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    await dbConnect();

    const sliders = (await CategorySlider.find({})
      .select('title subtitle titleAr subtitleAr slug productIds mobileImage mobileImageAr mobileImageRatio viewAllEnabled viewAllTarget viewAllValue storeId createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean());
    for (const slider of sliders) {
      if (!slider.slug) slider.slug = await ensureCategorySliderSlug(CategorySlider, slider);
    }
    const payload = sliders.map((slider) => ({
      ...slider,
      mobileImage: slider.mobileImage || '',
      mobileImageAr: slider.mobileImageAr || '',
      ...serializeCategorySliderMobileImageRatio(slider.mobileImageRatio),
      ...serializeCategorySliderViewAll(slider),
    }));

    setCachedData(CACHE_KEY, payload, CACHE_TTL);

    return NextResponse.json(
      { sliders: payload },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public category sliders:', error);
    return NextResponse.json({ sliders: [] }, { status: 200 });
  }
}
