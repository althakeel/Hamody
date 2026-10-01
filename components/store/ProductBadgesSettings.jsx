'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Plus, Save, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import StoreDropdown from '@/components/store/StoreDropdown';
import { useAuth } from '@/lib/useAuth';
import {
  BADGE_CONDITION_OPTIONS,
  BADGE_FONT_OPTIONS,
  BADGE_LETTER_SPACING_OPTIONS,
  BADGE_OFFSET_OPTIONS,
  BADGE_PLACEMENT_OPTIONS,
  BADGE_SHADOW_OPTIONS,
  BADGE_SHAPE_OPTIONS,
  BADGE_SIZE_OPTIONS,
  BADGE_TEXT_TRANSFORM_OPTIONS,
  DEFAULT_NEW_TAG_SETTINGS,
  MAX_PRODUCT_IMAGE_BADGES,
  createProductImageBadge,
  getBadgePlacementClass,
  getBadgeShadowClass,
  getBadgeSizeClass,
  getNewBadgeStyle,
  normalizeNewTagSettings,
} from '@/lib/newProductTag';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/15';

const BADGE_WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra bold' },
];

function isTransparentColor(value) {
  return String(value || '').trim().toLowerCase() === 'transparent';
}

function colorPickerValue(value) {
  const raw = String(value || '').trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw) ? raw : '#FFFFFF';
}

function BadgeColorField({ label, value, onChange, allowTransparent = false, className = '' }) {
  const transparent = isTransparentColor(value);
  return (
    <Field label={label} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={colorPickerValue(value)}
          disabled={transparent}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder={allowTransparent ? '#E52D27 or transparent' : '#E52D27'}
        />
        {allowTransparent ? (
          <button
            type="button"
            onClick={() => onChange(transparent ? '#E52D27' : 'transparent')}
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
              transparent
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            Transparent
          </button>
        ) : null}
      </div>
    </Field>
  );
}

