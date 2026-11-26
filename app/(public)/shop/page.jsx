"use client";
import { Suspense, useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link"
import ProductCard from "@/components/ProductCard"
import { CatalogGridSkeleton } from '@/components/home/HomeSectionSkeletons'
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from '@/lib/useAuth'
import axios from 'axios'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { getProductPath } from '@/lib/productUrl'
import { getProductThumbnailUrl } from '@/lib/productMedia'
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls'
import { decodeHtmlEntities } from '@/lib/displayText'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import { getLocalizedCategoryName } from '@/lib/categoryLocalization'
import { toPublicCategoryPath } from '@/lib/categorySlug'
import { rememberGa4Categories } from '@/lib/ga4CategoryLookup'
import { pushGtmEvent } from '@/lib/pushGtmEcommerceEvent'
import { GTM_EVENTS, gtmDedupeKey } from '@/lib/gtmEvents'

const SHOP_PAGE_SIZE = 60;

function buildCatalogUrl({
  search,
  selectedCategories,
  sortBy,
  priceFilter,
  minPrice,
  maxPrice,
  stockFilter,
  bestSellerOnly,
  fastDeliveryOnly,
  page = 1,
  limit = SHOP_PAGE_SIZE,
}) {
  if (search?.trim()) {
    const params = new URLSearchParams({
      keyword: search.trim(),
      includeOutOfStock: 'true',
      limit: String(limit),
      page: String(page),
    });
    return `/api/search-products?${params}`;
  }

  const params = new URLSearchParams({
    paginated: 'true',
    slim: 'true',
    limit: String(limit),
    page: String(page),
    includeOutOfStock: 'true',
    sort: sortBy,
  });

  if (selectedCategories?.length) {
    params.set('categories', selectedCategories.join(','));
  }
  if (priceFilter !== 'all') params.set('priceFilter', priceFilter);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (stockFilter === 'inStock') params.set('inStockOnly', 'true');
  if (bestSellerOnly) params.set('bestSeller', 'true');
  if (fastDeliveryOnly) params.set('fastDelivery', 'true');

  return `/api/products?${params}`;
}

function ShopContent() {
    const { t, language, isArabic } = useStorefrontI18n();
    const locale = isArabic ? 'ar-AE' : 'en';
    const searchParams = useSearchParams();
    const search = searchParams.get('search') || searchParams.get('brand');
    const selectedCategories = useMemo(() => {
        const multi = String(searchParams.get('categories') || '').trim();
        if (multi) {
            return multi.split(',').map((slug) => slug.trim()).filter(Boolean);
        }
        const single = String(searchParams.get('category') || '').trim();
        return single ? [single] : [];
    }, [searchParams]);
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [productsLoading, setProductsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [categories, setCategories] = useState([]);
    const [showCategories, setShowCategories] = useState(true);
    const [sortBy, setSortBy] = useState('newest');
    const [priceFilter, setPriceFilter] = useState('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [bestSellerOnly, setBestSellerOnly] = useState(false);
    const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [fastSellingIndex, setFastSellingIndex] = useState(0);
    const { user, getToken } = useAuth();
    const fetchAbortRef = useRef(null);
    const sentinelRef = useRef(null);
    const loadingMoreLockRef = useRef(false);

    useEffect(() => {
        const category = String(searchParams.get('category') || '').trim();
        const categoriesParam = String(searchParams.get('categories') || '').trim();
        if (search?.trim()) return;
        const slug = category || (categoriesParam.includes(',') ? '' : categoriesParam);
        if (!slug) return;
        router.replace(toPublicCategoryPath(slug));
    }, [router, search, searchParams]);

    useEffect(() => {
        let isActive = true;
        fetch('/api/categories', { credentials: 'same-origin', cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (!isActive) return;
                const list = Array.isArray(data?.categories) ? data.categories : [];
                setCategories(list);
                rememberGa4Categories(list);
            })
            .catch(() => {
                if (!isActive) return;
                setCategories([]);
            });
        return () => {
            isActive = false;
        };
    }, [language]);

    useEffect(() => {
        if (!search || !search.trim()) return;

        const saveSearch = async () => {
            const trimmedSearch = search.trim();

            if (user) {
                try {
                    const token = await getToken();
                    await axios.post('/api/customer/recent-searches',
                        { searchTerm: trimmedSearch },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (error) {
                    console.error('Error saving search to database:', error);
                }
            } else {
                try {
                    const existing = JSON.parse(localStorage.getItem('recentSearches') || '[]');
                    const filtered = existing.filter((item) => item !== trimmedSearch);
                    filtered.unshift(trimmedSearch);
                    localStorage.setItem('recentSearches', JSON.stringify(filtered.slice(0, 20)));
                } catch (error) {
                    console.error('Error saving search to localStorage:', error);
                }
            }
        };

        saveSearch();
    }, [search, user, getToken]);

    const filterQueryKey = useMemo(() => JSON.stringify({
        search: search?.trim() || '',
        selectedCategories,
        sortBy,
        priceFilter,
        minPrice,
        maxPrice,
        stockFilter,
        bestSellerOnly,
        fastDeliveryOnly,
    }), [
        search,
        selectedCategories,
        sortBy,
        priceFilter,
        minPrice,
        maxPrice,
        stockFilter,
        bestSellerOnly,
        fastDeliveryOnly,
    ]);

    const loadedFilterKeyRef = useRef(filterQueryKey);

    useEffect(() => {
        const filterChanged = loadedFilterKeyRef.current !== filterQueryKey;
        if (filterChanged && page !== 1) {
            loadedFilterKeyRef.current = filterQueryKey;
            fetchAbortRef.current?.abort();
            loadingMoreLockRef.current = false;
            setPage(1);
            return undefined;
        }
        loadedFilterKeyRef.current = filterQueryKey;

        if (fetchAbortRef.current) {
            fetchAbortRef.current.abort();
        }

        const controller = new AbortController();
        fetchAbortRef.current = controller;
        const append = page > 1;
        loadingMoreLockRef.current = true;
        if (append) setLoadingMore(true);
        else setProductsLoading(true);

        const url = buildCatalogUrl({
            search,
            selectedCategories,
            sortBy,
            priceFilter,
            minPrice,
            maxPrice,
            stockFilter,
            bestSellerOnly,
            fastDeliveryOnly,
            page,
        });

        fetch(url, { signal: controller.signal, cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (controller.signal.aborted) return;
                const list = Array.isArray(data?.products) ? data.products : [];
                const total = Number(data?.total ?? data?.resultCount) || list.length;
                const pages = Number(data?.totalPages) || Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
                setProducts((current) => {
                    if (!append) return list;
                    const seen = new Set(current.map((product) => String(product?._id || product?.id || product?.slug || '')));
                    const next = list.filter((product) => {
                        const key = String(product?._id || product?.id || product?.slug || '');
                        if (!key || seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    return next.length ? [...current, ...next] : current;
                });
                setTotalProducts(total);
                setTotalPages(pages);
                if (search?.trim()) {
                    pushGtmEvent(
                        GTM_EVENTS.SEARCH,
                        { search_term: search.trim() },
                        gtmDedupeKey(GTM_EVENTS.SEARCH, search.trim().toLowerCase()),
                    );
                }
            })
            .catch((error) => {
                if (controller.signal.aborted || error?.name === 'AbortError') return;
                if (!append) {
                    setProducts([]);
                    setTotalProducts(0);
                    setTotalPages(1);
                }
            })
            .finally(() => {
                if (controller.signal.aborted) return;
                setProductsLoading(false);
                setLoadingMore(false);
                loadingMoreLockRef.current = false;
            });

        return () => controller.abort();
    }, [filterQueryKey, page]);

    const hasMoreProducts = page < totalPages;

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || productsLoading || loadingMore || !hasMoreProducts) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                if (loadingMoreLockRef.current) return;
                loadingMoreLockRef.current = true;
                setPage((current) => current + 1);
            },
            { root: null, rootMargin: '600px 0px', threshold: 0 },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMoreProducts, productsLoading, loadingMore, products.length]);

    const fastSellingProducts = useMemo(() => {
        if ((productsLoading && products.length === 0) || !products.length) return [];
        return products.slice(0, 8).filter((product) => product?.slug || product?._id);
    }, [products, productsLoading]);

    const getProductPrice = useCallback((product) => {
        const basePrice = Number(product?.price || 0);
        return Number.isFinite(basePrice) ? basePrice : 0;
    }, []);

    useEffect(() => {
        if (fastSellingProducts.length <= 1) return;

        const interval = setInterval(() => {
            setFastSellingIndex((prev) => (prev + 1) % fastSellingProducts.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [fastSellingProducts.length]);

    useEffect(() => {
        if (fastSellingIndex >= fastSellingProducts.length) {
            setFastSellingIndex(0);
        }
    }, [fastSellingProducts.length, fastSellingIndex]);

    const localizeCategoryName = useCallback((category) => {
        if (!category) return '';
        return decodeHtmlEntities(getLocalizedCategoryName(category, language));
    }, [language]);

    const rootCategories = useMemo(() => {
        return categories
            .filter((category) => !category?.parentId)
            .sort((a, b) => localizeCategoryName(a).localeCompare(localizeCategoryName(b), locale));
    }, [categories, localizeCategoryName, locale]);

    const categoryTitleMap = useMemo(() => {
        const map = new Map();
        const visit = (items = []) => {
            for (const category of items) {
                if (category?.slug) {
                    map.set(category.slug, localizeCategoryName(category));
                }
                if (Array.isArray(category?.children) && category.children.length) {
                    visit(category.children);
                }
            }
        };
        visit(categories);
        return map;
    }, [categories, localizeCategoryName]);

    const pageTitle = useMemo(() => {
        if (search) return t('shop.searchTitle', { query: search });
        if (selectedCategories.length === 1) {
            return categoryTitleMap.get(selectedCategories[0])
                || selectedCategories[0].split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        if (selectedCategories.length > 1) {
            return t('shop.categoriesCount', { count: selectedCategories.length });
        }
        return t('shop.allProducts');
    }, [search, selectedCategories, categoryTitleMap, t]);

    const pageSubtitle = useMemo(() => {
        if (search) return t('shop.subtitleSearch', { search });
        if (selectedCategories.length) return t('shop.subtitleBrowse', { title: pageTitle });
        return t('shop.subtitleAll');
    }, [search, selectedCategories.length, pageTitle, t]);

    const resetFilters = useCallback(() => {
        setSortBy('newest');
        setPriceFilter('all');
        setMinPrice('');
        setMaxPrice('');
        setStockFilter('all');
        setBestSellerOnly(false);
        setFastDeliveryOnly(false);
    }, []);

    const clearCategories = useCallback(() => {
        router.replace('/shop', { scroll: false });
    }, [router]);

    const fastSellingProduct = fastSellingProducts[fastSellingIndex];
    const fastSellingImage = fastSellingProduct
        ? getProductThumbnailUrl(fastSellingProduct, { fallback: PLACEHOLDER_IMAGE })
        : PLACEHOLDER_IMAGE;

    const showingFrom = products.length > 0 ? 1 : 0;
    const showingTo = products.length;

    return (
        <div className="min-h-screen bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
                <div className={`mb-6 mt-6 ${isArabic ? 'text-right' : ''}`}>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {pageTitle}
                    </h1>
                    <p className="text-gray-600">
                        {pageSubtitle}
                    </p>
                </div>

                <>
                        <div className="lg:hidden mb-3">
                            <button
                                type="button"
                                onClick={() => setShowMobileFilters(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold shadow-sm"
                            >
                                <SlidersHorizontal size={16} /> {t('category.filtersAndSort')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[224px_1fr] gap-3 lg:gap-4 items-start">
                            <aside className={`${showMobileFilters ? 'block' : 'hidden'} lg:block space-y-3 lg:sticky lg:top-24`}>
                            {rootCategories.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setShowCategories((current) => !current)}
                                        className="flex w-full items-center justify-between text-sm font-semibold text-gray-800"
                                    >
                                        <span>{t('shop.categories')}</span>
                                        <ChevronDown size={16} className={`transition ${showCategories ? '' : '-rotate-90'}`} />
                                    </button>
                                    {showCategories ? (
                                        <div className="mt-3 border-t border-slate-100 pt-3">
                                            <div className={`max-h-[min(26rem,52vh)] overflow-y-auto overscroll-contain space-y-1 ${isArabic ? 'pl-1' : 'pr-1'}`}>
                                            <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                                <span className="text-[11px] font-medium text-gray-500">
                                                    {selectedCategories.length
                                                        ? t('shop.selectedCount', { count: selectedCategories.length })
                                                        : t('shop.selectOneOrMore')}
                                                </span>
                                                {selectedCategories.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={clearCategories}
                                                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                                                    >
                                                        {t('shop.clear')}
                                                    </button>
                                                ) : null}
                                            </div>
                                            {rootCategories.map((category) => {
                                                const slug = String(category?.slug || '').trim();
                                                const categoryId = String(category?._id || slug);
                                                const isSelected = Boolean(slug && selectedCategories.includes(slug));
                                                const categoryLabel = localizeCategoryName(category) || slug || t('category.category');
                                                const href = slug ? toPublicCategoryPath(slug) : '/shop';

                                                return (
                                                    <Link
                                                        key={categoryId}
                                                        href={href}
                                                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                                                            isSelected
                                                                ? 'bg-orange-50 font-semibold text-orange-700'
                                                                : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {categoryLabel}
                                                    </Link>
                                                );
                                            })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                        <SlidersHorizontal size={14} className="text-gray-500" />
                                        {t('shop.shopFilters')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
                                        >
                                            {t('shop.reset')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileFilters(false)}
                                            className="lg:hidden text-gray-500"
                                            aria-label={t('category.closeFilters')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{t('shop.sort')}</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                                        >
                                            <option value="newest">{t('category.sort.newest')}</option>
                                            <option value="priceLowToHigh">{t('category.sort.priceLowHigh')}</option>
                                            <option value="priceHighToLow">{t('category.sort.priceHighLow')}</option>
                                            <option value="nameAZ">{t('shop.sort.nameAZ')}</option>
                                            <option value="nameZA">{t('shop.sort.nameZA')}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{t('category.priceRange')}</label>
                                        <select
                                            value={priceFilter}
                                            onChange={(e) => setPriceFilter(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                                        >
                                            <option value="all">{t('shop.all')}</option>
                                            <option value="under499">{t('shop.price.under499')}</option>
                                            <option value="500to999">{t('shop.price.500to999')}</option>
                                            <option value="1000to1999">{t('shop.price.1000to1999')}</option>
                                            <option value="2000plus">{t('shop.price.2000plus')}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{t('shop.customPrice')}</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value)}
                                                placeholder={t('category.min')}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                                placeholder={t('category.max')}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{t('shop.stock')}</label>
                                        <select
                                            value={stockFilter}
                                            onChange={(e) => setStockFilter(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                                        >
                                            <option value="all">{t('shop.all')}</option>
                                            <option value="inStock">{t('category.inStockOnly')}</option>
                                        </select>
                                    </div>

                                    <label className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={bestSellerOnly}
                                            onChange={(e) => setBestSellerOnly(e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                        {t('shop.bestSellerOnly')}
                                    </label>

                                    <label className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={fastDeliveryOnly}
                                            onChange={(e) => setFastDeliveryOnly(e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                        {t('shop.fastDeliveryOnly')}
                                    </label>
                                </div>
                            </div>

                            {fastSellingProduct && (
                                <div className="bg-white border border-slate-300 rounded-md p-3 shadow-sm">
                                    <div className="mb-2">
                                        <h3 className="text-sm font-semibold text-slate-900 tracking-wide">{t('shop.trendingPick')}</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!fastSellingProduct) return;
                                            router.push(getProductPath(fastSellingProduct));
                                        }}
                                        className={`group w-full border border-slate-300 rounded-md overflow-hidden hover:border-slate-500 transition ${isArabic ? 'text-right' : 'text-left'}`}
                                    >
                                        <div className="relative h-64 bg-slate-100 overflow-hidden">
                                            {fastSellingImage && fastSellingImage !== PLACEHOLDER_IMAGE ? (
                                                <img
                                                    src={fastSellingImage}
                                                    alt={fastSellingProduct.name || t('common.product')}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : null}
                                            <div className={`absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent ${isArabic ? 'text-right' : ''}`}>
                                                <div className="inline-flex items-center px-2 py-1 rounded-sm bg-white text-gray-900 text-sm font-bold shadow-sm">
                                                    AED{getProductPrice(fastSellingProduct).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                            </aside>

                            <div>
                                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                    {productsLoading ? (
                                        <>{t('shop.loadingProducts')}</>
                                    ) : totalProducts > 0 ? (
                                        <>
                                            {t('shop.showingRange', {
                                                from: showingFrom.toLocaleString(locale),
                                                to: showingTo.toLocaleString(locale),
                                                total: totalProducts.toLocaleString(locale),
                                                label: totalProducts === 1 ? t('shop.productSingular') : t('shop.productPlural'),
                                            })}
                                        </>
                                    ) : (
                                        <>{t('shop.showingZero')}</>
                                    )}
                                    {(bestSellerOnly || fastDeliveryOnly || minPrice || maxPrice || priceFilter !== 'all' || selectedCategories.length > 0) && (
                                        <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-1">
                                            {t('shop.filtersActive')}
                                        </span>
                                    )}
                                </div>
                                {productsLoading && products.length === 0 ? (
                                    <CatalogGridSkeleton count={10} />
                                ) : products.length === 0 ? (
                                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                                        <p className="text-gray-500 text-lg mb-2">{t('shop.noProductsFound')}</p>
                                        <p className="text-gray-400 text-sm mb-6">{t('shop.tryChangingFilters')}</p>
                                        <button
                                            onClick={resetFilters}
                                            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                                        >
                                            {t('category.clearFilters')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-5">
                                            {products.map((product, index) => (
                                                <ProductCard
                                                    key={product._id || product.id}
                                                    product={product}
                                                    priorityImages={index < 10}
                                                    deferImages={index >= 10}
                                                />
                                            ))}
                                        </div>
                                        {hasMoreProducts ? (
                                            <div ref={sentinelRef} className="mt-8 flex justify-center py-6" aria-hidden="true">
                                                {loadingMore ? (
                                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
                                                ) : (
                                                    <span className="h-8 w-full" />
                                                )}
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>
                </>
            </div>
        </div>
    );
}

export default function Shop() {
  return (
    <Suspense fallback={<CatalogGridSkeleton count={10} />}>
      <ShopContent />
    </Suspense>
  );
}
