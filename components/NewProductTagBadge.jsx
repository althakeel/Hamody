'use client';

import useNewProductTag from '@/lib/useNewProductTag';
import {
  getBadgePlacementClass,
  getBadgeShadowClass,
  getBadgeSizeClass,
  getNewBadgeStyle,
  getVisibleNewProductBadges,
  shouldShowNewProductTag,
} from '@/lib/newProductTag';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

export default function NewProductTagBadge({
  product,
  size = 'card',
  className = '',
}) {
  const settings = useNewProductTag();
  const { language } = useStorefrontI18n();

  if (!shouldShowNewProductTag(product, settings)) return null;

  const badges = getVisibleNewProductBadges(settings, language, product);
  if (!badges.length) return null;

  const thumb = size === 'thumb';
  const compact = size === 'card' || thumb;
  const layoutSize = thumb ? 'thumb' : compact ? 'card' : 'detail';

  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={`pointer-events-none absolute z-20 leading-none ${getBadgePlacementClass(badge, layoutSize)} ${getBadgeSizeClass(badge, layoutSize)} ${getBadgeShadowClass(badge)} ${className}`.trim()}
          style={getNewBadgeStyle(badge, compact)}
        >
          {badge.label}
        </span>
      ))}
    </>
  );
}