function BadgeBorderWidthField({ value, onChange }) {
  const width = Number(value) || 0;
  return (
    <Field label="Border width" className="md:col-span-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={8}
          step={1}
          value={width}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full accent-indigo-600"
        />
        <input
          type="number"
          min={0}
          max={8}
          value={width}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
        />
        <span className="w-8 text-sm font-medium text-slate-600">{width}px</span>
      </div>
    </Field>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      {(title || description) && (
        <div className="mb-5 border-b border-slate-100 pb-4">
          {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}

function toSelectOptions(options) {
  return options.map((option) => ({ value: option.id, label: option.label }));
}

function audienceSummary(badge) {
  const parts = [];
  const products = badge.productNames?.length || badge.productIds?.length || 0;
  const categories = badge.categoryNames?.length || badge.categoryIds?.length || 0;
  const tags = badge.tags?.length || 0;
  if (products) parts.push(products === 1 ? '1 product' : `${products} products`);
  if (categories) parts.push(categories === 1 ? '1 category' : `${categories} categories`);
  if (tags) parts.push(tags === 1 ? '1 tag' : `${tags} tags`);
  if (badge.priceMin != null || badge.priceMax != null) {
    const min = badge.priceMin != null ? badge.priceMin : '0';
    const max = badge.priceMax != null ? badge.priceMax : 'any';
    parts.push(`AED ${min}–${max}`);
  }
  return parts.join(' · ');
}

function ChoiceChips({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
          {item.label}
          <button type="button" onClick={() => onRemove(item.id)} className="text-slate-400 hover:text-slate-800" aria-label={`Remove ${item.label}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function BadgeAudienceFields({ badge, onChange, categories, getToken, mode = 'all' }) {
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    const query = productQuery.trim();
    if (query.length < 2) {
      setProductResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const token = await getToken();
        if (!token || cancelled) return;
        const res = await axios.get('/api/store/product', {
          params: { picker: 'true', search: query, limit: 8 },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setProductResults(res.data?.products || []);
      } catch {
        if (!cancelled) setProductResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productQuery, getToken]);

  const productIds = badge.productIds || [];
  const productNames = badge.productNames || [];
  const categoryIds = badge.categoryIds || [];
  const categoryNames = badge.categoryNames || [];
  const tags = badge.tags || [];

  const addProduct = (product) => {
    const id = String(product._id || product.id || '');
    if (!id || productIds.includes(id)) return;
    onChange({
      productIds: [...productIds, id],
      productNames: [...productNames, product.name || product.sku || id],
    });
    setProductQuery('');
    setProductResults([]);
  };

  const addCategory = (id) => {
    const category = categories.find((item) => String(item._id) === String(id));
    if (!category || categoryIds.includes(String(category._id))) return;
    onChange({
      categoryIds: [...categoryIds, String(category._id)],
      categoryNames: [...categoryNames, category.name || 'Category'],
    });
    setCategoryId('');
  };

  const addTag = () => {
    const next = tagInput.split(',').map((item) => item.trim()).filter(Boolean);
    if (!next.length) return;
    const merged = [...tags];
    next.forEach((tag) => {
      if (!merged.some((item) => item.toLowerCase() === tag.toLowerCase())) merged.push(tag);
    });
    onChange({ tags: merged });
    setTagInput('');
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:col-span-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {mode === 'none' ? 'Optional limits' : 'Also limit this badge'}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {mode === 'none'
            ? 'All of these are optional. Leave them empty and the badge can show on any product.'
            : 'Leave a row empty to ignore it. Filled rows all have to match.'}
        </p>
      </div>
      {mode === 'all' || mode === 'none' || mode === 'products' ? (
      <Field label="Only these products">
        <input
          type="text"
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          className={inputClass}
          placeholder="Search product name or SKU"
        />
        {searching ? <span className="text-xs text-slate-500">Searching…</span> : null}
        {productResults.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {productResults.map((product) => (
              <button
                key={product._id}
                type="button"
                onClick={() => addProduct(product)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {product.name || 'Product'}
                {product.sku ? <span className="ml-2 text-xs text-slate-400">{product.sku}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        <ChoiceChips
          items={productIds.map((id, index) => ({ id, label: productNames[index] || id }))}
          onRemove={(id) => {
            const nextIndex = productIds.indexOf(id);
            onChange({
              productIds: productIds.filter((item) => item !== id),
              productNames: productNames.filter((_, index) => index !== nextIndex),
            });
          }}
        />
      </Field>
      ) : null}
      {mode === 'all' || mode === 'none' || mode === 'category' ? (
      <Field label="Only these categories">
        <BadgeSelect
          value={categoryId}
          onChange={addCategory}
          options={categories
            .filter((category) => !categoryIds.includes(String(category._id)))
            .map((category) => ({ value: String(category._id), label: category.name || 'Category' }))}
          placeholder="Choose a category"
        />
        <ChoiceChips
          items={categoryIds.map((id, index) => ({ id, label: categoryNames[index] || id }))}
          onRemove={(id) => {
            const nextIndex = categoryIds.indexOf(id);
            onChange({
              categoryIds: categoryIds.filter((item) => item !== id),
              categoryNames: categoryNames.filter((_, index) => index !== nextIndex),
            });
          }}
        />
      </Field>
      ) : null}
      {mode === 'all' || mode === 'none' || mode === 'tag' ? (
      <Field label="Only products with these tags">
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            className={inputClass}
            placeholder="Type a tag, then Enter"
          />
          <button type="button" onClick={addTag} className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            Add
          </button>
        </div>
        <ChoiceChips
          items={tags.map((tag) => ({ id: tag, label: tag }))}
          onRemove={(id) => onChange({ tags: tags.filter((tag) => tag !== id) })}
        />
      </Field>
      ) : null}
      {mode === 'all' || mode === 'none' || mode === 'price' ? (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price from (AED)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={badge.priceMin ?? ''}
            onChange={(e) => onChange({ priceMin: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputClass}
            placeholder="Any"
          />
        </Field>
        <Field label="Price to (AED)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={badge.priceMax ?? ''}
            onChange={(e) => onChange({ priceMax: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputClass}
            placeholder="Any"
          />
        </Field>
      </div>
      ) : null}
    </div>
  );
}

function BadgeSelect({ value, onChange, options, placeholder = 'Select' }) {
  return (
    <StoreDropdown
      value={String(value ?? '')}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      triggerClassName="rounded-xl bg-slate-50/50 px-3.5 py-2.5"
    />
  );
}

function BadgePreviewArt({ imageUrl }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#fff7ed,transparent_42%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)]">
      <div className="absolute inset-x-[18%] top-[16%] bottom-[22%] rounded-[28px] bg-gradient-to-br from-slate-200 via-white to-slate-300 shadow-[0_18px_40px_rgba(15,23,42,0.18)]" />
      <div className="absolute left-1/2 top-[28%] h-[38%] w-[38%] -translate-x-1/2 rounded-full bg-slate-900/90 shadow-inner" />
      <div className="absolute left-1/2 top-[36%] h-[18%] w-[18%] -translate-x-1/2 rounded-full bg-slate-500/30" />
    </div>
  );
}

function BadgeStorefrontPreview({
  badges = [],
  imageUrl = '',
  productName = 'Wireless earbuds',
  price = '129',
  compareAt = '189',
  size = 'card',
}) {
  const isDetail = size === 'detail';
  const layoutSize = isDetail ? 'detail' : 'card';

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${isDetail ? 'w-full max-w-[280px]' : 'w-[176px]'}`}>
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <BadgePreviewArt imageUrl={imageUrl} />
        {badges.map((badge) => (
          <span
            key={badge.id}
            className={`pointer-events-none absolute z-20 leading-none ${getBadgePlacementClass(badge, layoutSize)} ${getBadgeSizeClass(badge, layoutSize)} ${getBadgeShadowClass(badge)}`}
            style={getNewBadgeStyle(badge, !isDetail)}
          >
            {badge.label || 'New'}
          </span>
        ))}
        <span className="absolute bottom-2.5 end-2.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-slate-200 bg-white/95 shadow-md">
          <ShoppingCart size={14} className="text-slate-600" />
        </span>
      </div>
      <div className={`${isDetail ? 'p-3.5' : 'p-2.5'}`}>
        <p className={`line-clamp-2 font-semibold leading-tight text-slate-900 ${isDetail ? 'text-sm' : 'text-xs'}`}>
          {productName}
        </p>
        <div className="mt-1 flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, starIndex) => (
            <Star key={starIndex} size={isDetail ? 12 : 10} fill="currentColor" />
          ))}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className={`font-semibold text-slate-950 ${isDetail ? 'text-base' : 'text-sm'}`}>AED {price}</span>
          <span className="text-[11px] text-slate-400 line-through">AED {compareAt}</span>
        </div>
      </div>
    </div>
  );
}

export default function ProductBadgesSettings() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_NEW_TAG_SETTINGS);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [categories, setCategories] = useState([]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await axios.get('/api/store/profile/update', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(normalizeNewTagSettings(res.data?.store?.newTagSettings));
      try {
        const productsRes = await axios.get('/api/products?limit=1&sortBy=newest', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = productsRes.data?.products || productsRes.data;
        const product = Array.isArray(list) ? list[0] : null;
        if (product) setPreviewProduct(product);
      } catch {
        setPreviewProduct(null);
      }
      try {
        const categoriesRes = await axios.get('/api/store/categories', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = categoriesRes.data?.categories || categoriesRes.data || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        setCategories([]);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load badge settings');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateBadge = (index, patch) => {
    setSettings((prev) => {
      const badges = [...(prev.badges || [])];
      if (!badges[index]) return prev;
      badges[index] = { ...badges[index], ...patch };
      return { ...prev, badges };
    });
  };

  const addBadge = () => {
    const badges = settings.badges || [];
    if (badges.length >= MAX_PRODUCT_IMAGE_BADGES) return;
    const nextBadge = createProductImageBadge({}, badges);
    setSettings((prev) => ({ ...prev, badges: [...(prev.badges || []), nextBadge] }));
  };

  const removeBadge = (index) => {
    setSettings((prev) => {
      const badges = (prev.badges || []).filter((_, badgeIndex) => badgeIndex !== index);
      return { ...prev, badges: badges.length ? badges : prev.badges };
    });
  };

  const save = async (event) => {
    event?.preventDefault();
    try {
      setSaving(true);
      const token = await getToken(true);
      if (!token) throw new Error('Your session expired. Please sign in again.');
      await axios.post(
        '/api/store/profile/update',
        { newTagSettings: normalizeNewTagSettings(settings) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success('Badge settings saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to save badge settings');
    } finally {
      setSaving(false);
    }
  };

  const previewImageUrl = previewProduct ? getProductThumbnailUrl(previewProduct) : '';
  const previewName = previewProduct?.name || 'Wireless earbuds';
  const previewPrice = String(Math.round(Number(previewProduct?.price || 129)));
  const previewCompareAt = String(Math.round(Number(previewProduct?.AED || previewProduct?.price || 189)));

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        Loading badge settings…
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <SettingsCard
        title="Product image badges"
        description="Each badge has a condition, then you can limit it to products, categories, tags, and a price range. New product badges hide after the number of days you set. Add up to 8 badges."
      >
        <div className="space-y-3">
          <ToggleRow
            title="Show badges"
            description="Turn off to hide every product image badge on the storefront"
            checked={settings.enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                enabled: e.target.checked,
                showOnImageOverlay: e.target.checked,
              }))
            }
          />
          <ToggleRow
            title="Show on product images"
            description="Overlay the badge on every product image across the storefront"
            checked={settings.showOnImageOverlay}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, showOnImageOverlay: e.target.checked }))
            }
          />
          <Field label="Show new products for how many days">
            <input
              type="number"
              min={1}
              max={365}
              value={settings.displayDays}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  displayDays: e.target.value,
                }))
              }
              className={inputClass}
            />
            <span className="text-xs text-slate-500">
              Used only by badges with the New product condition. Range: 1–365.
            </span>
          </Field>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="mb-3 text-sm font-semibold text-slate-800">Live preview</p>
            <div className="flex flex-wrap items-start gap-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Shop card</p>
                <BadgeStorefrontPreview
                  badges={(settings.badges || []).filter((item) => item.enabled)}
                  imageUrl={previewImageUrl}
                  productName={previewName}
                  price={previewPrice}
                  compareAt={previewCompareAt}
                  size="card"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Product page</p>
                <BadgeStorefrontPreview
                  badges={(settings.badges || []).filter((item) => item.enabled)}
                  imageUrl={previewImageUrl}
                  productName={previewName}
                  price={previewPrice}
                  compareAt={previewCompareAt}
                  size="detail"
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {(settings.badges || []).map((badge, index) => {
        const conditionLabel = BADGE_CONDITION_OPTIONS.find((option) => option.id === (badge.condition || 'new'))?.label || 'New product';

        return (
        <SettingsCard
          key={badge.id || index}
          title={`Badge ${index + 1}`}
          description={index === 0 ? 'Primary badge on the product image.' : 'Place this badge anywhere on the product image.'}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                  <BadgePreviewArt imageUrl={previewImageUrl} />
                  <span
                    className={`pointer-events-none absolute z-10 leading-none ${getBadgePlacementClass(badge, 'thumb')} ${getBadgeSizeClass(badge, 'thumb')} ${getBadgeShadowClass(badge)}`}
                    style={getNewBadgeStyle(badge, true)}
                  >
                    {badge.label || 'New'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{badge.label || 'New'}</p>
                  <p className="truncate text-xs text-slate-500">
                    {conditionLabel}
                    {audienceSummary(badge) ? ` · ${audienceSummary(badge)}` : ''}
                    {badge.enabled ? '' : ' · Hidden'}
                  </p>
                </div>
              </div>
            </div>

            <ToggleRow
              title="Show this badge"
              description="Hide this badge without deleting it"
              checked={badge.enabled}
              onChange={(e) => updateBadge(index, { enabled: e.target.checked })}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="English label">
                <input
                  type="text"
                  value={badge.label}
                  onChange={(e) => updateBadge(index, { label: e.target.value })}
                  className={inputClass}
                  maxLength={24}
                  placeholder="New"
                />
              </Field>
              <Field label="Arabic label">
                <input
                  type="text"
                  dir="rtl"
                  lang="ar"
                  value={badge.labelAr}
                  onChange={(e) => updateBadge(index, { labelAr: e.target.value })}
                  className={inputClass}
                  maxLength={24}
                  placeholder="جديد"
                />
              </Field>
              <Field label="Condition" className="md:col-span-2">
                <BadgeSelect
                  value={badge.condition || 'new'}
                  onChange={(value) => updateBadge(index, { condition: value })}
                  options={toSelectOptions(BADGE_CONDITION_OPTIONS)}
                />
                <span className="text-xs text-slate-500">
                  {BADGE_CONDITION_OPTIONS.find((option) => option.id === (badge.condition || 'new'))?.hint}
                </span>
              </Field>
              {badge.condition === 'low-stock' ? (
                <Field label="Low stock quantity" className="md:col-span-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={badge.conditionValue ?? 5}
                    onChange={(e) => updateBadge(index, { conditionValue: Number(e.target.value) })}
                    className={inputClass}
                  />
                  <span className="text-xs text-slate-500">
                    Show this badge when remaining stock is this number or lower.
                  </span>
                </Field>
              ) : null}
              <BadgeAudienceFields
                badge={badge}
                categories={categories}
                getToken={getToken}
                mode={['none', 'products', 'category', 'tag', 'price'].includes(badge.condition) ? badge.condition : 'all'}
                onChange={(patch) => updateBadge(index, patch)}
              />
              <Field label="Position on image">
                <BadgeSelect
                  value={badge.placement || (badge.position === 'right' ? 'top-right' : 'top-left')}
                  onChange={(value) => updateBadge(index, {
                    placement: value,
                    position: value.includes('right') ? 'right' : 'left',
                  })}
                  options={toSelectOptions(BADGE_PLACEMENT_OPTIONS)}
                />
              </Field>
              <Field label="Shape">
                <BadgeSelect
                  value={badge.shape}
                  onChange={(value) => updateBadge(index, { shape: value })}
                  options={toSelectOptions(BADGE_SHAPE_OPTIONS)}
                />
              </Field>
              <Field label="Size">
                <BadgeSelect
                  value={badge.size || 'medium'}
                  onChange={(value) => updateBadge(index, { size: value })}
                  options={toSelectOptions(BADGE_SIZE_OPTIONS)}
                />
              </Field>
              <Field label="Distance from edge">
                <BadgeSelect
                  value={badge.offset || 'normal'}
                  onChange={(value) => updateBadge(index, { offset: value })}
                  options={toSelectOptions(BADGE_OFFSET_OPTIONS)}
                />
              </Field>
              <Field label="Shadow">
                <BadgeSelect
                  value={badge.shadow || 'soft'}
                  onChange={(value) => updateBadge(index, { shadow: value })}
                  options={toSelectOptions(BADGE_SHADOW_OPTIONS)}
                />
              </Field>
              <Field label="Letter spacing">
                <BadgeSelect
                  value={badge.letterSpacing || 'normal'}
                  onChange={(value) => updateBadge(index, { letterSpacing: value })}
                  options={toSelectOptions(BADGE_LETTER_SPACING_OPTIONS)}
                />
              </Field>
              <Field label="Opacity" className="md:col-span-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={badge.opacity ?? 100}
                    onChange={(e) => updateBadge(index, { opacity: Number(e.target.value) })}
                    className="h-2 w-full accent-indigo-600"
                  />
                  <span className="w-12 text-sm font-medium text-slate-600">{badge.opacity ?? 100}%</span>
                </div>
              </Field>
              <Field label="Font">
                <BadgeSelect
                  value={badge.fontFamily}
                  onChange={(value) => updateBadge(index, { fontFamily: value })}
                  options={toSelectOptions(BADGE_FONT_OPTIONS)}
                />
              </Field>
              <Field label="Font weight">
                <BadgeSelect
                  value={badge.fontWeight}
                  onChange={(value) => updateBadge(index, { fontWeight: value })}
                  options={BADGE_WEIGHT_OPTIONS}
                />
              </Field>
              <Field label="Letters">
                <BadgeSelect
                  value={badge.textTransform}
                  onChange={(value) => updateBadge(index, { textTransform: value })}
                  options={toSelectOptions(BADGE_TEXT_TRANSFORM_OPTIONS)}
                />
              </Field>
              <BadgeColorField
                label="Background"
                value={badge.backgroundColor}
                onChange={(value) => updateBadge(index, { backgroundColor: value })}
                allowTransparent
              />
              <BadgeColorField
                label="Text color"
                value={badge.textColor}
                onChange={(value) => updateBadge(index, { textColor: value })}
              />
              <BadgeBorderWidthField
                value={badge.borderWidth}
                onChange={(value) => updateBadge(index, { borderWidth: value })}
              />
              <BadgeColorField
                label="Border color"
                value={badge.borderColor}
                onChange={(value) => updateBadge(index, { borderColor: value })}
                allowTransparent
                className="md:col-span-2"
              />
            </div>

            {(settings.badges || []).length > 1 ? (
              <button
                type="button"
                onClick={() => removeBadge(index)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 size={13} />
                Delete badge
              </button>
            ) : null}
          </div>
        </SettingsCard>
        );
      })}

      {(settings.badges || []).length < MAX_PRODUCT_IMAGE_BADGES ? (
        <button
          type="button"
          onClick={addBadge}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <Plus size={16} />
          Add another badge
        </button>
      ) : null}

      <div className="sticky bottom-0 z-10 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          A badge shows when its condition matches. Product, category, tag, and price limits are optional.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:mt-0 sm:w-auto"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
