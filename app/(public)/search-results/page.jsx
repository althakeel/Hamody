'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, PackageIcon } from 'lucide-react';
import Link from 'next/link';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { pushGtmEvent } from '@/lib/pushGtmEcommerceEvent';
import { GTM_EVENTS, gtmDedupeKey } from '@/lib/gtmEvents';
import { PRODUCT_CARD_GRID_CLASS_5, PRODUCT_CARD_CELL_CLASS } from '@/lib/storefrontCarousel';
import { getProductPath } from '@/lib/productUrl';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getLocalizedProductName } from '@/lib/displayText';
import ProductCard from '@/components/ProductCard';
import { CatalogGridSkeleton } from '@/components/home/HomeSectionSkeletons';
import ImageSearchDisclaimer from '@/components/ImageSearchDisclaimer';
import { sortOutOfStockLast } from '@/lib/productVisibility';

function sortProducts(list, sortBy) {
  const rows = [...(list || [])];
  if (sortBy === 'price-asc') {
    return rows.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }
  if (sortBy === 'price-desc') {
    return rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }
  return rows;
}

function productKey(product, index) {
  return String(product?._id || product?.slug || index);
}

function SearchResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, isArabic, language } = useStorefrontI18n();
  const [keyword, setKeyword] = useState('');
  const [method, setMethod] = useState('image-search');
  const [source, setSource] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [products, setProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('best');
  const [selectedPreview, setSelectedPreview] = useState('result');

  const isImageSearch = source === 'image';

  useEffect(() => {
    setKeyword(searchParams.get('keyword') || '');
    setMethod(searchParams.get('method') || 'image-search');
    setSource(searchParams.get('source') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchResults = async () => {
      if (source === 'image') {
        if (typeof window !== 'undefined') {
          const stored = sessionStorage.getItem('imageSearchResults');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setKeyword(parsed.keyword || '');
              setProducts(parsed.products || []);
              setRelatedProducts(parsed.relatedProducts || parsed.recommendedProducts || []);
              setPreviewUrl(parsed.previewUrl || '');
              setSelectedPreview((parsed.products || []).length ? 'result' : 'upload');
              setError((parsed.products || []).length || (parsed.relatedProducts || []).length
                ? ''
                : t('searchResults.none'));
            } catch (err) {
              console.error(err);
              setError(t('searchResults.expired'));
            }
          } else if (!keyword) {
            setError(t('searchResults.expired'));
          }
        }
        setLoading(false);
        return;
      }

      if (!keyword) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/search-products?keyword=${encodeURIComponent(keyword)}&limit=100&includeOutOfStock=true`);
        const data = await response.json();

        if (data.error) {
          setError(typeof data.error === 'string' ? data.error : t('shop.noProductsFound'));
          setProducts([]);
        } else {
          setProducts(data.products || []);
          setRelatedProducts([]);
          if (keyword.trim()) {
            pushGtmEvent(
              GTM_EVENTS.SEARCH,
              { search_term: keyword.trim() },
              gtmDedupeKey(GTM_EVENTS.SEARCH, keyword.trim().toLowerCase()),
            );
          }
          setError((data.products || []).length === 0 ? t('shop.noProductsFound') : '');
        }
      } catch (err) {
        console.error(err);
        setError(t('shop.noProductsFound'));
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [keyword, source, t]);

  const exactProduct = products[0] || null;
  const exactList = useMemo(() => {
    const ordered = sortProducts(products, sortBy === 'best' ? 'best' : sortBy);
    if (isImageSearch && sortBy === 'best') return ordered;
    return sortOutOfStockLast(ordered);
  }, [products, sortBy, isImageSearch]);
  const recommendedList = useMemo(() => {
    const seen = new Set(products.map((product) => String(product._id)));
    return sortOutOfStockLast(sortProducts(relatedProducts.filter((product) => {
      const id = String(product._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }), sortBy));
  }, [products, relatedProducts, sortBy]);
  const keywordGrid = useMemo(() => sortOutOfStockLast(sortProducts(products, sortBy)), [products, sortBy]);

  const isLikelyHash = /^[a-f0-9]{12,}$/i.test(keyword || '');
  const displayKeyword = isLikelyHash || !keyword ? t('searchResults.imageFor') : keyword;
  const exactProductImage = exactProduct
    ? (getProductThumbnailUrl(exactProduct) || exactProduct.image || exactProduct.images?.[0] || '')
    : '';
  const exactProductName = exactProduct
    ? getLocalizedProductName(exactProduct, language, exactProduct.name)
    : '';
  const exactProductHref = exactProduct ? getProductPath(exactProduct) : '';
  const uploadedImage = previewUrl || '';
  const resultImage = exactProductImage || '';
  const showingUpload = selectedPreview === 'upload' || !resultImage;
  const largeImage = showingUpload ? (uploadedImage || resultImage) : (resultImage || uploadedImage);

  const renderChoiceThumb = (src, selected, onSelect, label) => (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ${
        selected ? 'ring-2 ring-[#e62e04] ring-offset-2' : 'ring-1 ring-slate-200'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-contain" />
      {selected ? (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#e62e04] text-white">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );

  const renderCard = (product, index, badge = '') => (
    <div key={productKey(product, index)} className={`${PRODUCT_CARD_CELL_CLASS} relative`}>
      {badge ? (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-[#e62e04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}
      <ProductCard
        product={product}
        itemListId={isImageSearch ? 'image-search' : 'search-results'}
        itemListName={isImageSearch ? 'Image Search' : 'Search Results'}
        itemListIndex={index}
      />
    </div>
  );

  if (isImageSearch) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] py-5" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className={isArabic ? 'rotate-180' : ''} />
            {t('searchResults.back')}
          </button>

          {loading ? (
            <CatalogGridSkeleton count={8} />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-24">
                <p className="mb-3 text-lg font-semibold text-slate-900">{t('searchResults.chooseItem')}</p>
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-3">
                    <div className="flex items-center gap-2">
                      {uploadedImage
                        ? renderChoiceThumb(
                          uploadedImage,
                          showingUpload,
                          () => setSelectedPreview('upload'),
                          t('searchResults.yourPhoto'),
                        )
                        : null}
                      {resultImage
                        ? renderChoiceThumb(
                          resultImage,
                          !showingUpload,
                          () => setSelectedPreview('result'),
                          t('searchResults.bestMatch'),
                        )
                        : null}
                      {!uploadedImage && !resultImage ? (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
                          <PackageIcon className="text-slate-300" size={28} />
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {showingUpload ? t('searchResults.yourPhoto') : t('searchResults.bestMatch')}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {showingUpload ? t('searchResults.imageFor') : (exactProductName || displayKeyword)}
                      </p>
                    </div>
                  </div>
                  {exactProductHref && !showingUpload ? (
                    <Link href={exactProductHref} className="flex min-h-[240px] items-center justify-center bg-white p-4">
                      {largeImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={largeImage} alt={exactProductName} className="max-h-[360px] w-full object-contain" />
                      ) : (
                        <PackageIcon size={64} className="text-slate-300" />
                      )}
                    </Link>
                  ) : (
                    <div className="flex min-h-[240px] items-center justify-center bg-white p-4">
                      {largeImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={largeImage} alt="" className="max-h-[360px] w-full object-contain" />
                      ) : (
                        <PackageIcon size={64} className="text-slate-300" />
                      )}
                    </div>
                  )}
                  {exactProductHref ? (
                    <div className="border-t border-slate-100 p-3">
                      <Link
                        href={exactProductHref}
                        className="flex w-full items-center justify-center rounded-full bg-[#e62e04] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#cf2803]"
                      >
                        {t('searchResults.viewProduct')}
                      </Link>
                    </div>
                  ) : null}
                </div>
                <ImageSearchDisclaimer className="mt-3" />
              </aside>

              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-xl font-semibold text-slate-900">{t('searchResults.title')}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">{t('shop.sort')}:</span>
                    {[
                      ['best', t('shop.sort.bestMatch')],
                      ['price-asc', t('shop.sort.priceLow')],
                      ['price-desc', t('shop.sort.priceHigh')],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSortBy(value)}
                        className={`rounded-full px-3 py-1.5 ${
                          sortBy === value
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && !exactList.length && !recommendedList.length ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
                    {error}
                  </div>
                ) : null}

                {!exactProduct && recommendedList.length ? (
                  <p className="mb-3 text-sm text-slate-600">{t('searchResults.noExact')}</p>
                ) : null}

                {exactList.length ? (
                  <div className={`mb-8 ${PRODUCT_CARD_GRID_CLASS_5}`}>
                    {exactList.map((product, index) => renderCard(
                      product,
                      index,
                      sortBy === 'best' && index === 0 ? t('searchResults.bestMatch') : '',
                    ))}
                  </div>
                ) : null}

                {recommendedList.length ? (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-700">{t('searchResults.recommended')}</p>
                    <div className={PRODUCT_CARD_GRID_CLASS_5}>
                      {recommendedList.map((product, index) => renderCard(
                        product,
                        exactList.length + index,
                      ))}
                    </div>
                  </div>
                ) : null}

                {!loading && !exactList.length && !recommendedList.length && !error ? (
                  <div className="py-16 text-center text-slate-500">
                    <PackageIcon size={56} className="mx-auto mb-3 text-slate-300" />
                    <p>{t('searchResults.none')}</p>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-blue-600 transition hover:text-blue-700"
          >
            <ArrowLeft size={20} className={isArabic ? 'rotate-180' : ''} />
            {t('searchResults.back')}
          </button>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">{t('searchResults.title')}</h1>
          <p className="text-gray-600">
            {t('shop.subtitleSearch', { search: displayKeyword })}
          </p>
        </div>

        {loading && (
          <CatalogGridSkeleton count={10} />
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && keywordGrid.length === 0 && (
          <div className="py-20 text-center">
            <PackageIcon size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-600">{t('shop.noProductsFound')}</p>
          </div>
        )}

        {!loading && keywordGrid.length > 0 && (
          <div className={PRODUCT_CARD_GRID_CLASS_5}>
            {keywordGrid.map((product, index) => renderCard(product, index))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={<CatalogGridSkeleton count={10} />}>
      <SearchResultsInner />
    </Suspense>
  );
}
