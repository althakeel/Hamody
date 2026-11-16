'use client';

import Image from '@/components/SafeNextImage';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import {
  findVariantForOptionValue,
  formatVariantOptionValue,
  getVariantOptionImage,
  isVariantOptionValueAvailable,
} from '@/lib/productVariantOptions';

const PLACEHOLDER_IMAGE = 'https://hamody-images.s3.ap-south-1.amazonaws.com/uploads/placeholder.png';

function OptionImageCard({
  imageUrl,
  label,
  selected,
  available,
  outOfStockLabel,
  onClick,
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-[88px] flex-col items-center rounded-xl border-2 bg-white p-2 transition ${
        selected
          ? 'border-gray-900 shadow-sm'
          : available
            ? 'border-gray-200 hover:border-gray-400'
            : 'border-dashed border-gray-300 opacity-80 hover:border-gray-500'
      }`}
    >
      <div className="relative flex h-20 w-full items-center justify-center overflow-hidden bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            fill
            sizes="88px"
            className="object-contain"
            unoptimized
          />
        ) : (
          <span className="px-1 text-center text-[11px] font-medium capitalize text-gray-600">
            {label}
          </span>
        )}
      </div>
      <span className={`mt-2 text-center text-xs leading-tight ${selected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {label}
      </span>
      {!available ? (
        <span className="mt-1 text-center text-[10px] font-medium leading-tight text-red-600">
          {outOfStockLabel}
        </span>
      ) : null}
    </button>
  );
}

export default function ProductVariantPicker({
  groups = [],
  variants = [],
  selectedOptions = {},
  onSelect,
  productImages = [],
  isBulkBundleVariant,
  className = '',
}) {
  const { t } = useStorefrontI18n();
  const outOfStockLabel = t('common.outOfStock');
  if (!groups.length) return null;

  return (
    <div className={`space-y-5 ${className}`.trim()}>
      {groups.map((group) => {
        const optionVariants = group.values.map((value) => findVariantForOptionValue(
          variants,
          selectedOptions,
          group.key,
          value,
          { isBulkBundleVariant, ignoreOtherSelections: true },
        ));
        const groupHasImages = optionVariants.some((variant) => {
          const imageUrl = getVariantOptionImage(variant, productImages, { fallbackToProduct: false });
          return Boolean(imageUrl && imageUrl !== PLACEHOLDER_IMAGE);
        });
        const useImageCards = groupHasImages;

        return (
          <div key={group.key} className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {group.label}
            </p>

            {useImageCards ? (
              <div className="flex flex-wrap gap-3">
                {group.values.map((value, index) => {
                  const variant = optionVariants[index];
                  const imageUrl = getVariantOptionImage(variant, productImages, { fallbackToProduct: false });
                  const selected = String(selectedOptions[group.key] || '') === String(value);
                  const available = isVariantOptionValueAvailable(
                    variants,
                    selectedOptions,
                    group.key,
                    value,
                    { isBulkBundleVariant },
                  );
                  const label = formatVariantOptionValue(value);

                  return (
                    <OptionImageCard
                      key={value}
                      imageUrl={imageUrl}
                      label={label}
                      selected={selected}
                      available={available}
                      outOfStockLabel={outOfStockLabel}
                      onClick={() => onSelect(group.key, value)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const selected = String(selectedOptions[group.key] || '') === String(value);
                  const available = isVariantOptionValueAvailable(
                    variants,
                    selectedOptions,
                    group.key,
                    value,
                    { isBulkBundleVariant },
                  );
                  const label = formatVariantOptionValue(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(group.key, value)}
                      className={`rounded-lg border px-4 py-2.5 text-sm transition ${
                        selected
                          ? 'border-gray-900 bg-white font-semibold text-gray-900'
                          : available
                            ? 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                            : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      <span className={available ? '' : 'line-through'}>{label}</span>
                      {!available ? (
                        <span className="mt-0.5 block text-[10px] font-medium leading-tight text-red-600 no-underline">
                          {outOfStockLabel}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
