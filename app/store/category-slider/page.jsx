'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiTrash2, FiPlus, FiEdit2, FiX, FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Loading from '@/components/Loading';
import { compressImageForUpload } from '@/lib/compressImageForUpload';
import {
  CATEGORY_SLIDER_BACKGROUND_PRESETS,
  CATEGORY_SLIDER_AUTO_SLIDE_SPEED_PRESETS,
  DEFAULT_CATEGORY_SLIDER_BACKGROUND,
  DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS,
  normalizeCategorySliderBackground,
  normalizeCategorySliderSideImagePosition,
  normalizeCategorySliderAutoSlide,
  normalizeCategorySliderAutoSlideInterval,
  CATEGORY_SLIDER_MOBILE_IMAGE_RATIOS,
  DEFAULT_CATEGORY_SLIDER_MOBILE_IMAGE_RATIO,
  normalizeCategorySliderMobileImageRatio,
  categorySliderMobileImageRatioParts,
} from '@/lib/categorySliderTheme';
import { sortCategorySliders } from '@/lib/categorySliderOrder';
import { flattenShowcaseCategories } from '@/lib/showcaseBannerLinks';
import { BOTTOM_NAV_PAGE_OPTIONS } from '@/lib/bottomNavLinkChoices';
import { categorySliderDefaultPath, normalizeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { slugifyCategory } from '@/lib/categorySlug';
import StoreDropdown from '@/components/store/StoreDropdown';

const VIEW_ALL_TARGETS = [
  { id: 'default', label: 'Default page' },
  { id: 'category', label: 'Category' },
  { id: 'landing', label: 'Landing page' },
  { id: 'page', label: 'Existing page' },
  { id: 'custom', label: 'Custom URL' },
];

const EMPTY_VIEW_ALL = { viewAllEnabled: false, viewAllTarget: 'default', viewAllValue: '' };

function appImageFrameStyle(ratio) {
  const parts = categorySliderMobileImageRatioParts(ratio);
  return { aspectRatio: `${parts.width} / ${parts.height}` };
}

export default function CategorySliderPage() {
  const { user, getToken, loading: authLoading } = useAuth();
  const [sliders, setSliders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragProductIndex, setDragProductIndex] = useState(null);
  const [selectedProductsOpen, setSelectedProductsOpen] = useState(false);
  const [showAllSliders, setShowAllSliders] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    titleAr: '',
    subtitleAr: '',
    sideImage: '',
    sideImageAr: '',
    mobileImage: '',
    mobileImageAr: '',
    mobileImageRatio: DEFAULT_CATEGORY_SLIDER_MOBILE_IMAGE_RATIO,
    sideImagePosition: 'left',
    cardsPerRow: 6,
    autoSlide: false,
    autoSlideIntervalMs: DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS,
    backgroundColor: DEFAULT_CATEGORY_SLIDER_BACKGROUND,
    productIds: [],
    ...EMPTY_VIEW_ALL,
  });
  const [translatingCopy, setTranslatingCopy] = useState(false);
  const [uploadingSideImage, setUploadingSideImage] = useState('');
  const [reorderingId, setReorderingId] = useState(null);
  const [myStoreScopeIds, setMyStoreScopeIds] = useState(() => new Set());
  const [categories, setCategories] = useState([]);
  const [landingPages, setLandingPages] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [productPickMode, setProductPickMode] = useState('manual');
  const [pickCategoryId, setPickCategoryId] = useState('');
  const [pickBrand, setPickBrand] = useState('');
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const normalizeProductIds = (ids = []) => (
    [...new Set(
      ids
        .map((id) => {
          if (!id) return '';
          if (typeof id === 'object' && id.$oid) return id.$oid;
          return String(id);
        })
        .map((id) => id.trim())
        .filter((id) => id && id !== 'undefined' && id !== 'null'),
    )]
  );

  const sliderBelongsToCurrentStore = (slider) => {
    if (!slider?.storeId) return true;
    return myStoreScopeIds.has(String(slider.storeId));
  };

  const canManageSlider = (slider) => isPlatformAdmin || sliderBelongsToCurrentStore(slider);

  const normalizeId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value.$oid) return value.$oid;
      const str = value.toString?.();
      return str && str !== '[object Object]' ? str : null;
    }
    return null;
  };

  // Fetch sliders and products after auth is ready
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [authLoading, user, showAllSliders]);

  // Log formData changes
  useEffect(() => {
    console.log('💾 FormData updated:', formData);
  }, [formData]);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    let active = true;
    const loadTargets = async () => {
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [categoryRes, landingRes, brandRes] = await Promise.all([
          axios.get('/api/categories'),
          token
            ? axios.get('/api/store/email-marketing/pages', { headers })
            : Promise.resolve({ data: { pages: [] } }),
          token
            ? axios.get('/api/store/product', { headers, params: { manage: 'true', distinct: 'brands' } })
            : Promise.resolve({ data: { brands: [] } }),
        ]);
        if (!active) return;
        setCategories(Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : []);
        setLandingPages(Array.isArray(landingRes.data?.pages) ? landingRes.data.pages : []);
        setBrandOptions((Array.isArray(brandRes.data?.brands) ? brandRes.data.brands : []).map((brand) => ({
          value: brand,
          label: brand,
        })));
      } catch (error) {
        console.error('Failed to load View all destinations', error);
      }
    };
    void loadTargets();
    return () => {
      active = false;
    };
  }, [authLoading, user, getToken]);

  const categoryOptions = flattenShowcaseCategories(categories).map((category) => ({
    value: category.slug,
    label: category.label,
  }));
  const categoryIdOptions = (() => {
    const list = Array.isArray(categories) ? categories : [];
    const byParent = new Map();
    list.forEach((item) => {
      const parent = String(item?.parentId || '');
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(item);
    });
    const rows = [];
    const walk = (parentId, depth) => {
      const children = (byParent.get(parentId) || []).slice().sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      children.forEach((item) => {
        const id = String(item?._id || item?.id || '');
        if (!id) return;
        rows.push({ value: id, label: `${'— '.repeat(depth)}${item.name || id}` });
        walk(id, depth + 1);
      });
    };
    walk('', 0);
    if (rows.length) return rows;
    return list.flatMap((item) => {
      const id = String(item?._id || item?.id || '');
      return id ? [{ value: id, label: item.name || id }] : [];
    });
  })();
  const landingOptions = landingPages.flatMap((page) => {
    const slug = String(page?.slug || '').trim();
    if (!slug) return [];
    const title = String(page?.title || slug).trim();
    const status = page?.status === 'published' ? 'Published' : 'Draft';
    return [{ value: slug, label: `${title} · ${status}` }];
  });

  const fetchData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

      const getWithAuth = async (url) => {
        let token = await getToken();
        if (!token) {
          throw new Error('Missing auth token');
        }

        try {
          return await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          if (error?.response?.status === 401) {
            token = await getToken(true);
            if (!token) throw error;
            return await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
          throw error;
        }
      };

      let token = await getToken();
      if (token) {
        try {
          await axios.get('/api/admin/is-admin', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setIsPlatformAdmin(true);
        } catch {
          setIsPlatformAdmin(false);
        }
      } else {
        setIsPlatformAdmin(false);
      }

      // Fetch existing sliders (can show all or just user's)
      const endpoint = showAllSliders ? '/api/public/featured-sections' : '/api/store/category-slider';
      const slidersRes = showAllSliders 
        ? await axios.get(endpoint)
        : await getWithAuth(endpoint);
      
      const rawSliders = slidersRes.data.sliders || slidersRes.data.sections || [];
      const normalizedSliders = rawSliders.map(section => {
        const rawId = section.id || section._id;
        const normalizedId = normalizeId(rawId);
        
        // Ensure subtitle is always a string
        const subtitleValue = section.subtitle ? String(section.subtitle).trim() : '';

        return {
          ...section,
          id: normalizedId,
          subtitle: subtitleValue,
          sideImage: section.sideImage ? String(section.sideImage).trim() : '',
          sideImageAr: section.sideImageAr ? String(section.sideImageAr).trim() : '',
          mobileImage: section.mobileImage ? String(section.mobileImage).trim() : '',
          mobileImageAr: section.mobileImageAr ? String(section.mobileImageAr).trim() : '',
          mobileImageRatio: normalizeCategorySliderMobileImageRatio(section.mobileImageRatio),
          sideImagePosition: normalizeCategorySliderSideImagePosition(section.sideImagePosition),
          cardsPerRow: section.cardsPerRow === 5 ? 5 : 6,
          autoSlide: normalizeCategorySliderAutoSlide(section.autoSlide),
          autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(section.autoSlideIntervalMs),
          backgroundColor: normalizeCategorySliderBackground(section.backgroundColor),
          ...normalizeCategorySliderViewAll(section),
        };
      });
      console.log('📊 Fetched sliders:', normalizedSliders);
      console.log('📊 First slider subtitle:', normalizedSliders[0]?.subtitle);
      setSliders(sortCategorySliders(normalizedSliders));

      const scopeIds = new Set();
      if (user?.uid) scopeIds.add(String(user.uid));
      try {
        const ownSlidersRes = await getWithAuth('/api/store/category-slider');
        (ownSlidersRes.data.sliders || []).forEach((slider) => {
          if (slider.storeId) scopeIds.add(String(slider.storeId));
        });
      } catch (scopeError) {
        console.warn('Could not resolve store scope for sliders:', scopeError);
      }
      setMyStoreScopeIds(scopeIds);

      // Fetch store products
      const productsRes = await getWithAuth('/api/store/product');
      
      // Normalize product IDs (convert _id to id if needed)
      const normalizedProducts = (productsRes.data.products || []).map(p => ({
        ...p,
        id: p.id || p._id || p.productId
      }));
      
      setProducts(normalizedProducts);

      if (!silent) setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      if (!silent) setLoading(false);
    }
  };

  const translateSliderCopyToArabic = async () => {
    const englishTitle = String(formData.title || '').trim();
    const englishSubtitle = String(formData.subtitle || '').trim();
    if (!englishTitle && !englishSubtitle) {
      toast.error('Enter English title or subtitle first');
      return;
    }

    try {
      setTranslatingCopy(true);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }

      const translateText = async (text) => {
        if (!text) return '';
        const { data } = await axios.post(
          '/api/store/categories/translate-arabic',
          { text },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return String(data?.descriptionAr || '').trim();
      };

      const [titleAr, subtitleAr] = await Promise.all([
        translateText(englishTitle),
        translateText(englishSubtitle),
      ]);

      if (!titleAr && !subtitleAr) {
        toast.error('Could not translate to Arabic');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        ...(titleAr ? { titleAr } : {}),
        ...(subtitleAr ? { subtitleAr } : {}),
      }));
      toast.success('Arabic fields updated');
    } catch (error) {
      console.error('Translate slider copy failed:', error);
      toast.error(error?.response?.data?.error || 'Failed to translate to Arabic');
    } finally {
      setTranslatingCopy(false);
    }
  };

  const handleAddSlider = () => {
    setFormData({ title: '', subtitle: '', titleAr: '', subtitleAr: '', sideImage: '', sideImageAr: '', mobileImage: '', mobileImageAr: '', mobileImageRatio: DEFAULT_CATEGORY_SLIDER_MOBILE_IMAGE_RATIO, sideImagePosition: 'left', cardsPerRow: 6, autoSlide: false, autoSlideIntervalMs: DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS, backgroundColor: DEFAULT_CATEGORY_SLIDER_BACKGROUND, productIds: [], ...EMPTY_VIEW_ALL });
    setEditingIdx(null);
    setShowForm(true);
  };

  const handleEditSlider = (slider) => {
    const sliderId = normalizeId(slider.id || slider._id);
    console.log('📝 === EDIT SLIDER STARTED ===');
    console.log('📝 Full slider object:', slider);
    console.log('📝 Subtitle raw value:', slider.subtitle);
    console.log('📝 Subtitle type:', typeof slider.subtitle);
    console.log('📝 Subtitle length:', slider.subtitle?.length);
    
    // Ensure subtitle is a string
    const subtitleValue = slider.subtitle ? String(slider.subtitle).trim() : '';
    console.log('📝 Processed subtitle value:', subtitleValue);
    
    const newFormData = {
      _id: sliderId,
      title: slider.title || '',
      subtitle: subtitleValue,
      titleAr: slider.titleAr ? String(slider.titleAr).trim() : '',
      subtitleAr: slider.subtitleAr ? String(slider.subtitleAr).trim() : '',
      sideImage: slider.sideImage ? String(slider.sideImage).trim() : '',
      sideImageAr: slider.sideImageAr ? String(slider.sideImageAr).trim() : '',
      mobileImage: slider.mobileImage ? String(slider.mobileImage).trim() : '',
      mobileImageAr: slider.mobileImageAr ? String(slider.mobileImageAr).trim() : '',
      mobileImageRatio: normalizeCategorySliderMobileImageRatio(slider.mobileImageRatio),
      sideImagePosition: normalizeCategorySliderSideImagePosition(slider.sideImagePosition),
      cardsPerRow: slider.cardsPerRow === 5 ? 5 : 6,
      autoSlide: normalizeCategorySliderAutoSlide(slider.autoSlide),
      autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(slider.autoSlideIntervalMs),
      backgroundColor: normalizeCategorySliderBackground(slider.backgroundColor),
      productIds: slider.productIds || [],
      slug: slider.slug || '',
      ...normalizeCategorySliderViewAll(slider),
    };
    console.log('📝 New form data being set:', newFormData);
    setFormData(newFormData);
    setEditingIdx(sliderId);
    setShowForm(true);
    console.log('📝 === EDIT SLIDER COMPLETED ===');
  };

  const handleMoveSlider = async (sliderId, direction) => {
    const normalizedSliderId = normalizeId(sliderId);
    const slider = sliders.find((item) => normalizeId(item.id) === normalizedSliderId);
    if (!slider || !canManageSlider(slider)) return;

    try {
      setReorderingId(normalizedSliderId);
      let token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }

      const payload = { id: normalizedSliderId, direction };
      const putReorder = async (authToken) => axios.put('/api/store/category-slider/reorder', payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      try {
        await putReorder(token);
      } catch (error) {
        if (error?.response?.status === 401) {
          token = await getToken(true);
          await putReorder(token);
        } else {
          throw error;
        }
      }

      await fetchData({ silent: true });
      toast.success('Slider order updated');
    } catch (error) {
      console.error('Error reordering slider:', error);
      toast.error(error?.response?.data?.error || 'Failed to reorder slider');
    } finally {
      setReorderingId(null);
    }
  };

  const handleSideImageUpload = async (file, field = 'sideImage') => {
    if (!file) return;
    const imageFields = {
      sideImage: 'Side image uploaded',
      sideImageAr: 'Arabic side image uploaded',
      mobileImage: 'App image uploaded',
      mobileImageAr: 'Arabic app image uploaded',
    };
    const imageField = imageFields[field] ? field : 'sideImage';

    try {
      setUploadingSideImage(imageField);
      let token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }

      const compressed = await compressImageForUpload(file);
      const body = new FormData();
      body.append('image', compressed);
      body.append('type', 'category');

      const attemptUpload = async (authToken) => {
        const response = await fetch('/api/store/upload-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body,
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
      };

      let { response, data } = await attemptUpload(token);
      if (response.status === 401) {
        token = await getToken(true);
        if (!token) {
          toast.error('Please sign in again');
          return;
        }
        ({ response, data } = await attemptUpload(token));
      }

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || `Upload failed (${response.status})`);
      }

      setFormData((prev) => ({ ...prev, [imageField]: data.url }));
      toast.success(imageFields[imageField] || 'Image uploaded');
    } catch (error) {
      console.error('Side image upload failed:', error);
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setUploadingSideImage('');
    }
  };

  const handleSaveSlider = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a slider title');
      return;
    }
    if (formData.productIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    const viewAll = normalizeCategorySliderViewAll(formData);
    if (viewAll.viewAllEnabled && viewAll.viewAllTarget !== 'default' && !viewAll.viewAllValue) {
      toast.error('Choose where View all opens');
      return;
    }
    if (!isPlatformAdmin && showAllSliders && editingIdx !== null) {
      const editingSlider = sliders.find((slider) => normalizeId(slider.id) === normalizeId(editingIdx));
      if (editingSlider && !sliderBelongsToCurrentStore(editingSlider)) {
        toast.error('Cannot edit sliders from other stores');
        return;
      }
    }

    try {
      let token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      console.log('💾 Saving slider with data:', formData);

      if (editingIdx !== null) {
        const editId = normalizeId(editingIdx);
        if (!editId || editId === 'undefined' || editId === 'null') {
          toast.error('Invalid slider ID');
          return;
        }
        // Update existing slider
        console.log('💾 === UPDATE START ===');
        console.log('💾 editingIdx:', editingIdx);
        console.log('💾 formData.subtitle raw:', JSON.stringify(formData.subtitle));
        console.log('💾 formData.subtitle type:', typeof formData.subtitle);
        
        const subtitleValue = formData.subtitle ? String(formData.subtitle).trim() : '';
        console.log('💾 After processing subtitle:', JSON.stringify(subtitleValue));
        
        const updatePayload = { 
          title: formData.title.trim(), 
          subtitle: subtitleValue,
          titleAr: formData.titleAr ? String(formData.titleAr).trim() : '',
          subtitleAr: formData.subtitleAr ? String(formData.subtitleAr).trim() : '',
          sideImage: formData.sideImage ? String(formData.sideImage).trim() : '',
          sideImageAr: formData.sideImageAr ? String(formData.sideImageAr).trim() : '',
          mobileImage: formData.mobileImage ? String(formData.mobileImage).trim() : '',
          mobileImageAr: formData.mobileImageAr ? String(formData.mobileImageAr).trim() : '',
          mobileImageRatio: normalizeCategorySliderMobileImageRatio(formData.mobileImageRatio),
          sideImagePosition: normalizeCategorySliderSideImagePosition(formData.sideImagePosition),
          cardsPerRow: formData.cardsPerRow === 5 ? 5 : 6,
          autoSlide: normalizeCategorySliderAutoSlide(formData.autoSlide),
          autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(formData.autoSlideIntervalMs),
          backgroundColor: normalizeCategorySliderBackground(formData.backgroundColor),
          productIds: normalizeProductIds(formData.productIds),
          slug: String(formData.slug || '').trim(),
          ...normalizeCategorySliderViewAll(formData),
        };
        console.log('💾 Final update payload:', JSON.stringify(updatePayload));
        console.log('💾 === UPDATE PAYLOAD READY ===');
        try {
          await axios.put(
            `/api/store/category-slider/${encodeURIComponent(String(editId))}`,
            updatePayload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (error) {
          if (error?.response?.status === 401) {
            token = await getToken(true);
            await axios.put(
              `/api/store/category-slider/${encodeURIComponent(String(editId))}`,
              updatePayload,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } else {
            throw error;
          }
        }
        const successMsg = updatePayload.subtitle 
          ? `Slider "${updatePayload.title}" with subtitle updated!`
          : `Slider "${updatePayload.title}" updated!`;
        toast.success(`${successMsg} Refresh the homepage to see changes.`);
      } else {
        // Create new slider
        console.log('💾 === CREATE START ===');
        console.log('💾 formData.subtitle raw:', JSON.stringify(formData.subtitle));
        console.log('💾 formData.subtitle type:', typeof formData.subtitle);
        console.log('💾 formData.subtitle isEmpty:', formData.subtitle === '');
        console.log('💾 formData.subtitle isFalsy:', !formData.subtitle);
        
        const subtitleValue = formData.subtitle ? String(formData.subtitle).trim() : '';
        console.log('💾 After processing subtitle:', JSON.stringify(subtitleValue));
        
        const createPayload = {
          title: formData.title.trim(),
          subtitle: subtitleValue,
          titleAr: formData.titleAr ? String(formData.titleAr).trim() : '',
          subtitleAr: formData.subtitleAr ? String(formData.subtitleAr).trim() : '',
          sideImage: formData.sideImage ? String(formData.sideImage).trim() : '',
          sideImageAr: formData.sideImageAr ? String(formData.sideImageAr).trim() : '',
          mobileImage: formData.mobileImage ? String(formData.mobileImage).trim() : '',
          mobileImageAr: formData.mobileImageAr ? String(formData.mobileImageAr).trim() : '',
          mobileImageRatio: normalizeCategorySliderMobileImageRatio(formData.mobileImageRatio),
          sideImagePosition: normalizeCategorySliderSideImagePosition(formData.sideImagePosition),
          cardsPerRow: formData.cardsPerRow === 5 ? 5 : 6,
          autoSlide: normalizeCategorySliderAutoSlide(formData.autoSlide),
          autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(formData.autoSlideIntervalMs),
          backgroundColor: normalizeCategorySliderBackground(formData.backgroundColor),
          productIds: normalizeProductIds(formData.productIds),
          slug: String(formData.slug || '').trim(),
          ...normalizeCategorySliderViewAll(formData),
        };
        console.log('💾 Create payload:', createPayload);
        await axios.post('/api/store/category-slider', createPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const successMsg = createPayload.subtitle 
          ? `Slider "${createPayload.title}" with subtitle created!`
          : `Slider "${createPayload.title}" created!`;
        toast.success(`${successMsg} Refresh the homepage to see changes.`);
      }

      setShowForm(false);
      setEditingIdx(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving slider:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to save slider';
      toast.error(message);
    }
  };

  const handleDeleteSlider = async (sliderId) => {
    if (!confirm('Delete this slider?')) return;

    const deleteId = normalizeId(sliderId);
    if (!deleteId || deleteId === 'undefined' || deleteId === 'null') {
      toast.error('Invalid slider ID');
      return;
    }

    try {
      const token = await getToken();
      try {
        await axios.delete('/api/store/category-slider', {
          headers: { Authorization: `Bearer ${token}` },
          params: { id: String(deleteId) },
        });
      } catch (err) {
        if (err?.response?.status === 404) {
          await axios.delete(`/api/store/category-slider/${encodeURIComponent(String(deleteId))}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          throw err;
        }
      }
      toast.success('Slider deleted');
      await fetchData();
    } catch (error) {
      console.error('Error deleting slider:', error);
      const message = error?.response?.data?.error || 'Failed to delete slider';
      toast.error(message);
    }
  };

  const addPickerProducts = (list, { replace = false } = {}) => {
    const normalized = (list || []).map((product) => ({
      ...product,
      id: normalizeId(product.id || product._id),
    })).filter((product) => product.id);
    setProducts((prev) => {
      const map = new Map(prev.map((product) => [normalizeId(product.id), product]));
      normalized.forEach((product) => map.set(product.id, product));
      return Array.from(map.values());
    });
    if (replace) {
      setFormData((prev) => ({
        ...prev,
        productIds: Array.from(new Set([...prev.productIds, ...normalized.map((product) => product.id)])),
      }));
    }
    return normalized;
  };

  useEffect(() => {
    if (!showForm) return undefined;
    const term = searchQuery.trim();
    if (productPickMode === 'manual' && term.length < 2) {
      setPickerResults([]);
      return undefined;
    }
    if (productPickMode === 'category' && !pickCategoryId) {
      setPickerResults([]);
      return undefined;
    }
    if (productPickMode === 'brand' && !pickBrand) {
      setPickerResults([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setPickerLoading(true);
        const token = await getToken();
        const params = { limit: 200, sort: 'name', manage: 'true' };
        if (productPickMode === 'manual') params.search = term;
        if (productPickMode === 'category') params.category = pickCategoryId;
        if (productPickMode === 'brand') params.brand = pickBrand;
        const { data } = await axios.get('/api/store/product', {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        if (!active) return;
        const list = (data.products || []).map((product) => ({
          ...product,
          id: normalizeId(product.id || product._id),
        })).filter((product) => product.id);
        setProducts((prev) => {
          const map = new Map(prev.map((product) => [normalizeId(product.id), product]));
          list.forEach((product) => map.set(product.id, product));
          return Array.from(map.values());
        });
        setPickerResults(list);
      } catch (error) {
        console.error('Product picker failed', error);
        if (active) setPickerResults([]);
      } finally {
        if (active) setPickerLoading(false);
      }
    }, productPickMode === 'manual' ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showForm, productPickMode, pickCategoryId, pickBrand, searchQuery, getToken]);

  const toggleProductSelection = (productId) => {
    const normalizedId = normalizeId(productId);
    if (!normalizedId) return;

    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(normalizedId)
        ? prev.productIds.filter((id) => id !== normalizedId)
        : [...prev.productIds, normalizedId],
    }));
  };

  const findCatalogProduct = (productId) => (
    products.find((product) => normalizeId(product.id) === normalizeId(productId))
  );

  const moveSelectedProduct = (fromIndex, toIndex) => {
    setFormData((prev) => {
      const ids = [...prev.productIds];
      if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= ids.length
        || toIndex >= ids.length
        || fromIndex === toIndex
      ) {
        return prev;
      }
      const [moved] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, moved);
      return { ...prev, productIds: ids };
    });
  };

  const renderSelectedProductList = (large = false) => {
    if (formData.productIds.length === 0) {
      return (
        <p className="rounded-lg bg-white px-3 py-4 text-center text-sm text-gray-400">
          No products selected yet. Add them by category, brand, or search.
        </p>
      );
    }

    return (
      <ul className={large ? 'space-y-2' : 'max-h-72 space-y-2 overflow-y-auto'}>
        {formData.productIds.map((productId, index) => {
          const product = findCatalogProduct(productId);
          const image = product?.images?.[0] || product?.image || '';
          return (
            <li
              key={`${productId}-${index}`}
              draggable
              onDragStart={() => setDragProductIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragProductIndex == null) return;
                moveSelectedProduct(dragProductIndex, index);
                setDragProductIndex(null);
              }}
              onDragEnd={() => setDragProductIndex(null)}
              className={`flex items-center gap-3 rounded-lg border bg-white ${
                large ? 'px-3 py-3' : 'gap-2 px-2 py-2'
              } ${dragProductIndex === index ? 'border-[#7B2BFF] opacity-60' : 'border-violet-100'}`}
            >
              <span className="cursor-grab select-none px-1 text-base leading-none text-slate-400" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
              <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#7B2BFF] font-bold text-white ${large ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-xs'}`}>{index + 1}</span>
              {image ? (
                <img src={image} alt="" className={`shrink-0 rounded object-cover ${large ? 'h-14 w-14' : 'h-9 w-9'}`} />
              ) : (
                <span className={`shrink-0 rounded bg-slate-100 ${large ? 'h-14 w-14' : 'h-9 w-9'}`} />
              )}
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold text-slate-800 ${large ? 'text-sm' : 'truncate text-xs'}`}>
                  {product?.name || 'Product'}
                </span>
                {product?.sku ? (
                  <span className={`block text-slate-400 ${large ? 'text-xs' : 'truncate text-[11px]'}`}>{product.sku}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => moveSelectedProduct(index, index - 1)}
                disabled={index === 0}
                className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move earlier"
                title="Move earlier"
              >
                <FiChevronUp size={large ? 18 : 16} />
              </button>
              <button
                type="button"
                onClick={() => moveSelectedProduct(index, index + 1)}
                disabled={index === formData.productIds.length - 1}
                className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move later"
                title="Move later"
              >
                <FiChevronDown size={large ? 18 : 16} />
              </button>
              <button
                type="button"
                onClick={() => toggleProductSelection(productId)}
                className="rounded p-1 text-red-500 hover:bg-red-50"
                aria-label="Remove product"
                title="Remove"
              >
                <FiX size={large ? 18 : 16} />
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Category Sliders</h1>
              <p className="text-gray-600">Create and manage product sliders for your store</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddSlider}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
              >
                <FiPlus size={18} /> New slider
              </button>
              <button
                onClick={() => setShowAllSliders(!showAllSliders)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  showAllSliders 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {showAllSliders ? '🌍 Viewing All Sliders' : '👤 My Sliders Only'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner when viewing all sliders */}
        {showAllSliders && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Viewing all sliders in database.</strong>{' '}
                  Sliders with an <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold">Other Store</span> badge belong to different stores.
                  {isPlatformAdmin ? (
                    <> As admin, you can edit and delete any slider. Orange styling is kept to show which store owns each slider.</>
                  ) : (
                    <> Only your sliders (blue border) can be edited or deleted.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div>
          <div>
            {sliders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border-2 border-dashed border-gray-300">
                <p className="text-xl text-gray-500 font-semibold mb-2">No sliders yet</p>
                <p className="text-gray-400 mb-6">Create your first slider to get started</p>
                <button
                  onClick={handleAddSlider}
                  className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold transition"
                >
                  <FiPlus size={20} /> Create First Slider
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortCategorySliders(sliders).map((slider, sliderIndex, orderedSliders) => {
                  const isOwnSlider = sliderBelongsToCurrentStore(slider);
                  const canManage = canManageSlider(slider);
                  const previousSlider = orderedSliders[sliderIndex - 1];
                  const nextSlider = orderedSliders[sliderIndex + 1];
                  const canMoveUp = canManage && sliderIndex > 0 && (isPlatformAdmin || sliderBelongsToCurrentStore(previousSlider));
                  const canMoveDown = canManage && sliderIndex < orderedSliders.length - 1 && (isPlatformAdmin || sliderBelongsToCurrentStore(nextSlider));
                  const isReordering = reorderingId === normalizeId(slider.id);
                  return (
                  <div key={slider.id} className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border-l-4 ${isOwnSlider ? 'border-blue-500' : 'border-orange-500'}`}>
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveSlider(slider.id, 'up')}
                            disabled={!canMoveUp || isReordering}
                            className={`p-2 rounded-lg transition ${
                              canMoveUp && !isReordering
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            }`}
                            title={canMoveUp ? 'Move up' : 'Cannot move up'}
                            aria-label="Move slider up"
                          >
                            <FiChevronUp size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlider(slider.id, 'down')}
                            disabled={!canMoveDown || isReordering}
                            className={`p-2 rounded-lg transition ${
                              canMoveDown && !isReordering
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            }`}
                            title={canMoveDown ? 'Move down' : 'Cannot move down'}
                            aria-label="Move slider down"
                          >
                            <FiChevronDown size={18} />
                          </button>
                        </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">{slider.title}</h3>
                          {!isOwnSlider && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                              Other Store
                            </span>
                          )}
                        </div>
                        {slider.subtitle && slider.subtitle.trim() !== '' && (
                          <p className="text-sm text-gray-600 mb-2 italic">"{slider.subtitle}"</p>
                        )}
                        {slider.titleAr ? (
                          <p className="text-sm text-gray-700 mb-1" dir="rtl">{slider.titleAr}</p>
                        ) : null}
                        {slider.subtitleAr ? (
                          <p className="text-sm text-gray-500 mb-2 italic" dir="rtl">"{slider.subtitleAr}"</p>
                        ) : null}
                        {(slider.sideImage || slider.sideImageAr || slider.mobileImage || slider.mobileImageAr) ? (
                          <div className="mb-2 flex items-center gap-3">
                            {slider.sideImage ? (
                              <div className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={slider.sideImage}
                                  alt=""
                                  className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
                                />
                                <span className="text-xs text-gray-500">English</span>
                              </div>
                            ) : null}
                            {slider.sideImageAr ? (
                              <div className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={slider.sideImageAr}
                                  alt=""
                                  className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
                                />
                                <span className="text-xs text-gray-500">Arabic</span>
                              </div>
                            ) : null}
                            {slider.mobileImage ? (
                              <div className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={slider.mobileImage}
                                  alt=""
                                  className="h-16 w-12 rounded-lg border border-gray-200 object-cover"
                                />
                                <span className="text-xs text-gray-500">App {normalizeCategorySliderMobileImageRatio(slider.mobileImageRatio)}</span>
                              </div>
                            ) : null}
                            {slider.mobileImageAr ? (
                              <div className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={slider.mobileImageAr}
                                  alt=""
                                  className="h-16 w-12 rounded-lg border border-gray-200 object-cover"
                                />
                                <span className="text-xs text-gray-500">App Arabic</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-sm text-gray-500 mt-1">📦 {slider.productIds?.length || 0} products · 🖥️ {slider.cardsPerRow === 5 ? 5 : 6} cards/row{slider.autoSlide ? ` · Auto slide ${Math.round((normalizeCategorySliderAutoSlideInterval(slider.autoSlideIntervalMs) || 4000) / 1000)}s` : ''}</p>
                        {normalizeCategorySliderViewAll(slider).viewAllEnabled ? (
                          <p className="mt-1 text-xs font-medium text-blue-700">
                            View all · {VIEW_ALL_TARGETS.find((item) => item.id === normalizeCategorySliderViewAll(slider).viewAllTarget)?.label || 'Default page'}
                          </p>
                        ) : null}
                        {slider.storeId && showAllSliders && (
                          <p className="text-xs text-gray-400 mt-1">Store ID: {slider.storeId.substring(0, 8)}...</p>
                        )}
                      </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleEditSlider(slider)}
                          disabled={!canManage}
                          className={`p-2 rounded-lg transition ${
                            canManage
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          title={canManage ? 'Edit' : 'Cannot edit other store\'s slider'}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteSlider(slider.id)}
                          disabled={!canManage}
                          className={`p-2 rounded-lg transition ${
                            canManage
                              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          title={canManage ? 'Delete' : 'Cannot delete other store\'s slider'}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(slider.productIds || []).slice(0, 4).map(pid => {
                        const prod = products.find(p => p.id === pid);
                        return prod ? (
                          <span key={pid} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                            {prod.name.substring(0, 25)}...
                          </span>
                        ) : null;
                      })}
                      {(slider.productIds?.length || 0) > 4 && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full">
                          +{slider.productIds.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>

          {/* Edit popup */}
          {showForm ? (
          <div className="fixed inset-0 z-40 flex items-start justify-center p-4 sm:p-8">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/50"
              aria-label="Close editor"
              onClick={() => {
                setShowForm(false);
                setSearchQuery('');
              }}
            />
            <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-4rem)]" lang="en" dir="ltr">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingIdx !== null ? 'Edit Slider' : 'New Slider'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSearchQuery('');
                  }}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5">
                <div className="space-y-4">
                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Slider Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Best Electronics"
                      className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Subtitle Input */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Subtitle (Optional)
                    </label>
                    <input
                      key={`subtitle-${editingIdx}`}
                      type="text"
                      value={formData.subtitle || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        console.log('📝 Subtitle input changed:', newValue);
                        console.log('📝 Length:', newValue.length);
                        setFormData(prev => {
                          const updated = { ...prev, subtitle: newValue };
                          console.log('📝 Updated formData:', updated);
                          return updated;
                        });
                      }}
                      onBlur={(e) => {
                        console.log('📝 Subtitle blur event, value:', e.target.value);
                      }}
                      placeholder="e.g., Discover our curated selection"
                      className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-sm"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-gray-700">Arabic copy</p>
                    <button
                      type="button"
                      disabled={translatingCopy || (!String(formData.title || '').trim() && !String(formData.subtitle || '').trim())}
                      onClick={translateSliderCopyToArabic}
                      className="text-xs font-semibold text-blue-600 hover:underline disabled:text-gray-400"
                    >
                      {translatingCopy ? 'Translating…' : 'Translate from English'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Arabic title
                    </label>
                    <input
                      type="text"
                      value={formData.titleAr || ''}
                      onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                      dir="rtl"
                      placeholder="عنوان القسم بالعربية"
                      className="w-full border-2 border-gray-200 rounded-lg p-3 text-right focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Arabic subtitle
                    </label>
                    <input
                      type="text"
                      value={formData.subtitleAr || ''}
                      onChange={(e) => setFormData({ ...formData, subtitleAr: e.target.value })}
                      dir="rtl"
                      placeholder="العنوان الفرعي بالعربية"
                      className="w-full border-2 border-gray-200 rounded-lg p-3 text-right focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Side image (English)
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Shown on desktop when the storefront is in English. Left in English appears on the right in Arabic.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={Boolean(uploadingSideImage)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSideImageUpload(file, 'sideImage');
                        e.target.value = '';
                      }}
                      className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    {uploadingSideImage === 'sideImage' ? (
                      <p className="mt-2 text-xs text-blue-600">Uploading English image...</p>
                    ) : null}
                    {formData.sideImage ? (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.sideImage}
                          alt="English side image preview"
                          className="mx-auto max-h-40 w-full rounded-lg object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, sideImage: '' }))}
                          className="mt-2 w-full rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove English image
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Side image (Arabic)
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Shown on desktop when the storefront is in Arabic. If empty, the English image is used.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={Boolean(uploadingSideImage)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSideImageUpload(file, 'sideImageAr');
                        e.target.value = '';
                      }}
                      className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    {uploadingSideImage === 'sideImageAr' ? (
                      <p className="mt-2 text-xs text-blue-600">Uploading Arabic image...</p>
                    ) : null}
                    {formData.sideImageAr ? (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.sideImageAr}
                          alt="Arabic side image preview"
                          className="mx-auto max-h-40 w-full rounded-lg object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, sideImageAr: '' }))}
                          className="mt-2 w-full rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove Arabic image
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-bold text-gray-800">App image</p>
                    <p className="mt-1 mb-3 text-xs text-gray-500">
                      Used by the mobile app only. Pick the ratio, then upload. The website does not show this image. The chosen ratio is sent to the app with the image.
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {CATEGORY_SLIDER_MOBILE_IMAGE_RATIOS.map((ratio) => {
                        const selected = normalizeCategorySliderMobileImageRatio(formData.mobileImageRatio) === ratio.value;
                        return (
                          <button
                            key={ratio.value}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, mobileImageRatio: ratio.value }))}
                            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
                              selected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {ratio.value}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                          App image (English)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={Boolean(uploadingSideImage)}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSideImageUpload(file, 'mobileImage');
                            e.target.value = '';
                          }}
                          className="w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-100"
                        />
                        {uploadingSideImage === 'mobileImage' ? (
                          <p className="mt-2 text-xs text-blue-600">Uploading app image...</p>
                        ) : null}
                        {formData.mobileImage ? (
                          <div className="mt-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={formData.mobileImage}
                              alt="English app image preview"
                              className="w-28 rounded-lg border border-gray-200 object-cover"
                              style={appImageFrameStyle(formData.mobileImageRatio)}
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, mobileImage: '' }))}
                              className="mt-2 w-full rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove English app image
                            </button>
                          </div>
                        ) : (
                          <div
                            className="mt-3 flex w-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-[11px] text-slate-400"
                            style={appImageFrameStyle(formData.mobileImageRatio)}
                          >
                            {normalizeCategorySliderMobileImageRatio(formData.mobileImageRatio)}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                          App image (Arabic)
                        </label>
                        <p className="mb-2 text-xs text-gray-500">
                          Optional. If empty, the app uses the English image.
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={Boolean(uploadingSideImage)}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSideImageUpload(file, 'mobileImageAr');
                            e.target.value = '';
                          }}
                          className="w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-100"
                        />
                        {uploadingSideImage === 'mobileImageAr' ? (
                          <p className="mt-2 text-xs text-blue-600">Uploading Arabic app image...</p>
                        ) : null}
                        {formData.mobileImageAr ? (
                          <div className="mt-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={formData.mobileImageAr}
                              alt="Arabic app image preview"
                              className="w-28 rounded-lg border border-gray-200 object-cover"
                              style={appImageFrameStyle(formData.mobileImageRatio)}
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, mobileImageAr: '' }))}
                              className="mt-2 w-full rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove Arabic app image
                            </button>
                          </div>
                        ) : (
                          <div
                            className="mt-3 flex w-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-[11px] text-slate-400"
                            style={appImageFrameStyle(formData.mobileImageRatio)}
                          >
                            {normalizeCategorySliderMobileImageRatio(formData.mobileImageRatio)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(formData.sideImage || formData.sideImageAr) ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-gray-700">Side image position (desktop)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['left', 'right'].map((position) => {
                          const selected = normalizeCategorySliderSideImagePosition(formData.sideImagePosition) === position;
                          return (
                            <button
                              key={position}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, sideImagePosition: position }))}
                              className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold capitalize transition ${
                                selected
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {position}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Slider panel background
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                      Background color for the slider panel on the homepage (title + product row). Works with or without a side image. Click <strong>Update Slider</strong> after changing. Avoid pure white (#ffffff) on a white page — it will look unchanged.
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {CATEGORY_SLIDER_BACKGROUND_PRESETS.map((preset) => {
                        const selected = normalizeCategorySliderBackground(formData.backgroundColor) === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, backgroundColor: preset.value }))}
                            className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition ${
                              selected
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-gray-200"
                              style={{ backgroundColor: preset.value }}
                              aria-hidden="true"
                            />
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={normalizeCategorySliderBackground(formData.backgroundColor)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-white p-1"
                        aria-label="Custom background color"
                      />
                      <input
                        type="text"
                        value={normalizeCategorySliderBackground(formData.backgroundColor)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        placeholder="#f3f0ff"
                        className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div
                      className="mt-3 rounded-lg border border-gray-200 px-4 py-3"
                      style={{ backgroundColor: normalizeCategorySliderBackground(formData.backgroundColor) }}
                    >
                      <p className="text-sm font-semibold text-gray-900">Panel preview</p>
                      <p className="text-xs text-gray-600">
                        Saved color: {normalizeCategorySliderBackground(formData.backgroundColor)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Product cards per row (desktop)
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                      How many product cards are visible in one row on large screens.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[5, 6].map((count) => {
                        const selected = Number(formData.cardsPerRow) === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, cardsPerRow: count }))}
                            className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                              selected
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {count} cards
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Auto slide
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                      Turn <strong>On</strong>, choose a speed, then click <strong>Update Slider</strong> at the bottom. The homepage product row will scroll continuously in a loop (all products, no arrow clicks needed). Requires at least 2 products.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: false, label: 'Off' },
                        { value: true, label: 'On' },
                      ].map(({ value, label }) => {
                        const selected = normalizeCategorySliderAutoSlide(formData.autoSlide) === value;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, autoSlide: value }))}
                            className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                              selected
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {normalizeCategorySliderAutoSlide(formData.autoSlide) ? (
                      <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Slide speed
                        </label>
                        <p className="mb-3 text-xs text-gray-500">
                          Lower time = faster scroll. The entire product row moves smoothly and loops forever.
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {CATEGORY_SLIDER_AUTO_SLIDE_SPEED_PRESETS.map(({ label, value }) => {
                            const selected = normalizeCategorySliderAutoSlideInterval(formData.autoSlideIntervalMs) === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, autoSlideIntervalMs: value }))}
                                className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition ${
                                  selected
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      View all button
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                      Turn this on to show View all on the homepage slider. Default opens a separate page for this slider, with its title, subtitle, and products in a grid.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: false, label: 'Off' },
                        { value: true, label: 'On' },
                      ].map(({ value, label }) => {
                        const selected = normalizeCategorySliderViewAll(formData).viewAllEnabled === value;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, viewAllEnabled: value }))}
                            className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                              selected
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {normalizeCategorySliderViewAll(formData).viewAllEnabled ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-bold text-gray-700">Where it opens</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {VIEW_ALL_TARGETS.map((option) => {
                            const selected = normalizeCategorySliderViewAll(formData).viewAllTarget === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, viewAllTarget: option.id }))}
                                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                                  selected
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        {formData.viewAllTarget === 'default' ? (
                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-gray-700">Path</span>
                            <span className="flex items-center overflow-hidden rounded-lg border-2 border-gray-200 focus-within:border-blue-500">
                              <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500">/slider/</span>
                              <input
                                type="text"
                                value={formData.slug || ''}
                                placeholder={slugifyCategory(formData.title) || 'page-name'}
                                onChange={(event) => setFormData((prev) => ({
                                  ...prev,
                                  slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'),
                                }))}
                                className="w-full bg-white px-3 py-2 text-sm outline-none"
                              />
                            </span>
                            <span className="block text-xs text-gray-500">
                              Change this path if you want a different page. Leave it blank to use the title.
                              {categorySliderDefaultPath(formData.slug || slugifyCategory(formData.title))
                                ? ` Opens ${categorySliderDefaultPath(formData.slug || slugifyCategory(formData.title))}.`
                                : ''}
                            </span>
                          </label>
                        ) : (
                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-gray-700">Path</span>
                            <input
                              type="text"
                              value={
                                formData.viewAllTarget === 'category' && formData.viewAllValue
                                  ? `/category/${formData.viewAllValue}`
                                  : formData.viewAllTarget === 'landing' && formData.viewAllValue
                                    ? `/c/${formData.viewAllValue}`
                                    : (formData.viewAllValue || '')
                              }
                              onChange={(event) => {
                                const raw = event.target.value.trim();
                                if (raw.startsWith('/slider/')) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    viewAllTarget: 'default',
                                    slug: raw.replace(/^\/slider\//, '').toLowerCase().replace(/[^a-z0-9-]/g, ''),
                                  }));
                                  return;
                                }
                                if (raw.startsWith('/category/')) {
                                  setFormData((prev) => ({ ...prev, viewAllTarget: 'category', viewAllValue: raw.replace(/^\/category\//, '').replace(/\/$/, '') }));
                                  return;
                                }
                                if (raw.startsWith('/c/')) {
                                  setFormData((prev) => ({ ...prev, viewAllTarget: 'landing', viewAllValue: raw.replace(/^\/c\//, '').split('/')[0] }));
                                  return;
                                }
                                const knownPage = BOTTOM_NAV_PAGE_OPTIONS.some((page) => page.value === raw);
                                setFormData((prev) => ({
                                  ...prev,
                                  viewAllTarget: knownPage ? 'page' : 'custom',
                                  viewAllValue: raw,
                                }));
                              }}
                              placeholder="/category/kitchen or /shop or https://example.com"
                              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            <span className="block text-xs text-gray-500">Pick a destination above, then change this path if you need a different address.</span>
                          </label>
                        )}
                        {formData.viewAllTarget === 'category' ? (
                          <StoreDropdown
                            value={formData.viewAllValue || ''}
                            onChange={(value) => setFormData((prev) => ({ ...prev, viewAllValue: value }))}
                            options={categoryOptions}
                            placeholder="Choose a category"
                            searchable
                          />
                        ) : null}
                        {formData.viewAllTarget === 'landing' ? (
                          <StoreDropdown
                            value={formData.viewAllValue || ''}
                            onChange={(value) => setFormData((prev) => ({ ...prev, viewAllValue: value }))}
                            options={landingOptions}
                            placeholder="Choose a landing page"
                            searchable
                          />
                        ) : null}
                        {formData.viewAllTarget === 'page' ? (
                          <StoreDropdown
                            value={formData.viewAllValue || ''}
                            onChange={(value) => setFormData((prev) => ({ ...prev, viewAllValue: value }))}
                            options={BOTTOM_NAV_PAGE_OPTIONS}
                            placeholder="Choose a page"
                            searchable
                          />
                        ) : null}
                        {formData.viewAllTarget === 'custom' ? (
                          <input
                            type="text"
                            value={formData.viewAllValue || ''}
                            onChange={(event) => setFormData((prev) => ({ ...prev, viewAllValue: event.target.value }))}
                            placeholder="/shop or https://example.com"
                            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Subtitle Preview */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-purple-700 mb-2">📝 Subtitle Preview</p>
                    {formData.subtitle && String(formData.subtitle).trim() ? (
                      <p className="text-sm text-gray-700 italic font-medium">"{String(formData.subtitle).trim()}"</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No subtitle yet</p>
                    )}
                  </div>

                  {/* Selected products, in slider order */}
                  <div className="rounded-lg border-2 border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-violet-950">Selected products</p>
                      <p className="text-2xl font-bold text-[#7B2BFF]">{formData.productIds.length}</p>
                    </div>
                    <p className="mb-3 text-xs text-violet-800">
                      Position 1 is the first product in the slider. Drag a row, or use the arrows, to change the order.
                    </p>
                    {formData.productIds.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedProductsOpen(true)}
                        className="mb-3 w-full rounded-lg bg-[#7B2BFF] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Open larger view
                      </button>
                    ) : null}
                    {renderSelectedProductList(false)}
                  </div>

                  {selectedProductsOpen ? (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                      <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/50"
                        aria-label="Close selected products"
                        onClick={() => setSelectedProductsOpen(false)}
                      />
                      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-violet-100 px-5 py-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Selected products</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {formData.productIds.length} products. Position 1 shows first. Drag a row or use the arrows.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedProductsOpen(false)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label="Close"
                          >
                            <FiX size={20} />
                          </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto bg-violet-50/40 px-5 py-4">
                          {renderSelectedProductList(true)}
                        </div>
                        <div className="border-t border-slate-100 px-5 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedProductsOpen(false)}
                            className="w-full rounded-lg bg-[#7B2BFF] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Add products
                    </label>
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      {[
                        { id: 'manual', label: 'Manual' },
                        { id: 'category', label: 'Category' },
                        { id: 'brand', label: 'Brand' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setProductPickMode(option.id)}
                          className={`rounded-lg border-2 px-2 py-2 text-sm font-semibold ${
                            productPickMode === option.id
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {productPickMode === 'manual' ? (
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name or SKU"
                        className="w-full rounded-lg border-2 border-gray-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : null}
                    {productPickMode === 'category' ? (
                      <StoreDropdown
                        value={pickCategoryId}
                        onChange={setPickCategoryId}
                        options={categoryIdOptions}
                        placeholder="Choose a category"
                        searchable
                      />
                    ) : null}
                    {productPickMode === 'brand' ? (
                      <StoreDropdown
                        value={pickBrand}
                        onChange={setPickBrand}
                        options={brandOptions}
                        placeholder="Choose a brand"
                        searchable
                      />
                    ) : null}
                    {pickerResults.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => addPickerProducts(pickerResults, { replace: true })}
                        className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                      >
                        Add all shown ({pickerResults.length})
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border-2 border-gray-200 p-3">
                    {pickerLoading ? (
                      <p className="py-4 text-center text-sm text-gray-400">Loading products…</p>
                    ) : pickerResults.length > 0 ? (
                      pickerResults.map((product) => (
                        <label
                          key={product.id}
                          className="flex cursor-pointer items-start gap-3 rounded p-2 transition hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.productIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="mt-1 h-4 w-4 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-semibold text-gray-800">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-400">{product.sku || ''}</p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="py-4 text-center text-sm text-gray-400">
                        {productPickMode === 'manual'
                          ? 'Type at least 2 letters to search.'
                          : productPickMode === 'category'
                            ? 'Choose a category to list its products.'
                            : 'Choose a brand to list its products.'}
                      </p>
                    )}
                  </div>

                  {/* Clear All Button */}
                  {formData.productIds.length > 0 && (
                    <button
                      onClick={() => setFormData({ ...formData, productIds: [] })}
                      className="w-full text-red-600 border-2 border-red-200 py-2 rounded-lg hover:bg-red-50 font-semibold transition text-sm"
                    >
                      Clear All
                    </button>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t-2 border-gray-200">
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setSearchQuery('');
                      }}
                      className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSlider}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg font-semibold transition text-sm"
                    >
                      {editingIdx !== null ? '💾 Update' : '✨ Create'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
