import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import { NextResponse } from 'next/server';
import { invalidateCategorySliderCaches } from '@/lib/categorySliderCache';
import { resolveCategorySliderAccess, buildCategorySliderFilter } from '@/lib/categorySliderAccess';
import { normalizeCategorySliderBackground, normalizeCategorySliderSideImagePosition, normalizeCategorySliderAutoSlide, normalizeCategorySliderAutoSlideInterval, normalizeCategorySliderShowOutOfStock, normalizeCategorySliderMobileImageRatio, serializeCategorySliderMobileImageRatio } from '@/lib/categorySliderTheme';
import { normalizeCategorySliderViewAll, serializeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { normalizeCategorySliderSideImageLink, serializeCategorySliderSideImageLink } from '@/lib/categorySliderSideImageLink';
import { allocateCategorySliderSlug, ensureCategorySliderSlug, nextCategorySliderSlugAliases } from '@/lib/categorySliderSlug';
import { sortCategorySliders, backfillCategorySliderSortOrdersIfNeeded } from '@/lib/categorySliderOrder';
import { isTestSliderCopy } from '@/lib/categorySliderCopy';
import {
  normalizeCategorySliderBanner,
  normalizeCategorySliderSectionType,
  serializeCategorySliderBanner,
  validateCategorySliderBanner,
} from '@/lib/categorySliderBanner';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

async function resolveStoreScope(token) {
  return resolveCategorySliderAccess(token);
}

export async function GET(req) {
  try {
    await dbConnect();
    const token = parseAuthHeader(req);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await resolveStoreScope(token);
    if (!scope) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    await backfillCategorySliderSortOrdersIfNeeded(CategorySlider);

    const sliders = sortCategorySliders(
      await CategorySlider.find({ storeId: { $in: scope.storeIds } }).lean()
    );
    for (const slider of sliders) {
      if (!slider.slug) slider.slug = await ensureCategorySliderSlug(CategorySlider, slider);
    }
    
    // Ensure all fields including subtitle are present
    const slidersWithDefaults = sliders.map(slider => ({
      ...slider,
      ...serializeCategorySliderBanner(slider),
      subtitle: slider.subtitle || '',
      titleAr: slider.titleAr || '',
      subtitleAr: slider.subtitleAr || '',
      sideImage: slider.sideImage || '',
      sideImageAr: slider.sideImageAr || '',
      mobileImage: slider.mobileImage || '',
      mobileImageAr: slider.mobileImageAr || '',
      ...serializeCategorySliderMobileImageRatio(slider.mobileImageRatio),
      sideImagePosition: normalizeCategorySliderSideImagePosition(slider.sideImagePosition),
      cardsPerRow: slider.cardsPerRow === 5 ? 5 : 6,
      backgroundColor: normalizeCategorySliderBackground(slider.backgroundColor),
      autoSlide: normalizeCategorySliderAutoSlide(slider.autoSlide),
      autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(slider.autoSlideIntervalMs),
      showOutOfStock: normalizeCategorySliderShowOutOfStock(slider.showOutOfStock),
      ...serializeCategorySliderViewAll(slider),
      ...serializeCategorySliderSideImageLink(slider),
      sortOrder: Number.isFinite(Number(slider.sortOrder)) ? Number(slider.sortOrder) : 0,
    }));
    
    console.log('📊 API returning sliders:', slidersWithDefaults);

    return NextResponse.json({ sliders: slidersWithDefaults }, { status: 200 });
  } catch (error) {
    console.error('Error fetching category sliders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sliders' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const token = parseAuthHeader(req);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await resolveStoreScope(token);
    if (!scope) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      subtitle,
      titleAr,
      subtitleAr,
      productIds,
      sideImage,
      sideImageAr,
      mobileImage,
      mobileImageAr,
      mobileImageRatio,
      sideImagePosition,
      cardsPerRow,
      backgroundColor,
      autoSlide,
      autoSlideIntervalMs,
      showOutOfStock,
      viewAllEnabled,
      viewAllTarget,
      viewAllValue,
      sideImageLinkEnabled,
      sideImageLinkTarget,
      sideImageLinkValue,
      slug: requestedSlug,
      sectionType: sectionTypeRaw,
      banner: bannerRaw,
    } = body;
    const sectionType = normalizeCategorySliderSectionType(sectionTypeRaw);
    const banner = normalizeCategorySliderBanner(bannerRaw || body);

    const titleValue = title !== undefined && title !== null ? String(title).trim() : '';
    if (sectionType !== 'banner' && !titleValue) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (sectionType === 'banner') {
      const bannerError = validateCategorySliderBanner(banner);
      if (bannerError) {
        return NextResponse.json({ error: bannerError }, { status: 400 });
      }
    } else if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one product is required' },
        { status: 400 }
      );
    }

    // Explicitly handle subtitle - ensure it's a string
    const subtitleValue = subtitle !== undefined && subtitle !== null ? String(subtitle).trim() : '';
    if (isTestSliderCopy(subtitleValue) || isTestSliderCopy(titleValue)) {
      return NextResponse.json({ error: 'Test slider text cannot be saved.' }, { status: 400 });
    }

    const sideImageValue = sideImage !== undefined && sideImage !== null
      ? String(sideImage).trim()
      : '';
    const sideImageArValue = sideImageAr !== undefined && sideImageAr !== null
      ? String(sideImageAr).trim()
      : '';
    const mobileImageValue = mobileImage !== undefined && mobileImage !== null
      ? String(mobileImage).trim()
      : '';
    const mobileImageArValue = mobileImageAr !== undefined && mobileImageAr !== null
      ? String(mobileImageAr).trim()
      : '';

    if (!scope.storeId) {
      return NextResponse.json(
        { error: 'No store associated with this account' },
        { status: 403 }
      );
    }

    const lastSlider = await CategorySlider.findOne()
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const nextSortOrder = (Number.isFinite(Number(lastSlider?.sortOrder)) ? Number(lastSlider.sortOrder) : -1) + 1;

    const sliderData = {
      storeId: scope.storeId,
      sectionType,
      title: titleValue,
      subtitle: subtitleValue,
      titleAr: titleAr !== undefined && titleAr !== null ? String(titleAr).trim() : '',
      subtitleAr: subtitleAr !== undefined && subtitleAr !== null ? String(subtitleAr).trim() : '',
      productIds: sectionType === 'banner' ? [] : productIds,
      banner: sectionType === 'banner' ? banner : {},
      sideImage: sideImageValue,
      sideImageAr: sideImageArValue,
      mobileImage: mobileImageValue,
      mobileImageAr: mobileImageArValue,
      mobileImageRatio: normalizeCategorySliderMobileImageRatio(mobileImageRatio),
      sideImagePosition: normalizeCategorySliderSideImagePosition(sideImagePosition),
      cardsPerRow: Number(cardsPerRow) === 5 ? 5 : 6,
      backgroundColor: normalizeCategorySliderBackground(backgroundColor),
      autoSlide: normalizeCategorySliderAutoSlide(autoSlide),
      autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(autoSlideIntervalMs),
      showOutOfStock: normalizeCategorySliderShowOutOfStock(showOutOfStock),
      ...normalizeCategorySliderViewAll({ viewAllEnabled, viewAllTarget, viewAllValue }),
      ...normalizeCategorySliderSideImageLink({ sideImageLinkEnabled, sideImageLinkTarget, sideImageLinkValue }),
      slug: await allocateCategorySliderSlug(
        CategorySlider,
        String(requestedSlug || '').trim() || titleValue || (sectionType === 'banner' ? 'banner' : 'slider')
      ),
      slugAliases: [],
      sortOrder: nextSortOrder,
    };

    const slider = new CategorySlider(sliderData);
    await slider.save();
    
    invalidateCategorySliderCaches();

    const savedData = slider.toObject ? slider.toObject() : slider;

    return NextResponse.json(
      {
        message: sectionType === 'banner' ? 'Banner section created' : 'Slider created',
        slider: {
          ...savedData,
          ...serializeCategorySliderBanner(savedData),
          ...serializeCategorySliderSideImageLink(savedData),
          backgroundColor: normalizeCategorySliderBackground(savedData.backgroundColor),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category slider:', error);
    return NextResponse.json(
      { error: 'Failed to create slider' },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const token = parseAuthHeader(req);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await resolveStoreScope(token);
    if (!scope) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // Get ID from query parameter
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Slider ID is required' },
        { status: 400 }
      );
    }

    const slider = await CategorySlider.findOneAndDelete(
      buildCategorySliderFilter(id, scope),
    );

    if (!slider) {
      return NextResponse.json(
        { error: 'Slider not found' },
        { status: 404 }
      );
    }

    invalidateCategorySliderCaches();

    return NextResponse.json(
      { message: 'Slider deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting category slider:', error);
    return NextResponse.json(
      { error: 'Failed to delete slider' },
      { status: 500 }
    );
  }
}
