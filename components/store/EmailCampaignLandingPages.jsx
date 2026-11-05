'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Copy, ExternalLink, Eye, GripVertical, ImagePlus, Plus, Search, Trash2, Check, X } from 'lucide-react';
import CampaignPageBannerSlider from '@/components/CampaignPageBannerSlider';
import {
  EMAIL_CAMPAIGN_BANNER_MAX_WIDTH,
  EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS,
  DEFAULT_CAMPAIGN_PAGE_DESIGN,
  campaignPageHasBanner,
  getCampaignPageSectionProductIds,
  normalizeCampaignPageBanners,
} from '@/lib/emailCampaignPageHelpers';

const EMPTY_FORM = {
  title: '',
  titleAr: '',
  slug: '',
  urlPrefix: 'pages',
  design: { ...DEFAULT_CAMPAIGN_PAGE_DESIGN },
  sections: [
    { id: 'banner-slider-1', type: 'bannerSlider', slides: [] },
    { id: 'product-grid-1', type: 'productGrid', title: '', productIds: [], gridColumns: 4, tabletGridColumns: 3, mobileGridColumns: 2, gridGap: 12 },
  ],
  subtitle: '',
  subtitleAr: '',
  heroImage: '',
  banners: normalizeCampaignPageBanners({}),
  productIds: [],
  ctaLabel: '',
  ctaUrl: '',
  backgroundColor: '#f8fafc',
  accentColor: '#0f766e',
  status: 'published',
  seoTitle: '',
  seoDescription: '',
};

