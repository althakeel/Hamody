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

  const groups = [];
  const byPlacement = new Map();
  badges.forEach((badge) => {
    const placement = badge.placement || (badge.position === 'right' ? 'top-right' : 'top-left');
    if (!byPlacement.has(placement)) {
      byPlacement.set(placement, []);
      groups.push(placement);
    }
    byPlacement.get(placement).push(badge);
  });

  return (
    <>
      {groups.map((placement) => {
        const stack = byPlacement.get(placement);
        const sample = stack[0];
        const isBottom = String(placement).startsWith('bottom');
        const align = String(placement).includes('center')
          ? 'items-center'
          : String(placement).endsWith('right')
            ? 'items-end'
            : 'items-start';
        return (
          <span
            key={placement}
            className={`pointer-events-none absolute z-20 flex gap-1 ${isBottom ? 'flex-col-reverse' : 'flex-col'} ${align} ${getBadgePlacementClass(sample, layoutSize)} ${className}`.trim()}
          >
            {stack.map((badge) => (
              <span
                key={badge.id}
                className={`leading-none ${getBadgeSizeClass(badge, layoutSize)} ${getBadgeShadowClass(badge)}`.trim()}
                style={getNewBadgeStyle(badge, compact)}
              >
                {badge.label}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}
