import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import { NextResponse } from 'next/server';
import { invalidateCategorySliderCaches } from '@/lib/categorySliderCache';
import { resolveCategorySliderAccess, buildCategorySliderFilter } from '@/lib/categorySliderAccess';
import { normalizeCategorySliderBackground, normalizeCategorySliderSideImagePosition, normalizeCategorySliderAutoSlide, normalizeCategorySliderAutoSlideInterval, normalizeCategorySliderShowOutOfStock, normalizeCategorySliderMobileImageRatio } from '@/lib/categorySliderTheme';
import { normalizeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { normalizeCategorySliderSideImageLink, serializeCategorySliderSideImageLink } from '@/lib/categorySliderSideImageLink';
import { allocateCategorySliderSlug, nextCategorySliderSlugAliases } from '@/lib/categorySliderSlug';
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

export async function PUT(req, { params }) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Slider ID is required' }, { status: 400 });
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

    const productIdsValue = Array.isArray(productIds)
      ? productIds.map((productId) => String(productId)).filter(Boolean)
      : [];

    if (sectionType === 'banner') {
      const bannerError = validateCategorySliderBanner(banner);
      if (bannerError) {
        return NextResponse.json({ error: bannerError }, { status: 400 });
      }
    } else if (productIdsValue.length === 0) {
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

    const current = await CategorySlider.findOne(buildCategorySliderFilter(id, scope)).select('slug slugAliases').lean();
    const slug = await allocateCategorySliderSlug(
      CategorySlider,
      String(requestedSlug || '').trim() || titleValue || (sectionType === 'banner' ? 'banner' : 'slider'),
      id
    );

    const updateData = {
      sectionType,
      title: titleValue,
      subtitle: subtitleValue,
      titleAr: titleAr !== undefined && titleAr !== null ? String(titleAr).trim() : '',
      subtitleAr: subtitleAr !== undefined && subtitleAr !== null ? String(subtitleAr).trim() : '',
      productIds: sectionType === 'banner' ? [] : productIdsValue,
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
      slug,
      slugAliases: nextCategorySliderSlugAliases(current?.slug, current?.slugAliases, slug),
    };

    console.log('💾 About to update with:', JSON.stringify(updateData));

    const slider = await CategorySlider.findOneAndUpdate(
      buildCategorySliderFilter(id, scope),
      { $set: scope.isAdmin ? updateData : { ...updateData, storeId: scope.storeId } },
      { new: true, runValidators: true }
    );

    console.log('💾 After update, subtitle:', JSON.stringify(slider?.subtitle));
    console.log('=== 💾 PUT SLIDER END ===');

    if (!slider) {
      return NextResponse.json(
        { error: 'Slider not found' },
        { status: 404 }
      );
    }

    // Ensure response includes all fields as plain object
    const sliderData = slider.toObject ? slider.toObject() : slider;
    console.log('💾 Returning slider data, backgroundColor:', sliderData.backgroundColor);

    invalidateCategorySliderCaches();

    return NextResponse.json(
      {
        message: sectionType === 'banner' ? 'Banner section updated' : 'Slider updated',
        slider: {
          ...sliderData,
          ...serializeCategorySliderBanner(sliderData),
          ...serializeCategorySliderSideImageLink(sliderData),
          backgroundColor: normalizeCategorySliderBackground(sliderData.backgroundColor),
          autoSlide: normalizeCategorySliderAutoSlide(sliderData.autoSlide),
          autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(sliderData.autoSlideIntervalMs),
          showOutOfStock: normalizeCategorySliderShowOutOfStock(sliderData.showOutOfStock),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating category slider:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update slider' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Slider ID is required' }, { status: 400 });
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