function createSectionId(type) {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function safeCampaignPreviewLink(value) {
  const link = String(value || '').trim();
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

const BANNER_SLOTS = [
  { device: 'desktop', language: 'en', label: 'Desktop · English', hint: 'Shown from 1024px and up' },
  { device: 'desktop', language: 'ar', label: 'Desktop · Arabic', hint: 'Shown from 1024px and up for Arabic' },
  { device: 'tablet', language: 'en', label: 'Tablet · English', hint: 'Shown from 768px to 1023px' },
  { device: 'tablet', language: 'ar', label: 'Tablet · Arabic', hint: 'Shown from 768px to 1023px for Arabic' },
  { device: 'mobile', language: 'en', label: 'Mobile · English', hint: 'Shown below 768px' },
  { device: 'mobile', language: 'ar', label: 'Mobile · Arabic', hint: 'Shown below 768px for Arabic' },
];

const BANNER_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.gif,.png,.jpg,.jpeg,.webp';

const PRODUCT_SOURCES = [
  { id: 'search', label: 'Search' },
  { id: 'all', label: 'All products' },
  { id: 'category', label: 'Category' },
  { id: 'brand', label: 'Brand' },
  { id: 'latest', label: 'Latest' },
  { id: 'tag', label: 'Tags' },
];

const SECTION_TEMPLATES = [
  {
    id: 'campaign',
    label: 'Campaign landing',
    description: 'Banner, introduction, and product grid',
    sections: [
      { type: 'bannerSlider', slides: [] },
      { type: 'textBlock', heading: 'A little something special', content: 'Discover hand-picked offers and customer favorites.' },
      { type: 'productGrid', title: 'Featured products', productIds: [], gridColumns: 4, tabletGridColumns: 3, mobileGridColumns: 2, gridGap: 12 },
    ],
  },
  {
    id: 'editorial',
    label: 'Editorial story',
    description: 'Image-led story with a call to action',
    sections: [
      { type: 'image', imageUrl: '', alt: '' },
      { type: 'textBlock', heading: 'The story', content: 'Introduce your collection and share what makes it special.', textSize: 'large' },
      { type: 'button', label: 'Explore the collection', url: '/shop' },
      { type: 'productGrid', title: 'Explore the collection', productIds: [], gridColumns: 4, tabletGridColumns: 3, mobileGridColumns: 2, gridGap: 16 },
    ],
  },
  {
    id: 'promotion',
    label: 'Promotion',
    description: 'Offer message, video, and products',
    sections: [
      { type: 'textBlock', heading: 'Limited-time offer', content: 'Find something you love at a special price.', textSize: 'large' },
      { type: 'button', label: 'Shop the offer', url: '/shop' },
      { type: 'spacer', height: 32 },
      { type: 'productGrid', title: 'Shop offers', productIds: [], gridColumns: 4, tabletGridColumns: 3, mobileGridColumns: 2, gridGap: 12 },
    ],
  },
];

const SECTION_LABELS = {
  bannerSlider: 'Banner slider',
  productGrid: 'Product grid',
  textBlock: 'Text',
  image: 'Image',
  button: 'Button',
  video: 'Video',
  spacer: 'Spacer',
};

function createPageSection(type, design = DEFAULT_CAMPAIGN_PAGE_DESIGN) {
  const id = createSectionId(type);
  const style = {
    backgroundColor: '',
    textColor: '',
    alignment: 'left',
    padding: 16,
    contentWidth: 'full',
  };
  if (type === 'bannerSlider') return { id, type, style, slides: [] };
  if (type === 'productGrid') {
    return {
      id,
      type,
      style,
      title: '',
      gridColumns: design.gridColumns || 4,
      tabletGridColumns: design.tabletGridColumns || 3,
      mobileGridColumns: design.mobileGridColumns || 2,
      productIds: [],
      gridGap: design.gridGap || 12,
    };
  }
  if (type === 'textBlock') return { id, type, style, heading: '', content: '', textSize: 'medium' };
  if (type === 'image') return { id, type, style, imageUrl: '', linkUrl: '', alt: '', imageFit: 'cover' };
  if (type === 'button') return { id, type, style, label: '', url: '', variant: 'solid', size: 'medium' };
  if (type === 'video') return { id, type, style, videoUrl: '', caption: '' };
  if (type === 'spacer') return { id, type, style, height: 48 };
  return null;
}

function isBannerFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  return type.startsWith('image/') || /\.(gif|png|jpe?g|webp)$/i.test(name);
}

async function uploadCampaignBanner(file, getToken) {
  if (!file || !getToken) throw new Error('Upload is not available');
  if (!isBannerFile(file)) throw new Error('Use a JPG, PNG, WebP, or GIF file');
  const token = await getToken();
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', 'email-marketing');
  const response = await fetch('/api/store/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.url) {
    throw new Error(data?.error || 'Upload failed');
  }
  return data.url;
}

function BannerImageField({ label, hint, value, onChange, getToken }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError('');
      const url = await uploadCampaignBanner(file, getToken);
      onChange(url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    handleUpload(file);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">{label}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] font-semibold text-red-600 hover:underline"
          >
            Remove
          </button>
        ) : null}
      </div>
      <label
        className={`mt-2 flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed px-3 py-4 text-center transition ${
          dragActive
            ? 'border-teal-400 bg-teal-50'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
        }}
        onDrop={onDrop}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="max-h-28 w-full max-w-full object-contain" />
        ) : (
          <>
            <ImagePlus className="h-5 w-5 text-slate-400" />
            <p className="mt-2 text-[11px] font-medium text-slate-600">
              {uploading ? 'Uploading…' : dragActive ? 'Drop image or GIF here' : 'Drag and drop or click to upload'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">JPG, PNG, WebP, or GIF</p>
          </>
        )}
        <input
          type="file"
          accept={BANNER_ACCEPT}
          className="sr-only"
          disabled={uploading || !getToken}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            handleUpload(file);
          }}
        />
      </label>
      {uploadError ? <p className="mt-1 text-[11px] text-red-600">{uploadError}</p> : null}
    </div>
  );
}

function CampaignPagePreview({ form, productsBySection, onClose }) {
  const [viewport, setViewport] = useState('desktop');
  const title = form.title || 'Your page title';
  const sections = Array.isArray(form.sections) ? form.sections : [];
  const design = form.design || DEFAULT_CAMPAIGN_PAGE_DESIGN;
  const titleSize = design.titleSize === 'large' ? 'text-3xl' : design.titleSize === 'small' ? 'text-xl' : 'text-2xl';
  const previewWidth = viewport === 'mobile' ? 'max-w-[390px]' : viewport === 'tablet' ? 'max-w-[768px]' : 'max-w-[1200px]';
  const sectionContainerStyle = (section) => ({
    backgroundColor: section.style?.backgroundColor || 'transparent',
    color: section.style?.textColor || undefined,
    textAlign: section.style?.alignment || 'left',
    padding: `${Number(section.style?.padding ?? 16)}px`,
  });
  const previewColumns = (section) => Number(
    viewport === 'mobile'
      ? section.mobileGridColumns || design.mobileGridColumns || 2
      : viewport === 'tablet'
        ? section.tabletGridColumns || design.tabletGridColumns || 3
        : section.gridColumns || design.gridColumns || 4,
  );
  const safeVideoUrl = (value) => /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]{11}|player\.vimeo\.com\/video\/\d{1,15})$/.test(String(value || ''));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Landing page preview">
      <div className="flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">Live page preview</h2>
            <p className="text-xs text-slate-500">/{form.urlPrefix || 'pages'}/{form.slug || 'your-slug'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setViewport('desktop')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewport === 'desktop' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Desktop</button>
            <button type="button" onClick={() => setViewport('tablet')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewport === 'tablet' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Tablet</button>
            <button type="button" onClick={() => setViewport('mobile')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewport === 'mobile' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Mobile</button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close preview"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">
          <div className={`mx-auto min-h-full overflow-hidden rounded-xl shadow ${previewWidth}`} style={{ backgroundColor: form.backgroundColor || '#f8fafc' }}>
            <header className="px-5 py-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: form.accentColor || '#0f766e' }}>Selected for you</p>
              <h1 className={`mt-2 font-bold ${titleSize}`} style={{ textAlign: design.titleAlignment, color: design.titleColor }}>{title}</h1>
              {form.subtitle ? <p className="mt-2 text-sm text-slate-600">{form.subtitle}</p> : null}
            </header>
            <div className="space-y-7 px-4 pb-8 sm:px-8">
              {sections.map((section, index) => {
                if (section.type === 'bannerSlider') {
                  return (
                    <div key={section.id || index} style={sectionContainerStyle(section)}>
                      <CampaignPageBannerSlider slides={section.slides} title={title} />
                    </div>
                  );
                }
                if (section.type === 'productGrid') {
                  const columns = Math.min(6, Math.max(1, previewColumns(section)));
                  const products = productsBySection[section.id] || [];
                  return (
                    <section key={section.id || index} style={sectionContainerStyle(section)}>
                      {section.title ? <h2 className="mb-3 text-lg font-bold" style={{ color: section.style?.textColor || design.titleColor }}>{section.title}</h2> : null}
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${Number(section.gridGap || design.gridGap || 12)}px` }}>
                    {products.length ? products.slice(0, 8).map((product, productIndex) => (
                      <article key={product.id || productIndex} className="overflow-hidden rounded-lg bg-white shadow-sm">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt="" className="aspect-square w-full object-cover" />
                        ) : <div className="aspect-square bg-slate-200" />}
                        <div className="p-2">
                          <p className="line-clamp-2 text-xs font-medium text-slate-800">{product.name || 'Product name'}</p>
                          {product.price ? <p className="mt-1 text-xs font-semibold" style={{ color: form.accentColor }}>{product.price}</p> : null}
                        </div>
                      </article>
                    )) : <p className="col-span-full rounded-lg bg-white/70 p-5 text-center text-sm text-slate-500">Add products to preview the grid.</p>}
                  </div>
                    </section>
                  );
                }
                if (section.type === 'textBlock') {
                  const textSize = section.textSize === 'large' ? 'text-lg' : section.textSize === 'small' ? 'text-xs' : 'text-sm';
                  return (
                    <section key={section.id || index} style={sectionContainerStyle(section)}>
                      {section.heading ? <h2 className="mb-2 text-xl font-bold">{section.heading}</h2> : null}
                      <p className={`${textSize} whitespace-pre-line leading-relaxed`}>{section.content || 'Add your text here.'}</p>
                    </section>
                  );
                }
                if (section.type === 'image') {
                  const image = section.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={section.imageUrl} alt={section.alt || ''} className={`mx-auto max-h-[560px] w-full ${section.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} />
                    : <div className="flex aspect-[16/7] items-center justify-center bg-slate-200 text-sm text-slate-500">Add an image</div>;
                  return (
                    <section key={section.id || index} style={sectionContainerStyle(section)}>
                      {safeCampaignPreviewLink(section.linkUrl) ? <a href={safeCampaignPreviewLink(section.linkUrl)}>{image}</a> : image}
                    </section>
                  );
                }
                if (section.type === 'button') {
                  const buttonSize = section.size === 'large' ? 'px-7 py-3.5 text-base' : section.size === 'small' ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm';
                  return (
                    <section key={section.id || index} style={sectionContainerStyle(section)}>
                      <a href={safeCampaignPreviewLink(section.url) || '#'} className={`inline-flex rounded-full font-semibold ${buttonSize} ${section.variant === 'outline' ? 'border-2 bg-transparent' : 'text-white'}`} style={{ borderColor: form.accentColor, color: section.variant === 'outline' ? form.accentColor : '#fff', backgroundColor: section.variant === 'outline' ? 'transparent' : form.accentColor }}>
                        {section.label || 'Button label'}
                      </a>
                    </section>
                  );
                }
                if (section.type === 'video') {
                  return (
                    <section key={section.id || index} style={sectionContainerStyle(section)}>
                      {safeVideoUrl(section.videoUrl) ? (
                        <iframe src={section.videoUrl} title={section.caption || 'Campaign video'} className="aspect-video w-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      ) : <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-200 text-sm text-slate-500">Add a YouTube or Vimeo URL</div>}
                      {section.caption ? <p className="mt-2 text-sm">{section.caption}</p> : null}
                    </section>
                  );
                }
                if (section.type === 'spacer') {
                  return <div key={section.id || index} aria-hidden="true" style={{ height: `${Number(section.height) || 48}px` }} />;
                }
                return null;
              })}
              {form.ctaLabel && form.ctaUrl ? <a href={form.ctaUrl} className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: form.accentColor }}>{form.ctaLabel}</a> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailCampaignLandingPages({ getToken }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showBanners, setShowBanners] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productSource, setProductSource] = useState('search');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerBrand, setPickerBrand] = useState('');
  const [pickerTagInput, setPickerTagInput] = useState('');
  const [pickerTags, setPickerTags] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState({});
  const [productOverIndex, setProductOverIndex] = useState(null);
  const [selectedGridId, setSelectedGridId] = useState('product-grid-1');
  const productDragIndex = useRef(null);
  const sectionDragId = useRef(null);

  const authHeaders = useCallback(async () => {
    const token = await getToken?.();
    if (!token) throw new Error('Sign in required');
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const headers = await authHeaders();
      const { data } = await axios.get('/api/store/email-marketing/pages', { headers });
      setPages(Array.isArray(data.pages) ? data.pages : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const productGridSections = useMemo(
    () => (Array.isArray(form.sections) ? form.sections : []).filter((section) => section.type === 'productGrid'),
    [form.sections],
  );
  const activeProductGrid = productGridSections.find((section) => section.id === selectedGridId) || productGridSections[0] || null;
  const allSelectedProductIds = useMemo(() => {
    const assigned = getCampaignPageSectionProductIds(form.sections);
    return assigned.length ? assigned : (form.productIds || []);
  }, [form.sections, form.productIds]);
  const selectedProducts = useMemo(
    () => (activeProductGrid?.productIds || [])
      .map((id) => selectedMeta[id] || { id, name: id })
      .filter(Boolean),
    [activeProductGrid?.productIds, selectedMeta],
  );
  const previewProductsBySection = useMemo(() => Object.fromEntries(
    productGridSections.map((section) => [
      section.id,
      (section.productIds || [])
        .map((id) => selectedMeta[id] || { id, name: id })
        .filter(Boolean),
    ]),
  ), [productGridSections, selectedMeta]);
  const allGridProducts = useMemo(
    () => allSelectedProductIds
      .map((id) => selectedMeta[id] || { id, name: id })
      .filter(Boolean),
    [allSelectedProductIds, selectedMeta],
  );

  useEffect(() => {
    if (!allSelectedProductIds.length || !getToken) return undefined;
    const missing = allSelectedProductIds.filter((id) => !selectedMeta[id]?.name);
    if (!missing.length) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const chunkSize = 80;
        const found = [];
        for (let i = 0; i < missing.length; i += chunkSize) {
          const chunk = missing.slice(i, i + chunkSize);
          const { data } = await axios.get(
            `/api/store/email-marketing/products?ids=${encodeURIComponent(chunk.join(','))}&limit=${chunk.length}`,
            { headers },
          );
          if (cancelled) return;
          found.push(...(Array.isArray(data.products) ? data.products : []));
        }
        if (cancelled) return;
        setSelectedMeta((prev) => {
          const next = { ...prev };
          found.forEach((product) => {
            const id = String(product.id || product._id || '');
            if (!id) return;
            next[id] = {
              id,
              name: product.name || '',
              image: product.image || '',
              price: product.price,
            };
          });
          return next;
        });
      } catch {
        // ignore hydrate failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allSelectedProductIds.join('|'), getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const { data } = await axios.get('/api/store/email-marketing/products?catalog=1&limit=8', { headers });
        if (cancelled) return;
        setCatalogCategories(Array.isArray(data.categories) ? data.categories : []);
        setCatalogBrands(Array.isArray(data.brands) ? data.brands : []);
      } catch {
        if (!cancelled) {
          setCatalogCategories([]);
          setCatalogBrands([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    const q = productSearch.trim();
    const params = new URLSearchParams({ limit: '48' });
    if (productSource === 'search') {
      if (q.length < 2) {
        setSearchResults([]);
        return undefined;
      }
      params.set('q', q);
    } else if (productSource === 'all' || productSource === 'latest') {
      params.set('source', productSource);
    } else if (productSource === 'category') {
      if (!pickerCategory) {
        setSearchResults([]);
        return undefined;
      }
      params.set('category', pickerCategory);
    } else if (productSource === 'brand') {
      if (!pickerBrand) {
        setSearchResults([]);
        return undefined;
      }
      params.set('brand', pickerBrand);
    } else if (productSource === 'tag') {
      if (!pickerTags.length) {
        setSearchResults([]);
        return undefined;
      }
      params.set('tags', pickerTags.join(','));
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const headers = await authHeaders();
        const { data } = await axios.get(`/api/store/email-marketing/products?${params.toString()}`, { headers });
        if (!cancelled) setSearchResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, productSource === 'search' ? 280 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productSearch, productSource, pickerCategory, pickerBrand, pickerTags, authHeaders]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (productGridSections.some((section) => section.id === selectedGridId)) return;
    setSelectedGridId(productGridSections[0]?.id || '');
  }, [productGridSections, selectedGridId]);

  const setBanner = (device, language, value) => {
    setForm((prev) => {
      const banners = normalizeCampaignPageBanners(prev.banners, prev.heroImage);
      const nextBanners = {
        ...banners,
        [device]: {
          ...banners[device],
          [language]: String(value || '').trim(),
        },
      };
      return {
        ...prev,
        banners: nextBanners,
        heroImage: nextBanners.desktop.en || prev.heroImage || '',
      };
    });
  };

  const startCreate = () => {
    setEditingId(null);
    setSelectedGridId('product-grid-1');
    setForm({
      ...EMPTY_FORM,
      design: { ...DEFAULT_CAMPAIGN_PAGE_DESIGN },
      sections: EMPTY_FORM.sections.map((section) => ({ ...section, slides: section.slides ? [] : undefined })),
      banners: normalizeCampaignPageBanners({}),
      productIds: [],
    });
    setShowBanners(false);
    setPreviewOpen(false);
    setStatusMessage('');
    setError('');
  };

  const startEdit = (page) => {
    setEditingId(page.id);
    const savedProductIds = Array.isArray(page.productIds) ? page.productIds : [];
    let sections = Array.isArray(page.sections) ? page.sections : [];
    const grids = sections.filter((section) => section.type === 'productGrid');
    if (!grids.length && savedProductIds.length) {
      sections = [
        ...sections,
        createPageSection('productGrid', page.design || DEFAULT_CAMPAIGN_PAGE_DESIGN),
      ];
    }
    const hasAssignedGridProducts = sections.some(
      (section) => section.type === 'productGrid' && Array.isArray(section.productIds) && section.productIds.length,
    );
    let assignedLegacyProducts = false;
    sections = sections.map((section) => {
      if (section.type !== 'productGrid') return section;
      if (hasAssignedGridProducts || (Array.isArray(section.productIds) && section.productIds.length)) {
        return { ...section, productIds: section.productIds || [] };
      }
      if (assignedLegacyProducts || !savedProductIds.length) return { ...section, productIds: [] };
      assignedLegacyProducts = true;
      return { ...section, productIds: savedProductIds };
    });
    const firstGrid = sections.find((section) => section.type === 'productGrid');
    setSelectedGridId(firstGrid?.id || '');
    setForm({
      title: page.title || '',
      titleAr: page.titleAr || '',
      slug: page.slug || '',
      urlPrefix: page.urlPrefix || 'c',
      design: page.design || { ...DEFAULT_CAMPAIGN_PAGE_DESIGN },
      sections,
      subtitle: page.subtitle || '',
      subtitleAr: page.subtitleAr || '',
      heroImage: page.heroImage || '',
      banners: normalizeCampaignPageBanners(page.banners, page.heroImage),
      productIds: getCampaignPageSectionProductIds(sections).length
        ? getCampaignPageSectionProductIds(sections)
        : savedProductIds,
      ctaLabel: page.ctaLabel || '',
      ctaUrl: page.ctaUrl || '',
      backgroundColor: page.backgroundColor || '#f8fafc',
      accentColor: page.accentColor || '#0f766e',
      status: page.status || 'draft',
      seoTitle: page.seoTitle || '',
      seoDescription: page.seoDescription || '',
    });
    setShowBanners(campaignPageHasBanner(page.banners, page.heroImage));
    setPreviewOpen(false);
    setStatusMessage('');
    setError('');
  };

  const updateSection = (sectionId, update) => {
    setForm((prev) => {
      const sections = (prev.sections || []).map((section) => (
        section.id === sectionId ? update(section) : section
      ));
      return {
        ...prev,
        sections,
        productIds: sections.some((section) => section.type === 'productGrid')
          ? getCampaignPageSectionProductIds(sections)
          : prev.productIds,
      };
    });
  };

  const addSection = (type) => {
    const section = createPageSection(type, form.design || DEFAULT_CAMPAIGN_PAGE_DESIGN);
    if (!section) return;
    if (type === 'productGrid') setSelectedGridId(section.id);
    setForm((prev) => {
      const sections = Array.isArray(prev.sections) ? prev.sections : [];
      if (sections.length >= 12) return prev;
      return { ...prev, sections: [...sections, section] };
    });
  };

  const applySectionTemplate = (template) => {
    const sections = template.sections.map((section) => ({
      ...section,
      id: createSectionId(section.type),
      style: { backgroundColor: '', textColor: '', alignment: 'left', padding: 16, contentWidth: 'full' },
      slides: section.slides ? [] : undefined,
    }));
    setSelectedGridId(sections.find((section) => section.type === 'productGrid')?.id || '');
    setForm((prev) => ({
      ...prev,
      sections,
      productIds: getCampaignPageSectionProductIds(sections),
    }));
  };

  const removeSection = (sectionId) => {
    setForm((prev) => {
      const sections = (prev.sections || []).filter((section) => section.id !== sectionId);
      return {
        ...prev,
        sections,
        productIds: (prev.sections || []).some((section) => section.id === sectionId && section.type === 'productGrid')
          ? getCampaignPageSectionProductIds(sections)
          : prev.productIds,
      };
    });
  };

  const moveSection = (fromIndex, toIndex) => {
    setForm((prev) => {
      const sections = [...(prev.sections || [])];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= sections.length || toIndex >= sections.length || fromIndex === toIndex) return prev;
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      return { ...prev, sections };
    });
  };

  const rememberProducts = (products) => {
    setSelectedMeta((prev) => {
      const next = { ...prev };
      products.forEach((product) => {
        const id = String(product.id || product._id || '');
        if (!id) return;
        next[id] = {
          id,
          name: product.name || '',
          image: product.image || '',
          price: product.price,
        };
      });
      return next;
    });
  };

  const addProducts = (products) => {
    const incoming = (products || []).map((product) => ({
      ...product,
      id: String(product.id || product._id || ''),
    })).filter((product) => product.id);
    if (!incoming.length || !activeProductGrid) return;
    const activeIds = new Set(activeProductGrid.productIds || []);
    const gridIds = productGridSections.flatMap((section) => section.productIds || []);
    const pageIds = new Set(gridIds);
    incoming.forEach((product) => {
      if (!activeIds.has(product.id)) pageIds.add(product.id);
    });
    if (pageIds.size > EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS) {
      setError(`A page can contain up to ${EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS} unique products across its grids.`);
      return;
    }
    rememberProducts(incoming);
    setForm((prev) => {
      const sections = (prev.sections || []).map((section) => {
        if (section.id !== activeProductGrid.id) return section;
        const nextIds = [...(section.productIds || [])];
        incoming.forEach((product) => {
          if (!nextIds.includes(product.id)) nextIds.push(product.id);
        });
        return { ...section, productIds: nextIds };
      });
      return {
        ...prev,
        sections,
        productIds: getCampaignPageSectionProductIds(sections),
      };
    });
  };

  const pickerQuery = () => {
    const params = new URLSearchParams();
    const q = productSearch.trim();
    if (productSource === 'search') {
      if (q.length < 2) return null;
      params.set('q', q);
    } else if (productSource === 'all' || productSource === 'latest') {
      params.set('source', productSource);
    } else if (productSource === 'category') {
      if (!pickerCategory) return null;
      params.set('category', pickerCategory);
    } else if (productSource === 'brand') {
      if (!pickerBrand) return null;
      params.set('brand', pickerBrand);
    } else if (productSource === 'tag') {
      if (!pickerTags.length) return null;
      params.set('tags', pickerTags.join(','));
    }
    return params;
  };

  const selectAllProducts = async () => {
    const params = pickerQuery();
    if (!params) return;
    params.set('all', '1');
    params.set('limit', String(EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS));
    try {
      setSelectingAll(true);
      const headers = await authHeaders();
      const { data } = await axios.get(`/api/store/email-marketing/products?${params.toString()}`, { headers });
      addProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to select products');
    } finally {
      setSelectingAll(false);
    }
  };

  const addPickerTag = (raw) => {
    const parts = String(raw || '').split(/[,\n،]/).map((tag) => tag.trim()).filter(Boolean);
    if (!parts.length) return;
    setPickerTags((prev) => {
      const next = [...prev];
      parts.forEach((tag) => {
        if (!next.some((item) => item.toLowerCase() === tag.toLowerCase())) next.push(tag);
      });
      return next.slice(0, 40);
    });
    setPickerTagInput('');
  };

  const moveSelectedProduct = (fromIndex, toIndex) => {
    setForm((prev) => {
      const section = (prev.sections || []).find((item) => item.id === activeProductGrid?.id);
      const ids = [...(section?.productIds || [])];
      if (
        !Number.isFinite(fromIndex)
        || !Number.isFinite(toIndex)
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= ids.length
        || toIndex >= ids.length
        || fromIndex === toIndex
      ) {
        return prev;
      }
      const [id] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, id);
      const sections = (prev.sections || []).map((item) => item.id === activeProductGrid?.id
        ? { ...item, productIds: ids }
        : item);
      return {
        ...prev,
        sections,
        productIds: getCampaignPageSectionProductIds(sections),
      };
    });
  };

  const toggleProduct = (product) => {
    const id = String(product.id || product._id || '');
    if (!id || !activeProductGrid) return;
    const targetIds = activeProductGrid.productIds || [];
    const exists = targetIds.includes(id);
    const allIds = new Set(productGridSections.flatMap((section) => section.productIds || []));
    if (!exists && !allIds.has(id) && allIds.size >= EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS) {
      setError(`A page can contain up to ${EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS} unique products across its grids.`);
      return;
    }
    setSelectedMeta((prev) => ({
      ...prev,
      [id]: {
        id,
        name: product.name || '',
        image: product.image || '',
        price: product.price,
      },
    }));
    setForm((prev) => {
      const sections = (prev.sections || []).map((section) => {
        if (section.id !== activeProductGrid.id) return section;
        return {
          ...section,
          productIds: exists ? targetIds.filter((item) => item !== id) : [...targetIds, id],
        };
      });
      return {
        ...prev,
        sections,
        productIds: getCampaignPageSectionProductIds(sections),
      };
    });
  };

  const chooseProductGrid = (gridId) => {
    setSelectedGridId(gridId);
    document.getElementById('campaign-grid-product-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const savePage = async () => {
    try {
      setSaving(true);
      setError('');
      setStatusMessage('');
      const headers = await authHeaders();
      const payload = { ...form };
      if (editingId) {
        const { data } = await axios.patch(
          `/api/store/email-marketing/pages/${editingId}`,
          payload,
          { headers },
        );
        setStatusMessage('Page updated.');
        if (data.page) startEdit(data.page);
      } else {
        const { data } = await axios.post('/api/store/email-marketing/pages', payload, { headers });
        setStatusMessage('Page created.');
        if (data.page) startEdit(data.page);
      }
      await loadPages();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (page) => {
    if (!window.confirm(`Delete landing page “${page.title}”?`)) return;
    try {
      const headers = await authHeaders();
      await axios.delete(`/api/store/email-marketing/pages/${page.id}`, { headers });
      if (editingId === page.id) startCreate();
      await loadPages();
      setStatusMessage('Page deleted.');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to delete page');
    }
  };

  const copyLink = async (page) => {
    if (page.status !== 'published') {
      setError(`This page is still a Draft. Set status to Published and save — then the ${page.publicPath || `/c/${page.slug}`} link will work.`);
      return;
    }
    const url = page.publicUrl || '';
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(page.id);
      setError('');
      window.setTimeout(() => setCopiedId(''), 1600);
    } catch {
      setError('Could not copy link');
    }
  };

  const publishPage = async (page) => {
    try {
      setSaving(true);
      setError('');
      const headers = await authHeaders();
      const { data } = await axios.patch(
        `/api/store/email-marketing/pages/${page.id}`,
        { status: 'published' },
        { headers },
      );
      setStatusMessage(`Published. Public link: ${data?.page?.publicUrl || page.publicUrl || page.publicPath || `/c/${page.slug}`}`);
      await loadPages();
      if (data?.page) startEdit(data.page);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {pages.length} page{pages.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          New page
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</div>
      ) : null}

      <section>
        {loading ? (
          <p className="text-sm text-slate-500">Loading pages…</p>
        ) : pages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No landing pages yet</p>
            <p className="mt-1 text-sm text-slate-500">Create one, add the products from your email, then publish the link.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const selected = editingId === page.id;
              const published = page.status === 'published';
              return (
                <article
                  key={page.id}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                    selected ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => startEdit(page)}
                    className="block w-full px-4 pb-3 pt-4 text-start"
                  >
                    <span
                      className="mb-3 block h-1.5 w-14 rounded-full"
                      style={{ backgroundColor: page.accentColor || '#0f766e' }}
                    />
                    <span className="block truncate text-base font-semibold text-slate-900">{page.title}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {published ? 'Published' : 'Draft'}
                      </span>
                      <span>{page.productCount} products</span>
                    </span>
                    <span className="mt-2 block truncate font-mono text-[11px] text-slate-400">{page.publicPath || `/c/${page.slug}`}</span>
                  </button>
                  <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
                    {!published ? (
                      <button
                        type="button"
                        onClick={() => publishPage(page)}
                        disabled={saving}
                        className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        Publish
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Copy public link"
                      onClick={() => copyLink(page)}
                      className="ms-auto rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    >
                      {copiedId === page.id ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    {published ? (
                      <a
                        href={page.publicPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                        title="Open page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => deletePage(page)}
                      className="rounded-full p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit page' : 'New page'}</h3>
            <p className="mt-0.5 text-xs text-slate-500">/{form.urlPrefix || 'c'}/{form.slug || 'your-slug'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" />
              Live preview
            </button>
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              {['draft', 'published'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setField('status', status)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                    form.status === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {form.status !== 'published' ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This draft is not public yet. Switch to Published and save before sharing the link.
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Public after save: /{form.urlPrefix || 'c'}/{form.slug || 'your-slug'}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title (English)
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className={fieldClass}
                placeholder="Weekend picks"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title (Arabic)
              <input
                value={form.titleAr}
                onChange={(e) => setField('titleAr', e.target.value)}
                dir="rtl"
                className={fieldClass}
                placeholder="اختياري"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 lg:col-span-2">
              Subtitle
              <input
                value={form.subtitle}
                onChange={(e) => setField('subtitle', e.target.value)}
                className={fieldClass}
                placeholder="Only the products from this email"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              URL slug
              <input
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                className={`${fieldClass} font-mono`}
                placeholder="weekend-picks"
              />
            </label>
            {form.design ? (
              <fieldset className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  New page design
                </legend>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title alignment
                  <select
                    value={form.design.titleAlignment}
                    onChange={(e) => setField('design', { ...form.design, titleAlignment: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title size
                  <select
                    value={form.design.titleSize}
                    onChange={(e) => setField('design', { ...form.design, titleSize: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <input
                    type="color"
                    value={form.design.titleColor}
                    onChange={(e) => setField('design', { ...form.design, titleColor: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    aria-label="Title color"
                  />
                  <span className="text-xs font-medium text-slate-600">Title color</span>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Desktop grid columns
                  <select
                    value={form.design.gridColumns}
                    onChange={(e) => setField('design', { ...form.design, gridColumns: Number(e.target.value) })}
                    className={fieldClass}
                  >
                    {[2, 3, 4, 5, 6].map((columns) => (
                      <option key={columns} value={columns}>{columns}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tablet grid columns
                  <select
                    value={form.design.tabletGridColumns || 3}
                    onChange={(e) => setField('design', { ...form.design, tabletGridColumns: Number(e.target.value) })}
                    className={fieldClass}
                  >
                    {[1, 2, 3, 4, 5, 6].map((columns) => (
                      <option key={columns} value={columns}>{columns}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mobile grid columns
                  <select
                    value={form.design.mobileGridColumns || 2}
                    onChange={(e) => setField('design', { ...form.design, mobileGridColumns: Number(e.target.value) })}
                    className={fieldClass}
                  >
                    {[1, 2, 3].map((columns) => (
                      <option key={columns} value={columns}>{columns}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product grid spacing
                  <select
                    value={form.design.gridGap}
                    onChange={(e) => setField('design', { ...form.design, gridGap: Number(e.target.value) })}
                    className={fieldClass}
                  >
                    {[8, 12, 16, 24].map((gap) => (
                      <option key={gap} value={gap}>{gap}px</option>
                    ))}
                  </select>
                </label>
              </fieldset>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
                <input
                  type="color"
                  value={form.backgroundColor || '#f8fafc'}
                  onChange={(e) => setField('backgroundColor', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label="Background color"
                />
                <span className="text-xs font-medium text-slate-600">Page background</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
                <input
                  type="color"
                  value={form.accentColor || '#0f766e'}
                  onChange={(e) => setField('accentColor', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label="Accent color"
                />
                <span className="text-xs font-medium text-slate-600">Accent</span>
              </label>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Button label
              <input
                value={form.ctaLabel}
                onChange={(e) => setField('ctaLabel', e.target.value)}
                className={fieldClass}
                placeholder="Shop all deals"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Button link
              <input
                value={form.ctaUrl}
                onChange={(e) => setField('ctaUrl', e.target.value)}
                className={fieldClass}
                placeholder="https://www.store1920.com/shop"
              />
            </label>
          </div>

          <div>
              {!showBanners ? (
                <button
                  type="button"
                  onClick={() => setShowBanners(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Add banner
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Banners (optional)</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Drag and drop or click to upload JPG, PNG, WebP, or GIF. English and Arabic for desktop, tablet, and mobile.
                        Max width on the public page is {EMAIL_CAMPAIGN_BANNER_MAX_WIDTH}px. Empty slots fall back to the next available image.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBanners(false)}
                      className="shrink-0 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {BANNER_SLOTS.map((slot) => (
                      <BannerImageField
                        key={`${slot.device}-${slot.language}`}
                        label={slot.label}
                        hint={slot.hint}
                        value={form.banners?.[slot.device]?.[slot.language] || ''}
                        onChange={(url) => setBanner(slot.device, slot.language, url)}
                        getToken={getToken}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          {Array.isArray(form.sections) ? (
            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
              {!editingId ? (
                <div className="rounded-2xl bg-slate-50 p-3">
                  <h4 className="text-xs font-semibold text-slate-800">Start with a template</h4>
                  <p className="mt-1 text-[11px] text-slate-500">Choose a reusable layout. This replaces the current section list.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SECTION_TEMPLATES.map((template) => (
                      <button key={template.id} type="button" onClick={() => applySectionTemplate(template)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-start hover:border-teal-400">
                        <span className="block text-xs font-semibold text-slate-800">{template.label}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{template.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Page sections</h4>
                  <p className="mt-0.5 text-xs text-slate-500">Add content widgets and drag sections to reorder them. Changes update the preview immediately.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SECTION_LABELS).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addSection(type)}
                      disabled={form.sections.length >= 12}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {form.sections.map((section, sectionIndex) => (
                <article
                  key={section.id}
                  draggable
                  onDragStart={(event) => {
                    sectionDragId.current = section.id;
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = form.sections.findIndex((item) => item.id === sectionDragId.current);
                    moveSection(fromIndex, sectionIndex);
                    sectionDragId.current = null;
                  }}
                  onDragEnd={() => { sectionDragId.current = null; }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 cursor-grab text-slate-400" />
                      <span className="text-xs font-semibold text-slate-800">
                        {`${SECTION_LABELS[section.type] || 'Section'} ${form.sections.slice(0, sectionIndex + 1).filter((item) => item.type === section.type).length}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => moveSection(sectionIndex, sectionIndex - 1)} disabled={sectionIndex === 0} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 disabled:opacity-40">Move up</button>
                      <button type="button" onClick={() => moveSection(sectionIndex, sectionIndex + 1)} disabled={sectionIndex === form.sections.length - 1} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 disabled:opacity-40">Move down</button>
                      <button type="button" onClick={() => removeSection(section.id)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50" aria-label="Remove section"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {section.type === 'bannerSlider' ? (
                    <div className="space-y-3">
                      {(section.slides || []).map((slide, slideIndex) => (
                        <div key={slide.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                          <BannerImageField
                            label={`Slide ${slideIndex + 1}`}
                            hint="Recommended: wide image, up to 1400px"
                            value={slide.imageUrl}
                            onChange={(imageUrl) => updateSection(section.id, (current) => ({
                              ...current,
                              slides: current.slides.map((item) => item.id === slide.id ? { ...item, imageUrl } : item),
                            }))}
                            getToken={getToken}
                          />
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-600">
                              Slide link (optional)
                              <input value={slide.linkUrl || ''} onChange={(event) => updateSection(section.id, (current) => ({
                                ...current,
                                slides: current.slides.map((item) => item.id === slide.id ? { ...item, linkUrl: event.target.value } : item),
                              }))} className={fieldClass} placeholder="/shop or https://example.com" />
                            </label>
                            <label className="block text-xs font-medium text-slate-600">
                              Image description (optional)
                              <input value={slide.alt || ''} onChange={(event) => updateSection(section.id, (current) => ({
                                ...current,
                                slides: current.slides.map((item) => item.id === slide.id ? { ...item, alt: event.target.value } : item),
                              }))} className={fieldClass} placeholder="Banner image description" />
                            </label>
                            <button type="button" onClick={() => updateSection(section.id, (current) => ({
                              ...current,
                              slides: current.slides.filter((item) => item.id !== slide.id),
                            }))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remove slide</button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        disabled={(section.slides || []).length >= 12}
                        onClick={() => updateSection(section.id, (current) => ({
                          ...current,
                          slides: [...(current.slides || []), { id: createSectionId('slide'), imageUrl: '', linkUrl: '', alt: '' }],
                        }))}
                        className="rounded-full border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                      >
                        <Plus className="mr-1 inline h-3.5 w-3.5" /> Add slide ({(section.slides || []).length}/12)
                      </button>
                    </div>
                  ) : section.type === 'productGrid' ? (
                    <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-xs font-medium text-slate-600">
                        Section heading (optional)
                        <input value={section.title || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, title: event.target.value }))} className={fieldClass} placeholder="Featured products" />
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Desktop columns
                        <select value={section.gridColumns || 4} onChange={(event) => updateSection(section.id, (current) => ({ ...current, gridColumns: Number(event.target.value) }))} className={fieldClass}>
                          {[2, 3, 4, 5, 6].map((columns) => <option key={columns} value={columns}>{columns}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Tablet columns
                        <select value={section.tabletGridColumns || 3} onChange={(event) => updateSection(section.id, (current) => ({ ...current, tabletGridColumns: Number(event.target.value) }))} className={fieldClass}>
                          {[1, 2, 3, 4, 5, 6].map((columns) => <option key={columns} value={columns}>{columns}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Mobile columns
                        <select value={section.mobileGridColumns || 2} onChange={(event) => updateSection(section.id, (current) => ({ ...current, mobileGridColumns: Number(event.target.value) }))} className={fieldClass}>
                          {[1, 2, 3].map((columns) => <option key={columns} value={columns}>{columns}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Grid spacing
                        <select value={section.gridGap || 12} onChange={(event) => updateSection(section.id, (current) => ({ ...current, gridGap: Number(event.target.value) }))} className={fieldClass}>
                          {[8, 12, 16, 24].map((gap) => <option key={gap} value={gap}>{gap}px</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2">
                      <p className="text-xs text-teal-900">{(section.productIds || []).length} products selected for this grid</p>
                      <button type="button" onClick={() => chooseProductGrid(section.id)} className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">
                        Choose products for this grid
                      </button>
                    </div>
                    </>
                  ) : section.type === 'textBlock' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-slate-600">
                        Heading
                        <input value={section.heading || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, heading: event.target.value }))} className={fieldClass} placeholder="A section heading" />
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Text size
                        <select value={section.textSize || 'medium'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, textSize: event.target.value }))} className={fieldClass}>
                          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                        Text
                        <textarea value={section.content || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, content: event.target.value }))} className={`${fieldClass} min-h-28`} placeholder="Write the content for this section" />
                      </label>
                    </div>
                  ) : section.type === 'image' ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <BannerImageField
                        label="Section image"
                        hint="Upload an image or drag it into this area"
                        value={section.imageUrl || ''}
                        onChange={(imageUrl) => updateSection(section.id, (current) => ({ ...current, imageUrl }))}
                        getToken={getToken}
                      />
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-600">
                          Image link (optional)
                          <input value={section.linkUrl || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, linkUrl: event.target.value }))} className={fieldClass} placeholder="/shop or https://example.com" />
                        </label>
                        <label className="block text-xs font-medium text-slate-600">
                          Alt text
                          <input value={section.alt || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, alt: event.target.value }))} className={fieldClass} placeholder="Describe the image" />
                        </label>
                        <label className="block text-xs font-medium text-slate-600">
                          Image fit
                          <select value={section.imageFit || 'cover'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, imageFit: event.target.value }))} className={fieldClass}>
                            <option value="cover">Fill area</option><option value="contain">Fit whole image</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ) : section.type === 'button' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-slate-600">
                        Button label
                        <input value={section.label || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, label: event.target.value }))} className={fieldClass} placeholder="Shop now" />
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Button URL
                        <input value={section.url || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, url: event.target.value }))} className={fieldClass} placeholder="/shop" />
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Style
                        <select value={section.variant || 'solid'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, variant: event.target.value }))} className={fieldClass}>
                          <option value="solid">Filled</option><option value="outline">Outline</option>
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Size
                        <select value={section.size || 'medium'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, size: event.target.value }))} className={fieldClass}>
                          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                        </select>
                      </label>
                    </div>
                  ) : section.type === 'video' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-slate-600">
                        YouTube or Vimeo URL
                        <input value={section.videoUrl || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, videoUrl: event.target.value }))} className={fieldClass} placeholder="https://youtu.be/…" />
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        Caption (optional)
                        <input value={section.caption || ''} onChange={(event) => updateSection(section.id, (current) => ({ ...current, caption: event.target.value }))} className={fieldClass} placeholder="Video caption" />
                      </label>
                    </div>
                  ) : section.type === 'spacer' ? (
                    <label className="block max-w-xs text-xs font-medium text-slate-600">
                      Spacer height
                      <select value={section.height || 48} onChange={(event) => updateSection(section.id, (current) => ({ ...current, height: Number(event.target.value) }))} className={fieldClass}>
                        {[16, 24, 32, 48, 64, 96, 128].map((height) => <option key={height} value={height}>{height}px</option>)}
                      </select>
                    </label>
                  ) : null}
                  {section.type !== 'spacer' ? (
                    <fieldset className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
                      <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Style and layout</legend>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                        <input type="color" value={section.style?.backgroundColor || '#ffffff'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, style: { ...current.style, backgroundColor: event.target.value } }))} className="h-7 w-7 rounded border-0 bg-transparent p-0" />
                        <span className="text-[11px] text-slate-600">Background</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                        <input type="color" value={section.style?.textColor || '#0f172a'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, style: { ...current.style, textColor: event.target.value } }))} className="h-7 w-7 rounded border-0 bg-transparent p-0" />
                        <span className="text-[11px] text-slate-600">Text color</span>
                      </label>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Alignment
                        <select value={section.style?.alignment || 'left'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, style: { ...current.style, alignment: event.target.value } }))} className={fieldClass}>
                          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                        </select>
                      </label>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Padding
                        <select value={section.style?.padding ?? 16} onChange={(event) => updateSection(section.id, (current) => ({ ...current, style: { ...current.style, padding: Number(event.target.value) } }))} className={fieldClass}>
                          {[0, 8, 16, 24, 32, 48].map((padding) => <option key={padding} value={padding}>{padding}px</option>)}
                        </select>
                      </label>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Content width
                        <select value={section.style?.contentWidth || 'full'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, style: { ...current.style, contentWidth: event.target.value } }))} className={fieldClass}>
                          <option value="narrow">Narrow</option><option value="normal">Normal</option><option value="wide">Wide</option><option value="full">Full width</option>
                        </select>
                      </label>
                    </fieldset>
                  ) : null}
                  {section.type === 'spacer' ? (
                    <label className="mt-3 block max-w-xs text-xs font-medium text-slate-600">
                      Background color (optional)
                      <input type="color" value={section.style?.backgroundColor || '#ffffff'} onChange={(event) => updateSection(section.id, (current) => ({ ...current, style: { ...current.style, backgroundColor: event.target.value } }))} className="mt-1 h-9 w-12 rounded border-0 bg-transparent p-0" />
                    </label>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
          <div id="campaign-grid-product-picker" className="rounded-3xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Choose products for a grid ({allGridProducts.length}/{EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS} unique products on this page)
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Choose a product grid, then add or remove products for that grid. Each grid can contain different products.</p>
              </div>
              {selectedProducts.length > 1 ? (
                <p className="text-[11px] text-slate-500">Drag to reorder this grid.</p>
              ) : null}
            </div>

            {productGridSections.length ? (
              <label className="block max-w-lg text-xs font-medium text-slate-600">
                Product grid
                <select
                  value={activeProductGrid?.id || ''}
                  onChange={(event) => setSelectedGridId(event.target.value)}
                  className={fieldClass}
                >
                  {productGridSections.map((section, index) => (
                    <option key={section.id} value={section.id}>
                      {section.title || `Product grid ${index + 1}`} ({(section.productIds || []).length} products)
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-900">Add a Product grid section before selecting products.</p>
                <button type="button" onClick={() => addSection('productGrid')} disabled={form.sections.length >= 12} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  Add product grid
                </button>
              </div>
            )}

            {selectedProducts.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    draggable
                    onDragStart={(event) => {
                      productDragIndex.current = index;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (productOverIndex !== index) setProductOverIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = productDragIndex.current ?? Number(event.dataTransfer.getData('text/plain'));
                      moveSelectedProduct(from, index);
                      productDragIndex.current = null;
                      setProductOverIndex(null);
                    }}
                    onDragEnd={() => {
                      productDragIndex.current = null;
                      setProductOverIndex(null);
                    }}
                    className={`inline-flex max-w-full cursor-grab items-center gap-2 rounded-full border bg-white px-2.5 py-1 text-xs text-slate-800 active:cursor-grabbing ${
                      productOverIndex === index ? 'border-teal-500 bg-teal-50' : 'border-teal-200'
                    }`}
                  >
                    <span className="select-none text-slate-300" aria-hidden="true">⋮⋮</span>
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" className="h-5 w-5 rounded object-cover" />
                    ) : null}
                    <span className="truncate">{product.name || product.id}</span>
                    <button
                      type="button"
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      onClick={() => toggleProduct(product)}
                      className="text-slate-400 hover:text-slate-700"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Search below and click each product to add it to the selected grid.</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_SOURCES.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setProductSource(source.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    productSource === source.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>

            {productSource === 'search' ? (
              <label className="relative block">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-8 pe-3 text-sm"
                />
              </label>
            ) : null}

            {productSource === 'category' ? (
              <select
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a category…</option>
                {catalogCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            ) : null}

            {productSource === 'brand' ? (
              <select
                value={pickerBrand}
                onChange={(e) => setPickerBrand(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a brand…</option>
                {catalogBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            ) : null}

            {productSource === 'tag' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {pickerTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPickerTags((prev) => prev.filter((item) => item !== tag))}
                      className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
                <input
                  value={pickerTagInput}
                  onChange={(e) => setPickerTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addPickerTag(pickerTagInput);
                    }
                  }}
                  onBlur={() => addPickerTag(pickerTagInput)}
                  placeholder="Type a tag, then press Enter"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            ) : null}

            {productSource === 'all' || productSource === 'latest' ? (
              <p className="text-xs text-slate-500">
                {productSource === 'latest' ? 'Newest products in the catalog.' : 'Products currently in stock.'}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {searchLoading ? <p className="text-xs text-slate-500">Loading products…</p> : (
                <p className="text-xs text-slate-500">
                  Click a product to add or remove it from {activeProductGrid?.title || 'the selected grid'}. Select all adds every match to this grid.
                </p>
              )}
              <button
                type="button"
                onClick={selectAllProducts}
                disabled={selectingAll || searchLoading || !pickerQuery() || !activeProductGrid}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectingAll ? 'Selecting…' : 'Select all'}
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                {searchResults.map((product) => {
                  const id = String(product.id || product._id || '');
                  const selected = (activeProductGrid?.productIds || []).includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleProduct(product)}
                      disabled={!activeProductGrid}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <span className="h-8 w-8 rounded bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {selected ? 'Added' : 'Add'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={savePage}
              disabled={saving || !form.title.trim() || allGridProducts.length === 0}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create page'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                New page instead
              </button>
            ) : null}
          </div>
        </div>
      </section>
      {previewOpen ? (
        <CampaignPagePreview
          form={form}
          productsBySection={previewProductsBySection}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
