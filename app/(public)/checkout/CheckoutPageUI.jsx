"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Check, Info, MapPin, Truck, AlertTriangle } from "lucide-react";
import axios from "axios";
import { countryCodes, UAE_PHONE_CODE, UAE_PHONE_CODE_OPTIONS } from "@/assets/countryCodes";
import { indiaStatesAndDistricts } from "@/assets/indiaStatesAndDistricts";
import { useSelector, useDispatch } from "react-redux";
import { fetchAddress, clearAddresses } from "@/lib/features/address/addressSlice";
import {
  readGuestCheckoutState,
  writeGuestCheckoutState,
  upsertGuestAddress,
  removeGuestAddress,
  formToGuestDraft,
  normalizeGuestAddress,
  isCompleteGuestDraft,
} from "@/lib/guestCheckoutAddress";
import { clearCart, deleteItemFromCart, setCartEntry } from "@/lib/features/cart/cartSlice";
import { fetchShippingSettings, calculateShipping, cartHasOnlyFreeShippingProducts, getCODFee } from "@/lib/shipping";
import { getActiveCheckoutAlert } from '@/lib/checkoutAlert';
import { isStorefrontProductInStock } from '@/lib/productVisibility';
import {
  getPaymentMethodLimitError,
  isPaymentMethodEnabled,
  isPaymentMethodOverLimit,
} from '@/lib/paymentMethodLimits';
import {
  getAvailableShippingOptions,
  getDefaultShippingOption,
  getShippingOptionById,
} from '@/lib/shippingOptions';
import { trackMetaEvent } from "@/lib/metaPixelClient";
import { trackBeginCheckoutDual } from "@/lib/ecommerceTracking";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import dynamic from "next/dynamic";
import Script from "next/script";
import Link from "next/link";
import Image from "@/components/SafeNextImage";
import BnplLogo from "@/components/BnplLogo";
import { useStorefrontI18n } from "@/lib/useStorefrontI18n";
import { useStorefrontMarket } from "@/lib/useStorefrontMarket";
import { isStorefrontWalletEnabled } from "@/lib/storefrontWallet";
import { trackCustomerEvent, withOrderTrackingFields, getOrCreateAnonymousId, getOrCreateSessionId } from '@/lib/trackingClient';
import { pushGtmEcommerceEvent } from '@/lib/pushGtmEcommerceEvent';
import { cartLinesToGtmItems, cartLinesToMetaItems } from '@/lib/gtmEcommerceHelpers';
import { GA4_CURRENCY, toGa4PaymentType } from '@/lib/ga4Item';
import { ensureGa4CategoryCache } from '@/lib/ga4CategoryLookup';
import { runTrackedOnce } from '@/lib/trackingDedupe';
import { GTM_EVENTS, gtmDedupeKey } from '@/lib/gtmEvents';
import { getCartEntryProductId, getCartEntryQuantity, isFreeGiftEntry } from "@/lib/freeGiftUtils";
import { computeCouponDiscount } from "@/lib/couponDiscount";
import { getCartProductIdsNeedingVariants, mergeFetchedProducts } from '@/lib/cartProductFetch';
import { resolveCartLinePricing, resolveMatrixCartMaxPacks, isBulkBundleProduct, isMatrixStyleProduct, findBulkBundleVariant, getBulkBundleTiers } from "@/lib/bulkBundleCart";
import { decrementCartItem, incrementCartItem } from "@/lib/bundleCartActions";
import { HAMODY_LOGO_PATH } from "@/lib/brandLogo";
import {
  rememberPendingCheckoutOrder,
  getPendingCheckoutOrderId,
  clearPendingCheckoutOrder,
} from '@/lib/pendingCheckoutOrder';
import {
  getPhoneInputError,
  getPhoneValidationMessage,
  isValidPhoneNumber,
} from '@/lib/phoneValidation';
import { UAE_EMIRATES, getUaeAreaOptionsForEmirate, getUaeAreasForEmirate, isUaeCountry } from "@/lib/uaeEmirateAreas";
import SearchableSelect from "@/components/SearchableSelect";
import PhoneNumberField from "@/components/PhoneNumberField";
import VisaLogo from '../../../assets/creditcards/visa.png';
import MastercardLogo from '../../../assets/creditcards/mastercard.png';
import GooglePayLogo from '../../../assets/creditcards/google-pay.png';
import ApplePayLogo from '../../../assets/creditcards/apple-pay.png';
import AmexLogo from '../../../assets/creditcards/11.webp';
import { STORE_CURRENCY } from '@/lib/storeCurrency';
import { AedText } from '@/components/CurrencySymbol';
import {
  CUSTOMER_PICKUP_ADDRESS,
  customerPickupLocationFields,
  customerPickupMapEmbedUrl,
  customerPickupMapLink,
  isCustomerPickupAllowedForLines,
} from '@/lib/customerPickup';
import { matchVariantByOptions } from '@/lib/productVariantOptions';
import { getProductSubtitle } from '@/lib/productDisplay';
import { getProductPath } from '@/lib/productUrl';
import { collectCheckoutValidationIssues, scrollToCheckoutField } from '@/lib/checkoutValidation';
import { composeAddressStreetLine, hasCompleteAddressStreetLine } from '@/lib/addressLine';
import CheckoutValidationAlert from '@/components/CheckoutValidationAlert';
import toast from 'react-hot-toast';

const SignInModal = dynamic(() => import("@/components/SignInModal"), { ssr: false });
const AddressModal = dynamic(() => import("@/components/AddressModal"), { ssr: false });
const PrepaidUpsellModal = dynamic(() => import("@/components/PrepaidUpsellModal"), { ssr: false });

function isHostedCardWallet(payment) {
  return payment === 'vaultspay' || payment === 'googlepay' || payment === 'applepay';
}

function formatDeliveryDays(value, fallback = '2-5') {
  const raw = String(value || fallback).replace(/\s*days?/gi, '').trim();
  return raw ? `${raw} days` : `${fallback} days`;
}

function resolveGuestCity(values) {
  return String(values?.district || values?.state || values?.city || '').trim();
}

function getGuestCountryOptions() {
  return countryCodes.map((entry) => entry.label.replace(/ \(.*\)/, ''));
}

function getGuestCountryCode(countryName) {
  const match = countryCodes.find((entry) => entry.label.replace(/ \(.*\)/, '') === countryName);
  return match?.code || '+971';
}

const CHECKOUT_ORDER_PREVIEW_LIMIT = 2;
const CHECKOUT_ORDER_MOBILE_PREVIEW_LIMIT = 1;
const CHECKOUT_RETURN_PATH_KEY = 'Hamody_checkout_return_path';

function isCouponAllowedPayment(payment) {
  return payment === 'card' || payment === 'cod';
}

function CheckoutAlertBanner({ alert, className = '' }) {
  if (!alert) return null;

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-[#E2E7E8] bg-white px-4 py-3 text-[#05090D] ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#8D5900]" />
        <div>
          <p className="font-semibold">{alert.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{alert.message}</p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPageUI({ initialCheckoutAlert = null }) {
  const { user, loading: authLoading, getToken } = useAuth();
  const dispatch = useDispatch();
  const { t, isArabic } = useStorefrontI18n();
  const { market, convertPrice } = useStorefrontMarket();
  const storefrontWalletEnabled = isStorefrontWalletEnabled();
  const addressList = useSelector((state) => state.address?.list || []);
  const addressFetchError = useSelector((state) => state.address?.error);
  const [guestAddresses, setGuestAddresses] = useState([]);
  const guestHydratedRef = useRef(false);
  const checkoutAddressList = user ? addressList : guestAddresses;
  const { cartItems } = useSelector((state) => state.cart);
  const products = useSelector((state) => state.product.list);
  
  const [form, setForm] = useState({
    addressId: "",
    payment: "cod",
    phoneCode: '+971',
    country: 'United Arab Emirates',
    state: 'Dubai',
    district: '',
    street: '',
    buildingOrVilla: '',
    streetName: '',
    apartmentOrFloor: '',
    city: '',
    pincode: '',
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    alternatePhoneCode: '+971',
  });

  // For India / UAE state-area dropdowns
  const [districts, setDistricts] = useState(() => getUaeAreasForEmirate('Dubai'));
  const [placingOrder, setPlacingOrder] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const [showPrepaidModal, setShowPrepaidModal] = useState(false);
  const [upsellOrderId, setUpsellOrderId] = useState(null);
  const [upsellOrderTotal, setUpsellOrderTotal] = useState(0);
  const [upsellToken, setUpsellToken] = useState('');
  const [navigatingToSuccess, setNavigatingToSuccess] = useState(false);
  const [shippingSetting, setShippingSetting] = useState(null);
  const [checkoutAlert, setCheckoutAlert] = useState(initialCheckoutAlert);
  const [shipping, setShipping] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('');
  const [pickupRule, setPickupRule] = useState({ enabled: false, scope: 'all', skus: [] });
  const [fulfillmentChoice, setFulfillmentChoice] = useState('delivery');
  const [showPickupMap, setShowPickupMap] = useState(false);
  const isCustomerPickupSelected = fulfillmentChoice === 'pickup';
  const [showSignIn, setShowSignIn] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAllOrderItemsModal, setShowAllOrderItemsModal] = useState(false);
  const [removeLastItemConfirm, setRemoveLastItemConfirm] = useState(null);
  const [leavingCheckout, setLeavingCheckout] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [abandonSaved, setAbandonSaved] = useState(false);
  const [abandonHeartbeat, setAbandonHeartbeat] = useState(0);
  const [tabbyCardLoaded, setTabbyCardLoaded] = useState(false);

  // Coupon logic
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [formError, setFormError] = useState("");
  const [sidebarPayError, setSidebarPayError] = useState("");
  const [validationAlertOpen, setValidationAlertOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [invalidFieldIds, setInvalidFieldIds] = useState(() => new Set());
  const [checkoutProductsLoaded, setCheckoutProductsLoaded] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const beginCheckoutTrackedRef = useRef(false);
  const tabbyPublicKey = process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || '';
  const tabbyMerchantCode = process.env.NEXT_PUBLIC_TABBY_MERCHANT_CODE || process.env.TABBY_MERCHANT_CODE || 'HAMODY';
  const formatMoneyPlain = (amount) => {
    const converted = Number(convertPrice(Number(amount || 0)) || 0);
    return `${market.currency} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatMoneyFixedPlain = (amount) => {
    const converted = Number(convertPrice(Number(amount || 0)) || 0);
    return `${market.currency} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatMoney = (amount) => <AedText currency={market.currency}>{formatMoneyPlain(amount)}</AedText>;
  const formatMoneyFixed = (amount) => <AedText currency={market.currency}>{formatMoneyFixedPlain(amount)}</AedText>;

  const cleanDigits = (value) => (value ? String(value).replace(/\D/g, '') : '');
  const sanitizePincode = (value) => cleanDigits(value).trim();
  const isZeroOnlyPincode = (value) => /^0+$/.test(String(value || '').trim());
  const isIndiaCountry = (value) => String(value || '').trim().toLowerCase() === 'india';
  const hasValidPhone = (value, code = form.phoneCode || '+971') => isValidPhoneNumber(value, code);
  const pickValidPincode = (...values) => {
    for (const value of values) {
      const normalized = sanitizePincode(value);
      if (normalized && !isZeroOnlyPincode(normalized)) return normalized;
    }
    return '';
  };
  
  const handleApplyCoupon = async (e, codeOverride) => {
    if (e?.preventDefault) e.preventDefault();
    const codeToApply = String(codeOverride ?? coupon ?? '').trim();
    if (!codeToApply) {
      setCouponError("Enter a coupon code to see discount.");
      return;
    }

    if (!isCouponAllowedPayment(form.payment)) {
      setCouponError('Coupons are available for Card and Cash on Delivery only.');
      return;
    }

    if (!storeId) {
      setCouponError("Store information not loaded. Please refresh.");
      return;
    }
    
    setCoupon(codeToApply);
    setCouponLoading(true);
    setCouponError("");
    
    try {
      const cartItemsArray = Object.entries(cartItems || {})
        .map(([id, value]) => ({
          productId: getCartEntryProductId(id, value),
          quantity: getCartEntryQuantity(value),
          variantId: typeof value === 'object' ? value?.variantId : undefined,
          isFreeGift: isFreeGiftEntry(value),
        }))
        .filter((item) => item.quantity > 0 && item.productId && !item.isFreeGift);
      
      // Calculate total for validation
      const itemsTotal = cartItemsArray.reduce((sum, item) => {
        const product = products.find((p) => p._id === item.productId);
        if (!product) return sum;
        const cartValue = cartItems[item.productId] ?? cartItems[Object.keys(cartItems).find((key) => getCartEntryProductId(key, cartItems[key]) === item.productId)];
        const pricing = resolveCartLinePricing(product, cartValue, item.quantity);
        return sum + pricing.lineTotal;
      }, 0);
      
      const cartProductIds = cartItemsArray.map((item) => item.productId);
      
      console.log('Applying coupon:', codeToApply.toUpperCase());
      console.log('Order total:', itemsTotal);
      console.log('Cart products:', cartProductIds);
      
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToApply.toUpperCase(),
          storeId: storeId,
          orderTotal: itemsTotal,
          userId: user?.uid || undefined,
          cartProductIds: cartProductIds,
        }),
      });
      
      const data = await res.json();
      
      console.log('Coupon validation response:', data);
      
      if (res.ok && data.valid) {
        console.log('✅ Coupon applied successfully!');
        console.log('Discount amount:', data.coupon.discountAmount);
        setAppliedCoupon(data.coupon);
        setCouponError("");
        setShowCouponModal(false);
        setCoupon(''); // Clear input
      } else {
        console.error('❌ Coupon validation failed:', data.error);
        setCouponError(data.error || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError("Failed to apply coupon");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(CHECKOUT_RETURN_PATH_KEY)) return;
      const ref = document.referrer;
      if (!ref) return;
      const refUrl = new URL(ref, window.location.origin);
      if (refUrl.origin !== window.location.origin) return;
      const path = `${refUrl.pathname}${refUrl.search}`;
      if (path === '/checkout' || path === '/cart') return;
      sessionStorage.setItem(CHECKOUT_RETURN_PATH_KEY, path);
    } catch {
      // Ignore referrer parsing failures.
    }
  }, []);

  // If the customer returns to checkout after abandoning Tabby/Tamara/Stripe,
  // try to cancel ONLY if the order is still unpaid. Never clobber a capture
  // that completed while they bounced back to /checkout.
  useEffect(() => {
    const pendingOrderId = getPendingCheckoutOrderId();
    if (!pendingOrderId) return undefined;

    let cancelled = false;
    (async () => {
      try {
        await fetch('/api/payment-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: pendingOrderId,
            reason: 'Returned to checkout without completing payment',
          }),
        });
      } catch (error) {
        console.error('Failed to cancel pending checkout order:', error);
      } finally {
        if (!cancelled) clearPendingCheckoutOrder();
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!storefrontWalletEnabled || !user || !getToken) {
      setWalletBalance(0);
      return undefined;
    }

    let ignore = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/wallet', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!ignore && res.ok) {
          setWalletBalance(Number(data.rupeesValue ?? data.coins ?? 0));
        }
      } catch {
        if (!ignore) setWalletBalance(0);
      }
    })();

    return () => { ignore = true; };
  }, [user, getToken, storefrontWalletEnabled]);

  // Fetch only the products that are in the cart (fast targeted batch fetch)
  useEffect(() => {
    const cartKeys = [...new Set(
      Object.entries(cartItems || {})
        .map(([id, value]) => getCartEntryProductId(id, value))
        .filter((id) => {
          const trimmed = String(id || '').trim();
          return trimmed && trimmed !== 'undefined' && trimmed !== 'null';
        })
    )];
    if (cartKeys.length === 0) {
      setCheckoutProductsLoaded(true);
      return undefined;
    }

    const missingIds = getCartProductIdsNeedingVariants(cartItems, products);
    if (missingIds.length === 0) {
      setCheckoutProductsLoaded(true);
      return undefined;
    }

    let ignore = false;
    setCheckoutProductsLoaded(false);
    const loadCartProducts = async () => {
      try {
        const { data } = await axios.post('/api/products/batch', { productIds: missingIds });
        if (ignore || !data?.products?.length) return;
        dispatch({
          type: 'product/setProduct',
          payload: mergeFetchedProducts(products, data.products),
        });
      } catch (e) {
        console.warn('Cart product fetch failed:', e.message);
      } finally {
        if (!ignore) setCheckoutProductsLoaded(true);
      }
    };
    loadCartProducts();
    return () => { ignore = true; };
  }, [cartItems, dispatch, products]);

  // Keep abandoned-checkout timer alive while customer is still on the page
  useEffect(() => {
    if (placingOrder || payingNow) return undefined;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setAbandonHeartbeat((count) => count + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [placingOrder, payingNow]);

  // Capture abandoned checkout (debounced) — includes anonymous browser sessions
  useEffect(() => {
    if (placingOrder || payingNow) return undefined;
    const cartEntries = Object.entries(cartItems || {});
    if (cartEntries.length === 0) return undefined;

    const captureAbandonedCheckout = async () => {
      try {
        const items = cartEntries.map(([id, value]) => {
          const productId = getCartEntryProductId(id, value);
          const quantity = getCartEntryQuantity(value);
          const product = products.find((p) => String(p._id) === String(productId));
          if (isFreeGiftEntry(value)) {
            return {
              productId,
              quantity,
              price: 0,
              lineTotal: 0,
              name: product?.name || 'Product',
              variantOptions: typeof value === 'object' ? value?.variantOptions || null : null,
              isFreeGift: true,
            };
          }
          const pricing = resolveCartLinePricing(product, value, quantity);
          return {
            productId,
            quantity,
            price: pricing.unitPrice,
            lineTotal: pricing.lineTotal,
            name: product?.name || 'Product',
            variantOptions: typeof value === 'object' ? value?.variantOptions || null : null,
            isFreeGift: false,
          };
        }).filter((it) => it.quantity > 0 && it.productId);

        if (items.length === 0) return;

        const cartTotal = items.reduce(
          (sum, it) => sum + Number(it.lineTotal ?? (Number(it.price) * Number(it.quantity))),
          0,
        );
        const anonymousId = typeof window !== 'undefined' ? getOrCreateAnonymousId() : null;
        const sessionId = typeof window !== 'undefined' ? getOrCreateSessionId() : null;

        const payload = {
          items,
          cartTotal,
          currency: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED',
          userId: user?.uid || null,
          anonymousId,
          sessionId,
          customer: {
            name: form.name || null,
            email: form.email || user?.email || null,
            phone: form.phone || null,
            phoneCode: form.phoneCode || '+971',
            address: {
              country: form.country,
              state: form.state,
              district: form.district,
              city: resolveGuestCity(form),
              street: form.street,
              pincode: form.pincode,
            },
          },
        };

        if (typeof window !== 'undefined' && !user) {
          writeGuestCheckoutState({
            addresses: guestAddresses,
            selectedId: form.addressId,
            draft: formToGuestDraft(form),
          });
        }

        const response = await fetch('/api/abandoned-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });

        if (response.ok) {
          setAbandonSaved(true);
        }
      } catch (e) {
        console.warn('[checkout] abandoned capture failed:', e?.message || e);
      }
    };

    const timer = setTimeout(captureAbandonedCheckout, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        captureAbandonedCheckout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [form, cartItems, products, user, guestAddresses, placingOrder, payingNow, abandonHeartbeat]);

  // Logged-in: fetch saved addresses. Guest: restore checkout address from local storage.
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      guestHydratedRef.current = false;
      if (getToken) dispatch(fetchAddress({ getToken }));
      return;
    }

    dispatch(clearAddresses());
    if (guestHydratedRef.current) return;

    const saved = readGuestCheckoutState();
    let addresses = (saved.addresses || [])
      .filter((address) => address && typeof address === 'object')
      .map((address) => normalizeGuestAddress(address));
    if (!addresses.length && isCompleteGuestDraft(saved.draft)) {
      addresses = [normalizeGuestAddress(saved.draft)];
    }
    const selected = addresses.find((item) => String(item._id) === String(saved.selectedId))
      || addresses[0]
      || saved.draft
      || null;

    setGuestAddresses(addresses);

    if (selected) {
      setForm((f) => ({
        ...f,
        addressId: selected._id || f.addressId || '',
        name: selected.name || f.name,
        email: selected.email || f.email,
        phone: cleanDigits(selected.phone) || f.phone,
        phoneCode: selected.phoneCode || f.phoneCode || UAE_PHONE_CODE,
        alternatePhone: cleanDigits(selected.alternatePhone) || f.alternatePhone,
        alternatePhoneCode: selected.alternatePhoneCode || f.alternatePhoneCode || UAE_PHONE_CODE,
        street: selected.street || f.street,
        buildingOrVilla: selected.buildingOrVilla || f.buildingOrVilla,
        streetName: selected.streetName || selected.street || f.streetName,
        apartmentOrFloor: selected.apartmentOrFloor || f.apartmentOrFloor,
        city: selected.city || f.city,
        state: selected.state || f.state,
        district: selected.district || f.district,
        country: selected.country || f.country,
        pincode: pickValidPincode(selected.zip, selected.pincode, f.pincode),
      }));

      if (selected.state && isUaeCountry(selected.country || 'United Arab Emirates')) {
        setDistricts(getUaeAreasForEmirate(selected.state));
      } else if (selected.state && isIndiaCountry(selected.country)) {
        const stateObj = indiaStatesAndDistricts.find((entry) => entry.state === selected.state);
        setDistricts(stateObj ? stateObj.districts : []);
      }
    }

    guestHydratedRef.current = true;
  }, [authLoading, user, getToken, dispatch]);

  useEffect(() => {
    if (authLoading || user || !guestHydratedRef.current) return;
    writeGuestCheckoutState({
      addresses: guestAddresses,
      selectedId: form.addressId,
      draft: formToGuestDraft(form),
    });
  }, [
    authLoading,
    user,
    guestAddresses,
    form.addressId,
    form.name,
    form.email,
    form.phone,
    form.phoneCode,
    form.alternatePhone,
    form.alternatePhoneCode,
    form.street,
    form.buildingOrVilla,
    form.streetName,
    form.apartmentOrFloor,
    form.city,
    form.state,
    form.district,
    form.country,
    form.pincode,
  ]);
  
  // Coupons are optional. A network failure must not take down checkout.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchCoupons = async () => {
      try {
        const storeRes = await fetch('/api/store-info', { signal: controller.signal });
        if (!storeRes.ok) return;
        const storeData = await storeRes.json();
        const storeIdValue = storeData?.store?._id;
        if (!storeIdValue || cancelled) return;
        setStoreId(storeIdValue);

        const token = user ? await getToken() : null;
        if (cancelled) return;
        const res = await fetch(`/api/coupons?storeId=${storeIdValue}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || cancelled) {
          setAvailableCoupons([]);
          return;
        }
        const data = await res.json();
        setAvailableCoupons(Array.isArray(data?.coupons) ? data.coupons : []);
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return;
        setAvailableCoupons([]);
      }
    };

    const timer = setTimeout(fetchCoupons, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [user, getToken]);

  // Auto-select first address
  useEffect(() => {
    if (user && addressList.length > 0 && !form.addressId) {
      const firstAddr = addressList[0];
      
      setForm((f) => {
        // Try to get phone from: address -> user profile -> keep existing
        const addressPhone = cleanDigits(firstAddr.phone);
        const userPhone = cleanDigits(user?.phoneNumber || user?.phone);
        const finalPhone = addressPhone || userPhone || f.phone || '';
        const finalPincode = pickValidPincode(firstAddr.zip, firstAddr.pincode, f.pincode);
        
        console.log('Loading address - Phone sources:', {
          addressPhone,
          userPhone,
          finalPhone,
          currentFormPhone: f.phone,
          addressHasPhone: !!firstAddr.phone,
          userHasPhone: !!(user?.phoneNumber || user?.phone)
        });
        
        return { 
          ...f, 
          addressId: firstAddr._id,
          name: firstAddr.name || f.name,
          email: firstAddr.email || f.email,
          phone: finalPhone,
          phoneCode: firstAddr.phoneCode || UAE_PHONE_CODE,
          alternatePhone: cleanDigits(firstAddr.alternatePhone),
          alternatePhoneCode: firstAddr.alternatePhoneCode || UAE_PHONE_CODE,
          street: firstAddr.street || f.street,
          buildingOrVilla: firstAddr.buildingOrVilla || f.buildingOrVilla,
          streetName: firstAddr.streetName || firstAddr.street || f.streetName,
          apartmentOrFloor: firstAddr.apartmentOrFloor || f.apartmentOrFloor,
          city: firstAddr.city || f.city,
          state: firstAddr.state || f.state,
          district: firstAddr.district || f.district,
          country: firstAddr.country || f.country,
          pincode: finalPincode,
        };
      });
    }
  }, [user, addressList, form.addressId]);

  const handleDeleteAddress = async (addressId) => {
    const confirmed = window.confirm("Are you sure you want to delete this address? This action cannot be undone.");
    if (!confirmed) return;

    try {
      const token = await getToken();
      const res = await fetch(`/api/address/${addressId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Refresh address list
        dispatch(fetchAddress({ getToken }));
        setFormError("");
      } else {
        const error = await res.json();
        setFormError(error.message || "Failed to delete address");
      }
    } catch (error) {
      setFormError("Failed to delete address. Please try again.");
    }
  };

  // Build cart array
  const cartArray = [];
  const isPurchasableProduct = (product) => isStorefrontProductInStock(product);
  for (const [key, value] of Object.entries(cartItems || {})) {
    const actualProductId = getCartEntryProductId(key, value);
    const product = products?.find((p) => String(p._id) === String(actualProductId));
    const qty = getCartEntryQuantity(value);
    const priceOverride = typeof value === 'number' ? undefined : value?.price;
    const freeGift = typeof value === 'object' ? value?.freeGift : undefined;
    const isFreeGift = isFreeGiftEntry(value);
    if (product && qty > 0) {
      if (isPurchasableProduct(product)) {
        const pricing = resolveCartLinePricing(product, value, qty);
        const unitPrice = isFreeGift ? 0 : pricing.unitPrice;
        cartArray.push({
          ...product,
          quantity: qty,
          _cartPrice: unitPrice,
          _lineTotal: pricing.lineTotal,
          _displayQuantity: pricing.displayQuantity,
          _isBulkBundle: pricing.isBulkBundle,
          _isMatrix: Boolean(pricing.isMatrix),
          _bundleTier: pricing.bundleTier,
          _cartKey: key,
          _productId: actualProductId,
          _isFreeGift: isFreeGift,
          _freeGift: freeGift || null,
          variantOptions: typeof value === 'object' ? value?.variantOptions || null : null,
          _variantOptions: typeof value === 'object' ? value?.variantOptions || null : null,
        });
      }
    }
  }

  const pickupAvailable = false && isCustomerPickupAllowedForLines(
    pickupRule,
    cartArray.map((item) => {
      const matchedVariant = matchVariantByOptions(item.variants || [], item.variantOptions || {});
      return { sku: item.sku, variantSku: matchedVariant?.sku };
    }),
  );
  const isCustomerPickup = pickupAvailable && isCustomerPickupSelected;

  const subtotal = cartArray.reduce((sum, item) => sum + (item._lineTotal ?? ((item._cartPrice ?? item.price ?? 0) * item.quantity)), 0);
  
  // Percent of the visible subtotal. maxDiscount is only a ceiling.
  const couponDiscount = computeCouponDiscount(appliedCoupon, subtotal);
  const isFreeShippingCouponApplied = Boolean(appliedCoupon?.freeShipping);
  const effectiveShipping = isFreeShippingCouponApplied ? 0 : shipping;
  const shippingDiscount = isFreeShippingCouponApplied ? shipping : 0;
  const totalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const codFee = isCustomerPickup
    ? 0
    : getCODFee(shippingSetting, form.payment === 'cod' ? 'COD' : 'CARD');

  const total = totalAfterCoupon + effectiveShipping + codFee;
  const walletRedeemAmount = storefrontWalletEnabled && user && useWalletBalance && walletBalance > 0
    ? Math.min(Math.floor(walletBalance), Math.floor(total))
    : 0;
  const totalAfterWallet = Math.max(0, Number((total - walletRedeemAmount).toFixed(2)));
  const isFullWalletPayment = user && walletRedeemAmount > 0 && totalAfterWallet === 0;
  const cartItemCount = cartArray.reduce(
    (sum, item) => sum + Number(item._displayQuantity ?? item.quantity ?? 0),
    0,
  );
  const hasFreeShippingProduct = cartHasOnlyFreeShippingProducts(cartArray);
  const availableShippingOptions = getAvailableShippingOptions(shippingSetting, form.state);
  const selectedShippingOption =
    getShippingOptionById(shippingSetting, shippingMethod)
    || getDefaultShippingOption(shippingSetting, form.state);
  const summaryDeliveryDays = formatDeliveryDays(selectedShippingOption?.estimatedDays, '2-5');
  const summaryDeliveryLabel = isCustomerPickup
    ? t('checkout.storePickup')
    : (selectedShippingOption?.name || t('checkout.standardDelivery'));
  const totalSavings = couponDiscount + shippingDiscount + walletRedeemAmount;
  const needsPaymentSelection = totalAfterWallet > 0;
  const paymentMethodSummary = (() => {
    if (form.payment === 'cod') return isCustomerPickup ? t('checkout.cashOnPickup') : t('checkout.cashOnDelivery');
    if (form.payment === 'card' || form.payment === 'vaultspay') return t('checkout.creditDebitCard');
    if (form.payment === 'googlepay') return t('checkout.googlePay');
    if (form.payment === 'applepay') return t('checkout.applePay');
    if (form.payment === 'wallet') return t('checkout.walletBalance');
    if (form.payment === 'tamara') return 'Tamara';
    if (form.payment === 'tabby') return 'Tabby';
    return t('checkout.paymentMethods');
  })();
  const maxCODAmount = shippingSetting?.maxCODAmount || 0;
  const hasPersonalizedOfferItem = Object.values(cartItems || {}).some(
    (entry) => typeof entry === 'object' && !!entry?.offerToken
  );
  const buildCheckoutItems = () => cartArray.map((item) => {
    const cartKey = item._cartKey || item._id;
    const value = cartItems?.[cartKey];
    const qty = getCartEntryQuantity(value) || item.quantity || 0;
    const variantOptions = typeof value === 'object' ? value?.variantOptions : undefined;
    const offerToken = typeof value === 'object' ? value?.offerToken : undefined;
    const freeGift = typeof value === 'object' ? value?.freeGift : undefined;
    const fbtMainProductId = typeof value === 'object' ? value?.fbtBundle?.mainProductId : undefined;
    const bundleTier = item._bundleTier ?? variantOptions?.bundleQty;
    return {
      id: item._productId || item._id,
      quantity: qty,
      ...(variantOptions || bundleTier ? {
        variantOptions: {
          ...(variantOptions || {}),
          ...(bundleTier ? { bundleQty: Number(bundleTier) } : {}),
        },
      } : {}),
      ...(offerToken ? { offerToken } : {}),
      ...(freeGift ? { freeGift } : {}),
      ...(fbtMainProductId ? { fbtMainProductId: String(fbtMainProductId) } : {}),
    };
  }).filter((item) => item.quantity > 0 && item.id);
  const applyWalletToPayload = (payload) => {
    if (user && walletRedeemAmount > 0) {
      payload.coinsToRedeem = walletRedeemAmount;
    }
    if (isCustomerPickup) {
      const location = customerPickupLocationFields();
      payload.shippingFee = 0;
      payload.shippingMethod = 'customer_pickup';
      payload.fulfillmentMode = 'customer_pickup';
      if (payload.guestInfo) {
        payload.guestInfo = { ...payload.guestInfo, ...location };
      }
      if (payload.addressData) {
        payload.addressData = { ...payload.addressData, ...location };
      } else if (user && !payload.addressId) {
        payload.addressData = {
          name: form.name || user.displayName || user.name || '',
          email: form.email || user.email || '',
          phone: String(form.phone || user.phoneNumber || user.phone || '').replace(/\D/g, ''),
          phoneCode: form.phoneCode || '+971',
          street: location.street,
          city: location.city,
          state: location.state,
          district: location.district,
          country: location.country,
          zip: '',
        };
      }
    }
    return payload;
  };
  const isCODDisabledForOrder =
    hasPersonalizedOfferItem ||
    !isPaymentMethodEnabled(shippingSetting, 'cod') ||
    (maxCODAmount > 0 && totalAfterWallet > maxCODAmount);
  const isCardEnabled = isPaymentMethodEnabled(shippingSetting, 'card');
  const isVaultsPayEnabled = isPaymentMethodEnabled(shippingSetting, 'vaultspay');
  const isTabbyEnabled = isPaymentMethodEnabled(shippingSetting, 'tabby');
  const isTamaraEnabled = isPaymentMethodEnabled(shippingSetting, 'tamara');
  const isCardOverLimit = isPaymentMethodOverLimit(shippingSetting, 'card', totalAfterWallet);
  const isVaultsPayOverLimit = isPaymentMethodOverLimit(shippingSetting, 'vaultspay', totalAfterWallet);
  const isTabbyOverLimit = isPaymentMethodOverLimit(shippingSetting, 'tabby', totalAfterWallet);
  const isTamaraOverLimit = isPaymentMethodOverLimit(shippingSetting, 'tamara', totalAfterWallet);
  const showCardPayment = isCardEnabled && !isCardOverLimit;
  const showVaultsPayPayment = isVaultsPayEnabled && !isVaultsPayOverLimit;
  const showVaultsPayGooglePay = showVaultsPayPayment && isPaymentMethodEnabled(shippingSetting, 'googlepay');
  const showVaultsPayApplePay = showVaultsPayPayment && isPaymentMethodEnabled(shippingSetting, 'applepay');
  const showTabbyPayment = isTabbyEnabled && !isTabbyOverLimit;
  const showTamaraPayment = isTamaraEnabled && !isTamaraOverLimit;
  const showCodPayment = !hasPersonalizedOfferItem && isPaymentMethodEnabled(shippingSetting, 'cod');
  const paymentChoiceClass = 'flex cursor-pointer items-center gap-3 rounded-xl border border-[#E2E7E8] bg-white px-3 py-2.5 transition-colors has-[:checked]:border-[#05090D] has-[:checked]:bg-[#F8FEE6]';
  const paymentRadioClass = 'h-5 w-5 shrink-0 accent-[#05090D]';
  const isPaymentMissing = needsPaymentSelection && !form.payment;
  const isPlaceOrderDisabled = placingOrder || payingNow;
  const isCheckoutSubmitDisabled = isPlaceOrderDisabled;
  const placeOrderButtonActiveColors = 'bg-[#C8F404] text-[#05090D] hover:bg-[#ADD300]';
  const placeOrderButtonColors = isPlaceOrderDisabled
    ? 'cursor-not-allowed bg-[#E2E7E8] text-[#5E6870]'
    : placeOrderButtonActiveColors;
  const mobilePlaceOrderButtonColors = placeOrderButtonColors;
  const selectedAddressForView = form.addressId ? checkoutAddressList.find((a) => a._id === form.addressId) : null;
  const isLoggedInAreaMissing = Boolean(
    user
    && selectedAddressForView
    && isUaeCountry(selectedAddressForView.country || form.country)
    && String(selectedAddressForView.state || '').trim()
    && !String(selectedAddressForView.district || '').trim(),
  );
  const isLoggedInDistrictMissing = Boolean(
    user
    && selectedAddressForView
    && isIndiaCountry(selectedAddressForView.country || form.country)
    && String(selectedAddressForView.state || '').trim()
    && !String(selectedAddressForView.district || '').trim(),
  );
  const renderPayByMethodLabel = (methodKey) => (
    <span className="font-normal">
      {t('checkout.payBy')}{' '}
      <span className="font-bold">{t(`checkout.method${methodKey}`)}</span>
    </span>
  );
  const renderPlaceOrderButtonContent = () => {
    if (form.payment === 'tamara') return renderPayByMethodLabel('Tamara');
    if (form.payment === 'tabby') return renderPayByMethodLabel('Tabby');
    if (form.payment === 'cod') {
      return (
        <span className="font-normal">
          {t('checkout.payBy')}{' '}
          <span className="font-bold">{isCustomerPickup ? t('checkout.cashOnPickup') : t('checkout.methodCod')}</span>
        </span>
      );
    }
    if (form.payment === 'card' || form.payment === 'vaultspay') return renderPayByMethodLabel('Card');
    if (form.payment === 'googlepay') return renderPayByMethodLabel('GooglePay');
    if (form.payment === 'applepay') return renderPayByMethodLabel('ApplePay');
    if (form.payment === 'wallet') return renderPayByMethodLabel('Wallet');
    return needsPaymentSelection ? t('checkout.selectPayment') : t('checkout.placeOrder');
  };
  const shouldShowPhoneRequired =
    !!user &&
    addressList.length > 0 &&
    !!form.addressId &&
    !hasValidPhone(form.phone) &&
    !hasValidPhone(selectedAddressForView?.phone) &&
    !hasValidPhone(user?.phoneNumber || user?.phone);
  const isPincodeError = /pincode/i.test(String(formError || ''));
  const isPaymentStartError = /card payment|could not open card|temporarily unavailable/i.test(String(formError || ''));
  const isRateLimitError = /too many requests|rate limit|slow down/i.test(String(formError || ''));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    ensureGa4CategoryCache();
    if (!checkoutProductsLoaded) return;
    if (beginCheckoutTrackedRef.current) return;

    const gtmItems = cartLinesToGtmItems(cartArray);
    if (gtmItems.length === 0) return;

    beginCheckoutTrackedRef.current = true;

    const itemsValue = gtmItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const value = Number(totalAfterWallet > 0 ? totalAfterWallet : (subtotal + effectiveShipping) || itemsValue || 0);
    const currencyCode = market.currency || STORE_CURRENCY || 'AED';

    trackBeginCheckoutDual({
      value,
      currency: currencyCode,
      gtmItems,
      metaItems: cartLinesToMetaItems(cartArray),
      pageKey: '/checkout',
      coupon: String(appliedCoupon?.code || '').trim(),
    });

    trackCustomerEvent({
        eventType: 'checkout_start',
        firebaseUid: user?.uid || null,
        userId: user?.uid || null,
        pageType: 'checkout',
        pagePath: '/checkout',
        value,
        currency: currencyCode,
        metadata: {
          itemCount: gtmItems.length,
          cartValue: value,
        },
      });
  }, [
    checkoutProductsLoaded,
    cartArray,
    totalAfterWallet,
    subtotal,
    effectiveShipping,
    market.currency,
  ]);

  useEffect(() => {
    if (hasPersonalizedOfferItem && form.payment === 'cod') {
      setForm((f) => ({ ...f, payment: 'card' }));
    }
  }, [hasPersonalizedOfferItem, form.payment]);

  useEffect(() => {
    if (!user || walletBalance <= 0) return;
    if (isFullWalletPayment) {
      if (form.payment !== 'wallet') {
        setForm((f) => ({ ...f, payment: 'wallet' }));
      }
      return;
    }
    if (form.payment === 'wallet') {
      setForm((f) => ({ ...f, payment: 'card' }));
    }
  }, [isFullWalletPayment, user, walletBalance, form.payment]);

  useEffect(() => {
    if (!form.payment || form.payment === 'wallet') return;
    const paymentUnavailable =
      (form.payment === 'card' && (!isCardEnabled || isCardOverLimit))
      || (form.payment === 'vaultspay' && !showVaultsPayPayment)
      || (form.payment === 'googlepay' && !showVaultsPayGooglePay)
      || (form.payment === 'applepay' && !showVaultsPayApplePay)
      || (form.payment === 'tabby' && (!isTabbyEnabled || isTabbyOverLimit))
      || (form.payment === 'tamara' && (!isTamaraEnabled || isTamaraOverLimit))
      || (form.payment === 'cod' && isCODDisabledForOrder);
    if (paymentUnavailable) {
      setForm((f) => ({ ...f, payment: '' }));
    }
  }, [
    form.payment,
    isCardEnabled,
    isVaultsPayEnabled,
    showVaultsPayPayment,
    showVaultsPayGooglePay,
    showVaultsPayApplePay,
    isTabbyEnabled,
    isTamaraEnabled,
    isCardOverLimit,
    isVaultsPayOverLimit,
    isTabbyOverLimit,
    isTamaraOverLimit,
    isCODDisabledForOrder,
  ]);

  useEffect(() => {
    if (appliedCoupon && !isCouponAllowedPayment(form.payment)) {
      setAppliedCoupon(null);
      setCoupon('');
      setCouponError('Coupons are available for Card and Cash on Delivery only.');
    }
  }, [appliedCoupon, form.payment]);

  // Meta Pixel: AddPaymentInfo once per payment method (not per total change).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!form.payment) return;
    if (cartArray.length === 0) return;

    const gtmItems = cartLinesToGtmItems(cartArray);
    const metaItems = cartLinesToMetaItems(cartArray);
    const contentIds = metaItems.map((item) => String(item.id || '').trim()).filter(Boolean);
    if (contentIds.length === 0) return;

    const itemsValue = metaItems.reduce(
      (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)),
      0,
    );
    const amount = Number(totalAfterWallet > 0 ? totalAfterWallet : itemsValue);
    if (!(amount > 0)) return;

    const paymentMethod = String(form.payment).toLowerCase();
    const eventKey = `meta_add_payment_info_${paymentMethod}`;
    // Claim before fbq — totalAfterWallet / cart remounts must not send a 2nd event.
    if (sessionStorage.getItem(eventKey)) return;
    sessionStorage.setItem(eventKey, '1');

    pushGtmEcommerceEvent(GTM_EVENTS.ADD_PAYMENT_INFO, {
      currency: GA4_CURRENCY,
      value: Number(amount.toFixed(2)),
      payment_type: toGa4PaymentType(form.payment),
      coupon: String(appliedCoupon?.code || '').trim(),
      items: gtmItems,
    }, gtmDedupeKey(GTM_EVENTS.ADD_PAYMENT_INFO, paymentMethod));

    trackMetaEvent('AddPaymentInfo', {
      value: Number(amount.toFixed(2)),
      currency: 'AED',
      content_type: 'product',
      content_ids: contentIds,
      contents: metaItems.map((item) => ({
        id: item.id,
        quantity: Number(item.quantity || 1),
        item_price: Number(item.price || 0),
      })),
      num_items: metaItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      payment_method: String(form.payment).toUpperCase(),
    }, {
      eventID: `api:${paymentMethod}`,
      dedupeKey: `meta:AddPaymentInfo:${eventKey}`,
    });
  }, [form.payment, cartArray, totalAfterWallet, appliedCoupon]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!checkoutProductsLoaded) return;
    const gtmItems = cartLinesToGtmItems(cartArray);
    if (!gtmItems.length) return;
    const value = Number(totalAfterWallet > 0 ? totalAfterWallet : (subtotal + effectiveShipping) || 0);
    pushGtmEcommerceEvent(GTM_EVENTS.ADD_SHIPPING_INFO, {
      currency: GA4_CURRENCY,
      value,
      shipping_tier: String(shippingMethod || form.state || 'standard'),
      coupon: String(appliedCoupon?.code || '').trim(),
      items: gtmItems,
    }, gtmDedupeKey(GTM_EVENTS.ADD_SHIPPING_INFO, '/checkout'));
  }, [
    checkoutProductsLoaded,
    form.state,
    shippingMethod,
    cartArray,
    totalAfterWallet,
    subtotal,
    effectiveShipping,
    market.currency,
    appliedCoupon,
  ]);

  // Load the payment and shipping settings for the active storefront.
  useEffect(() => {
    if (!storeId) return undefined;
    let cancelled = false;

    async function loadShipping() {
      const setting = await fetchShippingSettings(storeId);
      if (!cancelled) {
        setShippingSetting(setting);
        console.log('Shipping settings loaded:', setting);
      }
    }
    loadShipping();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;
    async function loadCheckoutAlert() {
      try {
        const { data } = await axios.get('/api/checkout-alert');
        if (!cancelled) {
          setCheckoutAlert(data?.checkoutAlert || null);
        }
      } catch {
        if (!cancelled) setCheckoutAlert(null);
      }
    }
    loadCheckoutAlert();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCheckoutAlert = getActiveCheckoutAlert(checkoutAlert, {
    language: isArabic ? 'ar' : 'en',
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/customer-pickup')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setPickupRule({
          enabled: data?.enabled !== false,
          scope: ['all', 'include', 'exclude'].includes(data?.scope) ? data.scope : 'all',
          skus: Array.isArray(data?.skus) ? data.skus : [],
        });
      })
      .catch(() => {
        if (!cancelled) setPickupRule({ enabled: true, scope: 'all', skus: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pickupAvailable && fulfillmentChoice === 'pickup') {
      setFulfillmentChoice('delivery');
    }
  }, [pickupAvailable, fulfillmentChoice]);

  useEffect(() => {
    if (!shippingSetting) return;
    const available = getAvailableShippingOptions(shippingSetting, form.state);
    if (!available.length) return;

    const stillValid = available.some((option) => option.id === shippingMethod);
    if (!stillValid) {
      const defaultOption = available.find((option) => option.isDefault) || available[0];
      if (defaultOption) setShippingMethod(defaultOption.id);
    } else if (!shippingMethod) {
      const defaultOption = available.find((option) => option.isDefault) || available[0];
      if (defaultOption) setShippingMethod(defaultOption.id);
    }
  }, [shippingSetting, form.state, shippingMethod]);

  useEffect(() => {
    if (isCustomerPickup) {
      setShipping(0);
      return;
    }
    if (shippingSetting && cartArray.length > 0) {
      const option =
        getShippingOptionById(shippingSetting, shippingMethod)
        || getDefaultShippingOption(shippingSetting, form.state);
      const calculatedShipping = calculateShipping({
        cartItems: cartArray,
        shippingSetting,
        shippingOption: option,
        paymentMethod: form.payment === 'cod' ? 'COD' : 'CARD',
        shippingState: form.state,
        includeCODFee: false,
      });
      setShipping(calculatedShipping);
    } else {
      setShipping(0);
    }
  }, [shippingSetting, cartArray, form.payment, form.state, shippingMethod, isCustomerPickup]);

  // Empty cart must never show delivery/payment. Send the shopper to /cart.
  useEffect(() => {
    if (
      authLoading
      || !checkoutProductsLoaded
      || placingOrder
      || showPrepaidModal
      || navigatingToSuccess
      || upsellOrderId
      || leavingCheckout
    ) {
      return undefined;
    }
    if (cartArray.length === 0) {
      router.replace('/cart');
    }
  }, [
    authLoading,
    checkoutProductsLoaded,
    cartArray.length,
    router,
    placingOrder,
    showPrepaidModal,
    navigatingToSuccess,
    upsellOrderId,
    leavingCheckout,
  ]);

  const checkoutSelectClass =
    'w-full rounded-lg border border-[#E2E7E8] bg-white px-3 py-2 text-left text-sm text-[#05090D] outline-none transition focus:border-[#05090D] focus:ring-2 focus:ring-[#EFFCC4]';

  const guestFieldClass =
    'w-full rounded-lg border border-[#E2E7E8] bg-white px-3 py-2 text-sm text-[#05090D] outline-none transition placeholder:text-[#879198] focus:border-[#05090D] focus:ring-2 focus:ring-[#EFFCC4]';

  const guestLabelClass = 'mb-1 block text-xs font-semibold text-[#05090D]';

  const guestSectionClass =
    'grid w-full min-w-0 gap-3';

  const fieldHasError = (fieldId) => invalidFieldIds.has(fieldId);
  const fieldErrorClass = (fieldId) =>
    fieldHasError(fieldId) ? 'border-red-400 ring-4 ring-red-100 focus:border-red-400 focus:ring-red-100' : '';
  const getStreetRequiredMessage = () => {
    if (String(form.district || '').trim() && !hasCompleteAddressStreetLine(form)) {
      return t('checkout.streetRequiredWithArea');
    }
    return t('checkout.street');
  };
  const getFieldRequiredMessage = (fieldId) => {
    const messageMap = {
      'guest-area': t('checkout.selectAreaRequired'),
      'guest-district': t('checkout.selectDistrict'),
      'guest-state': t('checkout.selectEmirate'),
      'guest-country': t('checkout.country'),
      'guest-name': t('checkout.fullName'),
      'guest-email': t('checkout.emailAddress'),
      'guest-phone': t('checkout.phoneNumber'),
      'guest-building': t('checkout.buildingVilla'),
      'guest-street': getStreetRequiredMessage(),
      'guest-pincode': 'Pincode',
      'checkout-payment': t('checkout.selectPaymentRequired'),
      'checkout-address': t('checkout.fillAddress'),
      'checkout-address-area': t('checkout.selectAreaRequired'),
      'checkout-address-district': t('checkout.selectDistrict'),
    };
    return messageMap[fieldId] || (isArabic ? 'هذا الحقل مطلوب' : 'This field is required');
  };
  const fieldRequiredHint = (fieldId) =>
    fieldHasError(fieldId) ? (
      <p className="mt-1 text-xs font-medium text-red-600">
        {getFieldRequiredMessage(fieldId)}
      </p>
    ) : null;

  const handleValidationIssueClick = (fieldId) => {
    setValidationAlertOpen(false);
    scrollToCheckoutField(fieldId);
  };

  const getValidationLabel = (issue) => {
    const labelMap = {
      'Full name': t('checkout.fullName'),
      'Email address': t('checkout.emailAddress'),
      'Valid email address': t('checkout.emailAddress'),
      'Phone number': t('checkout.phoneNumber'),
      'Street address': t('checkout.street'),
      'Building / villa number': t('checkout.buildingVilla'),
      'Street name': t('checkout.streetName'),
      'Emirate': t('checkout.selectEmirate'),
      'State': t('checkout.selectState'),
      'State / Emirate': t('checkout.emirateState'),
      'Country': t('checkout.country'),
      'Area': t('checkout.selectArea'),
      'District': t('checkout.selectDistrict'),
      'Pincode': 'Pincode',
      'Payment method': t('checkout.paymentMethods'),
      'Delivery address': t('checkout.deliveryAddress'),
    };
    return labelMap[issue.label] || issue.label;
  };

  const resolveCheckoutValidationContext = () => {
    const cleanedPhone = cleanDigits(form.phone);
    const selectedAddr = (form.addressId && checkoutAddressList.find((a) => a._id === form.addressId)) || null;
    const resolvedPhone =
      cleanedPhone || cleanDigits(selectedAddr?.phone) || cleanDigits(user?.phoneNumber || user?.phone);
    // hamody.com delivers in UAE only — country is fixed.
    const resolvedCountry = 'United Arab Emirates';
    const resolvedPincode = '';
    return { resolvedPhone, resolvedCountry, resolvedPincode };
  };

  const showCheckoutValidationFeedback = (rawIssues) => {
    const issues = rawIssues.map((issue) => ({ ...issue, label: getValidationLabel(issue) }));
    setValidationIssues(issues);
    setInvalidFieldIds(new Set(rawIssues.map((issue) => issue.id)));
    setValidationAlertOpen(true);
    scrollToCheckoutField(issues[0]?.id);

    const firstIssue = rawIssues[0];
    const streetIssue = rawIssues.find(
      (issue) => issue.id === 'guest-street' || (issue.id === 'checkout-address' && issue.label === 'Street address'),
    );
    const message = streetIssue
      && firstIssue?.id === streetIssue.id
      && String(form.district || '').trim()
      ? t('checkout.streetRequiredWithArea')
      : issues.length > 1
        ? t('checkout.pleaseCompleteFields').replace(
          '{fields}',
          issues.map((issue) => issue.label).join(', '),
        )
        : t('checkout.pleaseCompleteField').replace('{field}', issues[0]?.label || '');

    setFormError(message);
    setSidebarPayError(message);
    toast.error(message, {
      duration: 6000,
      position: 'top-center',
      style: { zIndex: 99999, fontWeight: 600 },
    });
  };

  const runCheckoutFormValidation = (resolvedPhone, resolvedCountry, resolvedPincode) => {
    const rawIssues = collectCheckoutValidationIssues({
      user,
      form,
      addressList,
      resolvedPhone,
      resolvedCountry,
      resolvedPincode,
      needsPaymentSelection,
      customerPickup: isCustomerPickup,
    });

    if (!rawIssues.length) {
      setInvalidFieldIds(new Set());
      setSidebarPayError('');
      return true;
    }

    showCheckoutValidationFeedback(rawIssues);
    return false;
  };

  const handlePlaceOrderClick = (event) => {
    if (placingOrder || payingNow) {
      event.preventDefault();
      return;
    }

    const { resolvedPhone, resolvedCountry, resolvedPincode } = resolveCheckoutValidationContext();
    const rawIssues = collectCheckoutValidationIssues({
      user,
      form,
      addressList,
      resolvedPhone,
      resolvedCountry,
      resolvedPincode,
      needsPaymentSelection,
      customerPickup: isCustomerPickup,
    });

    if (rawIssues.length > 0) {
      event.preventDefault();
      showCheckoutValidationFeedback(rawIssues);
    }
  };

  const handleStateSelect = (value) => {
    setInvalidFieldIds(new Set());
    setValidationAlertOpen(false);
    setSidebarPayError('');
    if (isUaeCountry(form.country)) {
      setDistricts(getUaeAreasForEmirate(value));
    } else {
      const stateObj = indiaStatesAndDistricts.find((s) => s.state === value);
      setDistricts(stateObj ? stateObj.districts : []);
    }
    setForm((f) => ({ ...f, state: value, district: '' }));
  };

  const handleGuestCountryChange = (value) => {
    setForm((f) => ({
      ...f,
      country: value,
      state: '',
      district: '',
      phoneCode: getGuestCountryCode(value),
    }));
    setDistricts([]);
  };

  const handleChange = (e) => {
    setInvalidFieldIds(new Set());
    setValidationAlertOpen(false);
    setSidebarPayError('');
    const { name, value } = e.target;
    if (name === 'state') {
      handleStateSelect(value);
    } else if (name === 'country') {
      setForm(f => ({ ...f, country: value, state: '', district: '', alternatePhoneCode: f.alternatePhoneCode || f.phoneCode }));
      setDistricts([]);
    } else if (name === 'payment') {
      setForm(f => ({ ...f, [name]: value }));
    } else if (['buildingOrVilla', 'streetName', 'apartmentOrFloor'].includes(name)) {
      setForm((f) => {
        const next = { ...f, [name]: value };
        return { ...next, street: composeAddressStreetLine(next) };
      });
    } else if (name === 'pincode') {
      if (isIndiaCountry(form.country)) {
        const numeric = String(value || '').replace(/\D/g, '').slice(0, 10);
        setForm(f => ({ ...f, pincode: numeric }));
      } else {
        const normalized = String(value || '').replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 20);
        setForm(f => ({ ...f, pincode: normalized }));
      }
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  // Stripe Payment Handler — creates order with paymentMethod STRIPE, then redirects to Stripe Checkout
  const fetchCheckoutOrders = async (fetchOptions, { timeoutMs = 45000 } = {}) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      return await fetch('/api/orders', {
        ...fetchOptions,
        ...(controller ? { signal: controller.signal } : {}),
      });
    } catch (fetchErr) {
      if (fetchErr?.name === 'AbortError') {
        throw new Error('Order is taking too long. Please try again.');
      }
      throw fetchErr;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const renderPlacingOrderLabel = () => {
    if (form.payment === 'card' || isHostedCardWallet(form.payment) || form.payment === 'tamara' || form.payment === 'tabby') {
      return 'Redirecting to payment...';
    }
    return t('checkout.placingOrder');
  };

  const handleStripePayment = async (paymentPayload) => {
    try {
      const trackedPayload = withOrderTrackingFields(paymentPayload);
      let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackedPayload),
      };

      if (user && getToken) {
        const token = await getToken();
        fetchOptions.headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetchCheckoutOrders(fetchOptions);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || errData.error || 'Failed to initiate Stripe payment';
        setFormError(msg);
        setPlacingOrder(false);
        return false;
      }

      const data = await res.json();

      const sessionUrl = data?.session?.url;
      if (sessionUrl) {
        if (data?.orderId) rememberPendingCheckoutOrder(data.orderId);
        // Redirect to Stripe-hosted checkout page
        window.location.href = sessionUrl;
        return true;
      }

      setFormError('Could not create Stripe checkout session. Please try again.');
      setPlacingOrder(false);
      return false;
    } catch (error) {
      setFormError(error.message || 'Stripe payment failed. Please try again.');
      setPlacingOrder(false);
      return false;
    }
  };

  const handleVaultsPayPayment = async (paymentPayload) => {
    try {
      const trackedPayload = withOrderTrackingFields(paymentPayload);
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackedPayload),
      };

      if (user && getToken) {
        const token = await getToken();
        fetchOptions.headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetchCheckoutOrders(fetchOptions);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.message || errData.error || 'Failed to start card payment');
        setPlacingOrder(false);
        return false;
      }

      const data = await res.json();
      const checkoutUrl = data?.checkout_url;
      if (checkoutUrl) {
        if (data?.orderId) rememberPendingCheckoutOrder(data.orderId);
        window.location.href = checkoutUrl;
        return true;
      }

      setFormError('Could not open card payment. Please try again.');
      setPlacingOrder(false);
      return false;
    } catch (error) {
      setFormError(error.message || 'Card payment failed. Please try again.');
      setPlacingOrder(false);
      return false;
    }
  };

  // Tamara BNPL Handler — creates order with paymentMethod TAMARA, then redirects to Tamara checkout
  const handleTamaraPayment = async (paymentPayload) => {
    try {
      const trackedPayload = withOrderTrackingFields(paymentPayload);
      let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackedPayload),
      };

      if (user && getToken) {
        const token = await getToken();
        fetchOptions.headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetchCheckoutOrders(fetchOptions);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || errData.error || 'Failed to initiate Tamara payment';
        setFormError(msg);
        setPlacingOrder(false);
        return false;
      }

      const data = await res.json();
      const checkoutUrl = data?.checkout_url;
      if (checkoutUrl) {
        if (data?.orderId) rememberPendingCheckoutOrder(data.orderId);
        window.location.href = checkoutUrl;
        return true;
      }

      setFormError('Could not create Tamara checkout session. Please try again.');
      setPlacingOrder(false);
      return false;
    } catch (error) {
      setFormError(error.message || 'Tamara payment failed. Please try again.');
      setPlacingOrder(false);
      return false;
    }
  };

  // Tabby BNPL Handler — creates order with paymentMethod TABBY, then redirects to Tabby checkout
  const handleTabbyPayment = async (paymentPayload) => {
    try {
      const trackedPayload = withOrderTrackingFields(paymentPayload);
      let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackedPayload),
      };

      if (user && getToken) {
        const token = await getToken();
        fetchOptions.headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetchCheckoutOrders(fetchOptions);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || errData.error || 'Failed to initiate Tabby payment';
        setFormError(msg);
        setPlacingOrder(false);
        return false;
      }

      const data = await res.json();
      const checkoutUrl = data?.checkout_url;
      if (checkoutUrl) {
        if (data?.orderId) rememberPendingCheckoutOrder(data.orderId);
        window.location.href = checkoutUrl;
        return true;
      }

      setFormError('Could not create Tabby checkout session. Please try again.');
      setPlacingOrder(false);
      return false;
    } catch (error) {
      setFormError(error.message || 'Tabby payment failed. Please try again.');
      setPlacingOrder(false);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.TabbyCard) {
      setTabbyCardLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (form.payment !== 'tabby') return;
    if (!tabbyCardLoaded) return;
    if (!window.TabbyCard) return;
    if (!tabbyPublicKey || !tabbyMerchantCode) return;

    const price = Number(totalAfterWallet || 0).toFixed(2);
    if (Number(price) <= 0) return;

    try {
      new window.TabbyCard({
        selector: '#tabbyCard',
        currency: 'AED',
        price,
        lang: 'en',
        shouldInheritBg: false,
        publicKey: tabbyPublicKey,
        merchantCode: tabbyMerchantCode,
      });
    } catch (err) {
      console.error('TabbyCard init error:', err);
    }
  }, [form.payment, totalAfterWallet, tabbyPublicKey, tabbyMerchantCode, tabbyCardLoaded]);

  const handleSubmit = async (e, paymentOverride = null) => {
    e?.preventDefault?.();
    setFormError("");
    setSidebarPayError("");

    const payment = paymentOverride || form.payment;
    if (paymentOverride && paymentOverride !== form.payment) {
      setForm((f) => ({ ...f, payment: paymentOverride }));
    }

    const effectivePayment = isFullWalletPayment ? 'wallet' : payment;
    const paymentMissing = needsPaymentSelection && !effectivePayment;
    const invalidCodSelection = effectivePayment === 'cod' && isCODDisabledForOrder;
    const invalidOnlinePaymentSelection =
      effectivePayment !== 'wallet' && (
        (effectivePayment === 'card' && (!isCardEnabled || isCardOverLimit))
        || (effectivePayment === 'vaultspay' && !showVaultsPayPayment)
        || (effectivePayment === 'googlepay' && !showVaultsPayGooglePay)
        || (effectivePayment === 'applepay' && !showVaultsPayApplePay)
        || (effectivePayment === 'tabby' && (!isTabbyEnabled || isTabbyOverLimit))
        || (effectivePayment === 'tamara' && (!isTamaraEnabled || isTamaraOverLimit))
      );

    if (paymentMissing) {
      setInvalidFieldIds(new Set(['checkout-payment']));
      toast.error(t('checkout.selectPaymentRequired'), { id: 'checkout-validation' });
      scrollToCheckoutField('checkout-payment');
      return;
    }

    if (invalidCodSelection || invalidOnlinePaymentSelection) {
      const limitMessage = getPaymentMethodLimitError(
        shippingSetting,
        effectivePayment,
        totalAfterWallet,
        { hasPersonalizedOfferItem },
      );
      const paymentMessage = limitMessage
        || (hasPersonalizedOfferItem
          ? 'COD is not available for personalized offer products. Please use online payment.'
          : !isPaymentMethodEnabled(shippingSetting, 'cod')
            ? 'Cash on Delivery is not available.'
            : `COD is not available for orders above ${formatMoneyPlain(maxCODAmount)}.`);
      setFormError(paymentMessage);
      toast.error(paymentMessage, { id: 'checkout-validation' });
      return;
    }

    // Validate required fields
    if (cartArray.length === 0) {
      setFormError("All items in your cart are currently out of stock. Please remove them to continue.");
      return;
    }

    // Clean and validate phone number
    const cleanedPhone = cleanDigits(form.phone);
    const cleanedAlternatePhone = cleanDigits(form.alternatePhone);
    const selectedAddr = (form.addressId && checkoutAddressList.find(a => a._id === form.addressId)) || null;
    const fallbackPhone = cleanDigits(selectedAddr?.phone) || cleanDigits(user?.phoneNumber || user?.phone);
    const resolvedPhone = cleanedPhone || fallbackPhone;
    // hamody.com delivers in UAE only — country is fixed.
    const resolvedCountry = 'United Arab Emirates';
    const isIndiaCheckout = false;
    let resolvedPincode = sanitizePincode(form.pincode);

    if (!cleanedPhone && resolvedPhone) {
      setForm((f) => ({ ...f, phone: resolvedPhone }));
    }

    if (form.country !== resolvedCountry) {
      setForm((f) => ({ ...f, country: resolvedCountry }));
    }

    if (isIndiaCheckout) {
      if ((!resolvedPincode || isZeroOnlyPincode(resolvedPincode)) && selectedAddr) {
        const fallbackPincode = pickValidPincode(selectedAddr?.zip, selectedAddr?.pincode);

        if (fallbackPincode) {
          resolvedPincode = fallbackPincode;
          setForm((f) => ({ ...f, pincode: fallbackPincode }));
        }
      }
    } else {
      resolvedPincode = '';
    }

    if (!runCheckoutFormValidation(resolvedPhone, resolvedCountry, resolvedPincode)) {
      return;
    }

    console.log('Checkout validation - Phone details:', {
      originalPhone: form.phone,
      cleanedPhone: resolvedPhone,
      cleanedLength: resolvedPhone.length,
      isValid: isValidPhoneNumber(resolvedPhone, form.phoneCode || '+971')
    });

    const phoneCodeForValidation = form.phoneCode || '+971';
    const altCodeForValidation = form.alternatePhoneCode || phoneCodeForValidation;

    if (form.alternatePhone) {
      const alternatePhoneError = getPhoneInputError(cleanedAlternatePhone, altCodeForValidation);
      if (alternatePhoneError) {
        setFormError(alternatePhoneError);
        return;
      }
    }
    
    // Validate main phone number
    const mainPhoneError = getPhoneInputError(resolvedPhone, phoneCodeForValidation);
    if (mainPhoneError) {
      console.warn('Phone validation failed:', {
        hasValue: !!resolvedPhone,
        length: resolvedPhone.length
      });
      setFormError(mainPhoneError);
      return;
    }

    setPlacingOrder(true);
    
    if (isHostedCardWallet(effectivePayment)) {
      try {
        const itemsForVaultsPay = buildCheckoutItems();
        const payload = {
          items: itemsForVaultsPay,
          paymentMethod: 'VAULTSPAY',
          vaultsPayMethod: effectivePayment === 'googlepay' ? 'googlepay' : effectivePayment === 'applepay' ? 'applepay' : 'card',
          shippingFee: shipping,
          shippingMethod: shippingMethod,
          paymentStatus: 'pending',
        };

        if (appliedCoupon && (couponDiscount > 0 || isFreeShippingCouponApplied)) {
          payload.coupon = {
            code: appliedCoupon.code,
            discountAmount: couponDiscount,
            freeShipping: isFreeShippingCouponApplied,
            shippingDiscount,
            title: appliedCoupon.title,
            description: appliedCoupon.description,
          };
        }

        if (user) {
          const addressId = form.addressId || (addressList[0] && addressList[0]._id);
          if (addressId) payload.addressId = addressId;
        } else {
          if (!form.name || !form.email || !resolvedPhone || (!isCustomerPickup && (!hasCompleteAddressStreetLine(form) || !resolveGuestCity(form) || !form.state || !resolvedCountry))) {
            setFormError('Please fill all required shipping details.');
            setPlacingOrder(false);
            return;
          }
          payload.isGuest = true;
          payload.guestInfo = {
            name: form.name,
            email: form.email,
            phone: resolvedPhone,
            phoneCode: form.phoneCode,
            alternatePhone: cleanedAlternatePhone || '',
            alternatePhoneCode: form.alternatePhone ? form.alternatePhoneCode || form.phoneCode : '',
            street: form.street,
            city: resolveGuestCity(form),
            state: form.state,
            district: form.district || '',
            country: resolvedCountry,
            pincode: resolvedPincode || '',
          };
        }

        await handleVaultsPayPayment(applyWalletToPayload(payload));
      } catch (error) {
        setFormError(error.message || 'Payment failed');
        setPlacingOrder(false);
      }
      return;
    }

    // For card payment, use Stripe Checkout
    if (effectivePayment === 'card') {
      if (getPhoneInputError(resolvedPhone, phoneCodeForValidation)) {
        setFormError(getPhoneInputError(resolvedPhone, phoneCodeForValidation));
        setPlacingOrder(false);
        return;
      }
      try {
        const itemsFromStateCard = buildCheckoutItems();

        let payload = {
          items: itemsFromStateCard,
          paymentMethod: 'STRIPE',
          shippingFee: shipping,
          shippingMethod: shippingMethod,
          paymentStatus: 'pending',
        };

        if (appliedCoupon && (couponDiscount > 0 || isFreeShippingCouponApplied)) {
          payload.coupon = {
            code: appliedCoupon.code,
            discountAmount: couponDiscount,
            freeShipping: isFreeShippingCouponApplied,
            shippingDiscount,
            title: appliedCoupon.title,
            description: appliedCoupon.description,
          };
        }

        if (user) {
          const addressId = form.addressId || (addressList[0] && addressList[0]._id);
          if (addressId) {
            payload.addressId = addressId;
          }
        } else {
          if (!form.name || !form.email || !resolvedPhone || (!isCustomerPickup && (!hasCompleteAddressStreetLine(form) || !resolveGuestCity(form) || !form.state || !resolvedCountry))) {
            setFormError("Please fill all required shipping details.");
            setPlacingOrder(false);
            return;
          }
          payload.isGuest = true;
          payload.guestInfo = {
            name: form.name,
            email: form.email,
            phone: resolvedPhone,
            phoneCode: form.phoneCode,
            alternatePhone: cleanedAlternatePhone || '',
            alternatePhoneCode: form.alternatePhone ? form.alternatePhoneCode || form.phoneCode : '',
            street: form.street,
            city: resolveGuestCity(form),
            state: form.state,
            district: form.district || '',
            country: resolvedCountry,
            pincode: resolvedPincode || '',
          };
        }

        await handleStripePayment(applyWalletToPayload(payload));
      } catch (error) {
        setFormError(error.message || "Payment failed");
        setPlacingOrder(false);
      }
      return;
    }

    // Tamara BNPL payment
    if (effectivePayment === 'tamara') {
      try {
        const itemsForTamara = buildCheckoutItems();

        let payload = {
          items: itemsForTamara,
          paymentMethod: 'TAMARA',
          shippingFee: shipping,
          shippingMethod: shippingMethod,
          paymentStatus: 'pending',
        };

        if (user) {
          const addressId = form.addressId || (addressList[0] && addressList[0]._id);
          if (addressId) payload.addressId = addressId;
        } else {
          if (!form.name || !form.email || !resolvedPhone || (!isCustomerPickup && (!hasCompleteAddressStreetLine(form) || !resolveGuestCity(form) || !form.state || !resolvedCountry))) {
            setFormError("Please fill all required shipping details.");
            setPlacingOrder(false);
            return;
          }
          payload.isGuest = true;
          payload.guestInfo = {
            name: form.name,
            email: form.email,
            phone: resolvedPhone,
            phoneCode: form.phoneCode,
            alternatePhone: cleanedAlternatePhone || '',
            alternatePhoneCode: form.alternatePhone ? form.alternatePhoneCode || form.phoneCode : '',
            street: form.street,
            city: resolveGuestCity(form),
            state: form.state,
            district: form.district || '',
            country: resolvedCountry,
            pincode: resolvedPincode || '',
          };
        }

        await handleTamaraPayment(applyWalletToPayload(payload));
      } catch (error) {
        setFormError(error.message || "Tamara payment failed");
        setPlacingOrder(false);
      }
      return;
    }

    // Tabby BNPL payment
    if (effectivePayment === 'tabby') {
      try {
        const itemsForTabby = buildCheckoutItems();

        let payload = {
          items: itemsForTabby,
          paymentMethod: 'TABBY',
          shippingFee: shipping,
          shippingMethod: shippingMethod,
          paymentStatus: 'pending',
        };

        if (user) {
          const addressId = form.addressId || (addressList[0] && addressList[0]._id);
          if (addressId) payload.addressId = addressId;
        } else {
          if (!form.name || !form.email || !resolvedPhone || (!isCustomerPickup && (!hasCompleteAddressStreetLine(form) || !resolveGuestCity(form) || !form.state || !resolvedCountry))) {
            setFormError("Please fill all required shipping details.");
            setPlacingOrder(false);
            return;
          }
          payload.isGuest = true;
          payload.guestInfo = {
            name: form.name,
            email: form.email,
            phone: resolvedPhone,
            phoneCode: form.phoneCode,
            alternatePhone: cleanedAlternatePhone || '',
            alternatePhoneCode: form.alternatePhone ? form.alternatePhoneCode || form.phoneCode : '',
            street: form.street,
            city: resolveGuestCity(form),
            state: form.state,
            district: form.district || '',
            country: resolvedCountry,
            pincode: resolvedPincode || '',
          };
        }

        await handleTabbyPayment(applyWalletToPayload(payload));
      } catch (error) {
        setFormError(error.message || 'Tabby payment failed');
        setPlacingOrder(false);
      }
      return;
    }
    
    // COD and other payment methods - Now supports guest checkout
    // Validate phone number for COD
    if (getPhoneInputError(resolvedPhone, phoneCodeForValidation)) {
      setFormError(getPhoneInputError(resolvedPhone, phoneCodeForValidation));
      setPlacingOrder(false);
      return;
    }
    
    try {
      let addressId = form.addressId;
      // If logged in and no address selected, skip address creation for now
      // Orders can work without addressId
      
      // Validate payment method for remaining balance
      if (!effectivePayment) {
        setFormError("Please select a payment method.");
        setPlacingOrder(false);
        return;
      }

      // Validate payment method limits
      const paymentLimitError = getPaymentMethodLimitError(
        shippingSetting,
        effectivePayment,
        totalAfterWallet,
        { hasPersonalizedOfferItem },
      );
      if (paymentLimitError) {
        setFormError(paymentLimitError);
        setPlacingOrder(false);
        return;
      }

      // Validate COD limit
      if (effectivePayment === 'cod') {
        if (hasPersonalizedOfferItem) {
          setFormError('COD is not available for personalized offer products. Please use online payment.');
          setPlacingOrder(false);
          return;
        }

        const maxCODAmount = shippingSetting?.maxCODAmount || 0;
        const remainingAmount = totalAfterWallet;
        
        if (!isPaymentMethodEnabled(shippingSetting, 'cod')) {
          setFormError("Cash on Delivery is not available.");
          setPlacingOrder(false);
          return;
        }
        
        if (maxCODAmount > 0 && remainingAmount > maxCODAmount) {
          setFormError(`COD is not available for orders above ${formatMoneyPlain(maxCODAmount)}. Your order amount is ${formatMoneyFixedPlain(remainingAmount)}. Please use online payment.`);
          setPlacingOrder(false);
          return;
        }
      }

      // Build order payload
      let payload;
      const recoveryToken = typeof window !== 'undefined'
        ? sessionStorage.getItem('abandonedCartRecoveryToken')
        : null;
      
      console.log('Checkout - User state:', user ? 'logged in' : 'guest');
      console.log('Checkout - User object:', user);
      
      // Build items directly from cartItems to preserve variantOptions
      const itemsFromState = buildCheckoutItems();
      
      const finalPaymentMethod = effectivePayment === 'cod'
        ? 'COD'
        : effectivePayment === 'wallet'
          ? 'WALLET'
          : effectivePayment.toUpperCase();

      if (user) {
        console.log('Building logged-in user payload...');
        payload = {
          items: itemsFromState,
          paymentMethod: finalPaymentMethod,
          shippingFee: shipping,
          codFeeIncludedInShipping: false,
          shippingMethod: shippingMethod,
        };
        // Add coupon data if applied
        if (appliedCoupon && (couponDiscount > 0 || isFreeShippingCouponApplied)) {
          payload.coupon = {
            code: appliedCoupon.code,
            discountAmount: couponDiscount,
            freeShipping: isFreeShippingCouponApplied,
            shippingDiscount,
            title: appliedCoupon.title,
            description: appliedCoupon.description,
          };
        }
        // Only add addressId if it exists
        if (addressId || (addressList[0] && addressList[0]._id)) {
          payload.addressId = addressId || addressList[0]._id;
        } else if (hasCompleteAddressStreetLine(form) && resolveGuestCity(form) && form.state && form.country) {
          // User is logged in but has no saved address - include address in payload
          payload.addressData = {
            name: form.name || user.displayName || '',
            email: form.email || user.email || '',
            phone: resolvedPhone || '',
            phoneCode: form.phoneCode,
            alternatePhone: cleanedAlternatePhone || '',
            alternatePhoneCode: form.alternatePhone ? form.alternatePhoneCode || form.phoneCode : '',
            street: form.street,
            city: resolveGuestCity(form),
            state: form.state,
            district: form.district || '',
            country: resolvedCountry,
            zip: resolvedPincode || '',
            district: form.district || ''
          };
        }
      } else {
        console.log('Building guest checkout payload...');
        payload = {
          items: itemsFromState,
          paymentMethod: finalPaymentMethod,
          shippingFee: shipping,
          codFeeIncludedInShipping: false,
          shippingMethod: shippingMethod,
          isGuest: true,
          guestInfo: {
            name: form.name,
            email: form.email,
            phone: resolvedPhone,
            phoneCode: form.phoneCode,
            alternatePhone: cleanedAlternatePhone || '',
            alternatePhoneCode: form.alternatePhone ? form.alternatePhoneCode || form.phoneCode : '',
            street: form.street,
            city: resolveGuestCity(form),
            state: form.state,
            district: form.district || '',
            country: resolvedCountry,
            pincode: resolvedPincode || '',
          }
        };
        // Add coupon for guest if applied
        if (appliedCoupon && (couponDiscount > 0 || isFreeShippingCouponApplied)) {
          payload.coupon = {
            code: appliedCoupon.code,
            discountAmount: couponDiscount,
            freeShipping: isFreeShippingCouponApplied,
            shippingDiscount,
            title: appliedCoupon.title,
            description: appliedCoupon.description,
          };
        }
      }

      if (recoveryToken) {
        payload.recoveryToken = recoveryToken;
      }

      applyWalletToPayload(payload);
      
      console.log('Submitting order:', payload);
      
      let fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withOrderTrackingFields(payload)),
      };
      
      if (user && getToken) {
        console.log('Adding Authorization header for logged-in user...');
        const token = await getToken();
        console.log('Got token:', token ? 'yes' : 'no');
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      } else {
        console.log('No Authorization header - guest checkout');
      }
      
      console.log('Final fetch options:', { ...fetchOptions, body: 'payload' });

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), 45000)
        : null;

      let res;
      try {
        res = await fetch("/api/orders", {
          ...fetchOptions,
          ...(controller ? { signal: controller.signal } : {}),
        });
      } catch (fetchErr) {
        if (fetchErr?.name === 'AbortError') {
          setFormError('Order is taking too long. Please try again.');
        } else {
          setFormError(fetchErr.message || 'Order failed. Please try again.');
        }
        setPlacingOrder(false);
        return;
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const errorText = await res.text();
        let msg = errorText;
        try {
          const data = JSON.parse(errorText);
          msg = data.message || data.error || errorText;
        } catch {}
        if (/pincode/i.test(String(msg || ''))) {
          msg = 'Please enter a valid pincode.';
        }
        setFormError(msg);
        setPlacingOrder(false);
        const isStayOnCheckoutError = /pincode|phone|shipping address|required|missing|too many requests|rate limit|slow down/i.test(String(msg || '').toLowerCase());
        if (!isStayOnCheckoutError) {
          router.push(`/order-failed?reason=${encodeURIComponent(msg)}`);
        }
        return;
      }
      const data = await res.json();
      const createdOrderId = data.id || data._id || data.orderId || data.order?._id;
      if (createdOrderId) {
        setPlacingOrder(false);

        if (effectivePayment === 'cod' && data.autoEmxShipping !== true) {
          const orderTotal = Number(data.total ?? data.order?.total ?? totalAfterWallet ?? 0);
          const canOfferCardPay = isPaymentMethodEnabled(shippingSetting, 'card')
            && !isPaymentMethodOverLimit(shippingSetting, 'card', orderTotal);
          if (canOfferCardPay) {
            setUpsellOrderId(createdOrderId);
            setUpsellOrderTotal(orderTotal);
            setUpsellToken(String(data.prepaidUpsellToken || ''));
            setShowPrepaidModal(true);
            setPlacingOrder(false);
            // Show modal before clearing cart so empty-cart redirect does not fire first.
            queueMicrotask(() => dispatch(clearCart()));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('walletUpdated'));
            }
            return;
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('walletUpdated'));
        }

        setNavigatingToSuccess(true);
        rememberPendingCheckoutOrder(createdOrderId);
        dispatch(clearCart());
        router.push(`/order-success?orderId=${createdOrderId}`);
      } else {
        // No order ID returned - treat as failure
        setFormError("Order creation failed. Please try again.");
        setPlacingOrder(false);
        router.push(`/order-failed?reason=${encodeURIComponent('Order creation failed')}`);
      }

    } catch (err) {
      const errorMsg = err.message || "Order failed. Please try again.";
      setFormError(errorMsg);
      setPlacingOrder(false);
      router.push(`/order-failed?reason=${encodeURIComponent(errorMsg)}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  const completePrepaidUpsell = useCallback(() => {
    const orderId = upsellOrderId;
    if (!orderId) return;
    setShowPrepaidModal(false);
    setUpsellOrderId(null);
    setUpsellOrderTotal(0);
    setUpsellToken('');
    setNavigatingToSuccess(true);
    rememberPendingCheckoutOrder(orderId);
    router.push(`/order-success?orderId=${orderId}`);
  }, [router, upsellOrderId]);

  const handlePayNowForExistingOrder = async () => {
    if (!upsellOrderId) return;

    try {
      setPayingNow(true);
      const headers = { 'Content-Type': 'application/json' };
      if (user && getToken) {
        try {
          const token = await getToken(true);
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch (tokenError) {
          console.warn('[checkout] prepaid upsell auth token unavailable', tokenError);
        }
      }

      // Stripe Checkout for the COD order (5% off applied only after Stripe pays).
      const res = await fetch('/api/orders/prepaid-upsell', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: upsellOrderId,
          prepaidUpsellToken: upsellToken || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      setPayingNow(false);
      const message = data?.error || 'Failed to create payment. Continuing with COD...';
      alert(message);
      setTimeout(() => {
        setShowPrepaidModal(false);
        setUpsellToken('');
        router.push(`/order-success?orderId=${upsellOrderId}`);
      }, 1200);
    } catch (err) {
      console.error('Payment error:', err);
      setPayingNow(false);
      alert('Payment failed. Continuing with COD...');
      setTimeout(() => {
        setNavigatingToSuccess(true);
        setShowPrepaidModal(false);
        setUpsellToken('');
        router.push(`/order-success?orderId=${upsellOrderId}`);
      }, 1200);
    }
  };

  if (authLoading || leavingCheckout) return null;

  const canShowCheckoutForm = cartArray.length > 0
    || showPrepaidModal
    || navigatingToSuccess
    || Boolean(upsellOrderId);

  if (!canShowCheckoutForm) {
    const cartIsEmpty = checkoutProductsLoaded;
    return (
      <div className="min-h-[70vh] bg-[#F8FAFA] pb-16 pt-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#05090D]">{t('checkout.pageTitle')}</h1>
              <p className="mt-1 text-sm text-[#5E6870]">
                {cartIsEmpty ? t('checkout.cartEmptyDesc') : t('checkout.loadingCart')}
              </p>
            </div>
          </div>

          {cartIsEmpty ? (
            <div className="rounded-2xl border border-[#E2E7E8] bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAFA] text-[#05090D]">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
                  <path d="M6 6 5 3H2" strokeLinecap="round" />
                  <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('checkout.cartEmpty')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{t('checkout.cartEmptyDesc')}</p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#C8F404] px-5 text-sm font-semibold text-[#05090D] transition hover:bg-[#ADD300]"
              >
                {t('checkout.shopNow')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <div className="space-y-4 md:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="h-16 w-16 animate-pulse rounded-lg bg-slate-200" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="h-16 w-16 animate-pulse rounded-lg bg-slate-200" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 space-y-3">
                    <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                </div>
              </div>
              <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-5 space-y-3">
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="mt-6 h-11 animate-pulse rounded-xl bg-slate-900/80" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showPrepaidModal) {
    return (
      <>
        <PrepaidUpsellModal 
          open={showPrepaidModal}
          orderTotal={upsellOrderTotal}
          discountAmount={upsellOrderTotal * 0.05}
          onClose={() => {}}
          onNoThanks={completePrepaidUpsell}
          onAutoDismiss={completePrepaidUpsell}
          onPayNow={handlePayNowForExistingOrder}
          loading={payingNow}
        />
      </>
    );
  }

  if (navigatingToSuccess) {
    return null;
  }

  const checkoutOrderPreviewItems = cartArray.slice(0, CHECKOUT_ORDER_PREVIEW_LIMIT);
  const checkoutOrderHiddenCount = Math.max(0, cartArray.length - CHECKOUT_ORDER_PREVIEW_LIMIT);

  const getRemovableCartItems = () => cartArray.filter((i) => !i._isFreeGift);

  const wouldDecrementRemoveItem = (item) => {
    if (item._isBulkBundle) {
      const tiers = getBulkBundleTiers(item);
      const currentTier = Number(item._bundleTier) || tiers[0] || 1;
      return tiers.indexOf(currentTier) <= 0;
    }
    const cartKey = item._cartKey || item._id;
    const entry = cartItems?.[cartKey];
    return getCartEntryQuantity(entry) <= 1;
  };

  const stepCheckoutBulkTier = (item, delta) => {
    const cartKey = item._cartKey || item._id;
    const entry = cartItems?.[cartKey];
    if (!entry || typeof entry !== 'object') return;

    const tiers = getBulkBundleTiers(item);
    if (!tiers.length) return;

    const currentTier = Number(item._bundleTier) || tiers[0];
    const currentIndex = Math.max(0, tiers.indexOf(currentTier));
    const nextIndex = currentIndex + delta;

    if (nextIndex < 0) {
      if (getRemovableCartItems().length <= 1) {
        setRemoveLastItemConfirm({ cartKey, product: item });
        return;
      }
      pushGtmEcommerceEvent(GTM_EVENTS.REMOVE_FROM_CART, {
        currency: GA4_CURRENCY,
        value: Number(item._cartPrice ?? item.price ?? 0) * Number(item._displayQuantity ?? item.quantity ?? 1),
        items: cartLinesToGtmItems([item]),
      });
      dispatch(deleteItemFromCart({ productId: cartKey }));
      return;
    }

    const nextTier = tiers[Math.min(tiers.length - 1, nextIndex)];
    const variant = findBulkBundleVariant(item, nextTier);
    dispatch(setCartEntry({
      productId: cartKey,
      entry: {
        ...entry,
        quantity: 1,
        price: Number(variant?.price ?? entry.price ?? item.price ?? 0),
        variantOptions: {
          ...(entry.variantOptions || {}),
          bundleQty: nextTier,
        },
      },
    }));
  };

  const navigateAwayFromCheckout = (product) => {
    let returnPath = null;
    try {
      returnPath = sessionStorage.getItem(CHECKOUT_RETURN_PATH_KEY);
      sessionStorage.removeItem(CHECKOUT_RETURN_PATH_KEY);
    } catch {
      // Ignore sessionStorage failures.
    }

    const productPath = product?.slug || product?._id ? getProductPath(product) : '/shop';
    const safeReturn = returnPath && returnPath !== '/checkout' && returnPath !== '/cart'
      ? returnPath
      : null;

    if (safeReturn) {
      router.replace(safeReturn);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(productPath);
  };

  const handleCheckoutRemoveItem = (item) => {
    const cartKey = item._cartKey || item._id;
    if (getRemovableCartItems().length <= 1) {
      setRemoveLastItemConfirm({ cartKey, product: item });
      return;
    }
    const unitPrice = Number(item._cartPrice ?? item.price ?? 0);
    const qty = Number(item._displayQuantity ?? item.quantity ?? 1);
    pushGtmEcommerceEvent(GTM_EVENTS.REMOVE_FROM_CART, {
      currency: GA4_CURRENCY,
      value: unitPrice * qty,
      items: cartLinesToGtmItems([{ ...item, quantity: qty }]),
    });
    dispatch(deleteItemFromCart({ productId: cartKey }));
  };

  const handleCheckoutDecrementItem = (item) => {
    if (item._isBulkBundle) {
      if (getRemovableCartItems().length <= 1 && wouldDecrementRemoveItem(item)) {
        setRemoveLastItemConfirm({ cartKey: item._cartKey || item._id, product: item });
        return;
      }
      stepCheckoutBulkTier(item, -1);
      return;
    }

    const cartKey = item._cartKey || item._id;
    const entry = cartItems?.[cartKey];
    if (getRemovableCartItems().length <= 1 && wouldDecrementRemoveItem(item)) {
      setRemoveLastItemConfirm({ cartKey, product: item });
      return;
    }
    decrementCartItem(dispatch, {
      productId: cartKey,
      entry,
      product: item,
    });
  };

  const confirmRemoveLastItem = () => {
    if (!removeLastItemConfirm) return;
    const { cartKey, product } = removeLastItemConfirm;
    setRemoveLastItemConfirm(null);
    setShowAllOrderItemsModal(false);
    setLeavingCheckout(true);
    if (product) {
      pushGtmEcommerceEvent(GTM_EVENTS.REMOVE_FROM_CART, {
        currency: GA4_CURRENCY,
        value: Number(product._cartPrice ?? product.price ?? 0) * Number(product._displayQuantity ?? product.quantity ?? 1),
        items: cartLinesToGtmItems([product]),
      });
    }
    dispatch(deleteItemFromCart({ productId: cartKey }));
    navigateAwayFromCheckout(product);
  };

  const renderCheckoutOrderItem = (item) => (
    <div key={item._cartKey || item._id} className="flex items-center gap-2 rounded-lg border border-[#E2E7E8] bg-[#F8FAFA] px-2 py-2">
      <img src={item.image || item.images?.[0] || '/placeholder.png'} alt={item.name} className="h-11 w-11 shrink-0 rounded-md border border-[#E2E7E8] object-cover" />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold text-[#05090D]">{item.name}</div>
        <div className="text-xs text-[#5E6870] truncate">
          {getProductSubtitle(item, {
            variantOptions: item.variantOptions || item._variantOptions,
            quantity: item._isMatrix ? item.quantity : undefined,
          }) || ''}
        </div>
        {item._isFreeGift ? (
          <div className="text-xs font-semibold text-green-600">Free gift</div>
        ) : null}
        <div className="text-xs font-semibold text-[#05090D]">{item._isFreeGift ? 'FREE' : formatMoney(item._lineTotal ?? item._cartPrice ?? item.price ?? 0)}</div>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        {item._isFreeGift ? (
          <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">AUTO-ADDED</div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E2E7E8] bg-white text-sm text-[#05090D]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCheckoutDecrementItem(item);
                }}
              >
                -
              </button>
              <span className="px-2 text-sm">
                {item._displayQuantity ?? item.quantity}
              </span>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E2E7E8] bg-white text-sm text-[#05090D] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={item._isBulkBundle
                  ? (() => {
                    const tiers = getBulkBundleTiers(item);
                    const currentTier = Number(item._bundleTier) || tiers[tiers.length - 1];
                    return tiers.indexOf(currentTier) >= tiers.length - 1;
                  })()
                  : (item._isMatrix
                    ? item.quantity >= (resolveMatrixCartMaxPacks(item, cartItems?.[item._cartKey || item._id]) ?? Infinity)
                    : false)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (item._isBulkBundle) {
                    stepCheckoutBulkTier(item, 1);
                    return;
                  }
                  const cartKey = item._cartKey || item._id;
                  const entry = cartItems?.[cartKey];
                  incrementCartItem(dispatch, {
                    productId: cartKey,
                    entry,
                    product: item,
                    price: item._cartPrice ?? item.price,
                    maxQty: item._isMatrix
                      ? resolveMatrixCartMaxPacks(item, entry)
                      : undefined,
                  });
                }}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-[#B12F39] hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCheckoutRemoveItem(item);
              }}
            >
              {t('checkout.remove')}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-[#F8FAFA] pb-24 pt-4 md:pb-12 md:pt-8">
      <div className="mx-auto w-full max-w-[1080px] px-4 sm:px-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-[#05090D]">{t('checkout.pageTitle')}</h1>
        {activeCheckoutAlert ? (
          <div className="mb-4">
            <CheckoutAlertBanner alert={activeCheckoutAlert} />
          </div>
        ) : null}
      <div className="rounded-[28px] border border-[#E2E7E8] bg-white p-4 shadow-[0_16px_40px_rgba(5,9,13,0.05)] sm:p-6 lg:p-8">
      <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
            {/* Shipping Details Section */}
            <form id="checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
              {formError && !isRateLimitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-semibold">{isPincodeError ? 'Address Validation' : isPaymentStartError ? 'Payment Error' : 'Validation Error'}</div>
                    <div className="text-sm mt-1">{isPincodeError ? 'Please enter a valid pincode.' : formError}</div>
                  </div>
                </div>
              )}
              
              {!isCustomerPickup && user ? (
                <h2 className="text-base font-bold text-[#05090D]">{t('checkout.shippingDetails')}</h2>
              ) : null}
              {/* ...existing code for address/guest form... */}
              {/* Show address fetch error if present */}
              {user && addressFetchError && (
                <div className="text-red-600 font-semibold mb-2">
                  {addressFetchError === 'Unauthorized' ? (
                    <>
                      You are not logged in or your session expired. <button className="underline text-blue-600" type="button" onClick={() => setShowSignIn(true)}>Sign in again</button>.
                    </>
                  ) : addressFetchError}
                </div>
              )}
              {isCustomerPickup && user && !hasValidPhone(form.phone) && !hasValidPhone(user?.phoneNumber || user?.phone) ? (
                <div id="guest-phone" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-amber-900">{t('checkout.phoneNumber')}</p>
                  <PhoneNumberField
                    phone={form.phone}
                    phoneCode={form.phoneCode}
                    onPhoneChange={(value) => setForm((f) => ({ ...f, phone: value }))}
                    onPhoneCodeChange={handleChange}
                    countryOptions={UAE_PHONE_CODE_OPTIONS}
                    selectClassName="border border-amber-300 bg-white rounded px-2 py-2"
                    inputClassName="border border-amber-300 bg-white rounded px-4 py-2 flex-1"
                    errorClassName="text-red-500 text-xs mt-2"
                    showLabel={false}
                    showHint={false}
                  />
                  {fieldRequiredHint('guest-phone')}
                </div>
              ) : null}
              {!isCustomerPickup && checkoutAddressList.length > 0 && !(user && addressFetchError) ? (
                <div id="checkout-address">
                  {/* Shipping Address Section - Noon.com Style */}
                  <div className={`bg-white rounded-lg border ${
                    fieldHasError('checkout-address')
                    || fieldHasError('checkout-address-area')
                    || fieldHasError('checkout-address-district')
                    || isLoggedInAreaMissing
                    || isLoggedInDistrictMissing
                      ? 'border-red-300 ring-2 ring-red-100'
                      : 'border-gray-200'
                  }`}>
                    {form.addressId && (() => {
                      const selectedAddress = checkoutAddressList.find(a => a._id === form.addressId);
                      if (!selectedAddress) return null;
                      const addressParts = [
                        selectedAddress.street,
                        selectedAddress.city,
                        selectedAddress.district,
                        selectedAddress.state,
                      ]
                        .map((part) => String(part || '').trim())
                        .filter(Boolean)
                        .filter((part, index, list) => list.findIndex(
                          (existing) => existing.toLowerCase() === part.toLowerCase(),
                        ) === index);
                      return (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 md:gap-3 md:px-4 md:py-3.5"
                          onClick={() => setShowAddressModal(true)}
                        >
                          <svg className="h-5 w-5 shrink-0 text-[#05090D]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-gray-900">
                                {t('checkout.deliverTo')} {selectedAddress.name?.toUpperCase() || 'HOME'}
                              </span>
                              <span className="shrink-0 text-[11px] font-semibold text-[#05090D] underline decoration-[#C8F404] underline-offset-2 md:text-xs">
                                {t('checkout.switchAddress')}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-4 text-gray-500 line-clamp-2">
                              {addressParts.join(' – ')}
                            </span>
                          </span>
                          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })()}
                    
                    {!form.addressId && (
                      <div 
                        className="px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setShowAddressModal(true)}
                      >
                        <div className="flex items-center justify-center gap-2 font-medium text-[#05090D]">
                          <span className="text-xl">+</span>
                          <span>{t('checkout.selectDeliveryAddress')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                {fieldRequiredHint('checkout-address')}
                {fieldRequiredHint('checkout-address-area')}
                {fieldRequiredHint('checkout-address-district')}
                {(isLoggedInAreaMissing || isLoggedInDistrictMissing) && !fieldHasError('checkout-address-area') && !fieldHasError('checkout-address-district') ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700">
                      {isLoggedInAreaMissing ? t('checkout.selectAreaRequired') : t('checkout.selectDistrict')}
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-sm font-semibold text-red-700 underline"
                      onClick={() => {
                        if (selectedAddressForView?._id) {
                          setEditingAddressId(selectedAddressForView._id);
                        }
                        setShowAddressModal(true);
                      }}
                    >
                      {isArabic ? 'تحديث العنوان' : 'Update address'}
                    </button>
                  </div>
                ) : null}
                
                {/* Phone Number Section - Show for logged-in users if missing from address */}
                {shouldShowPhoneRequired && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
                    <div className="flex items-start gap-2 mb-3">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">{t('checkout.phoneRequired')}</p>
                        <p className="text-xs text-yellow-700 mt-1">{t('checkout.phoneRequiredDesc')}</p>
                      </div>
                    </div>
                    <PhoneNumberField
                      phone={form.phone}
                      phoneCode={form.phoneCode}
                      onPhoneChange={(value) => setForm((f) => ({ ...f, phone: value }))}
                      onPhoneCodeChange={handleChange}
                      countryOptions={UAE_PHONE_CODE_OPTIONS}
                      selectClassName="border border-yellow-300 bg-white rounded px-2 py-2 focus:border-yellow-400"
                      inputClassName="border border-yellow-300 bg-white rounded px-4 py-2 flex-1 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
                      errorClassName="text-red-500 text-xs mt-2"
                      showLabel={false}
                      showHint={false}
                    />
                  </div>
                )}
                </div>
              ) : (!isCustomerPickup && checkoutAddressList.length === 0 && user) ? (
                <button 
                  type="button"
                  className="w-full rounded-2xl border border-dashed border-[#05090D] p-4 font-semibold text-[#05090D] transition hover:bg-[#F8FEE6]"
                  onClick={() => {
                    setEditingAddressId(null);
                    setShowAddressModal(true);
                  }}
                >
                  <span className="text-xl">+</span> Add Delivery Address
                </button>
              ) : (!user) ? (
                <div className="grid w-full min-w-0 gap-4">
                  <div className={guestSectionClass}>
                    <h3 className="text-base font-bold text-[#05090D]">{t('checkout.contactDetails')}</h3>
                    <p className="text-sm leading-relaxed text-[#5E6870]">
                      {t('checkout.guestSubtitle')}{' '}
                      <button type="button" onClick={() => setShowSignIn(true)} className="font-semibold text-[#05090D] underline">
                        {t('checkout.signInInstead')}
                      </button>
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label htmlFor="guest-name" className={guestLabelClass}>{t('checkout.fullName')}</label>
                        <input
                          id="guest-name"
                          className={`${guestFieldClass} ${fieldErrorClass('guest-name')}`}
                          type="text"
                          name="name"
                          placeholder="Enter your name"
                          value={form.name || ''}
                          onChange={handleChange}
                          required
                        />
                        {fieldRequiredHint('guest-name')}
                      </div>

                      <div className="min-w-0">
                        <label htmlFor="guest-email" className={guestLabelClass}>{t('checkout.emailAddress')}</label>
                        <input
                          id="guest-email"
                          className={`${guestFieldClass} ${fieldErrorClass('guest-email')}`}
                          type="email"
                          name="email"
                          placeholder={t('checkout.emailAddress')}
                          value={form.email || ''}
                          onChange={handleChange}
                        />
                        {fieldRequiredHint('guest-email')}
                      </div>
                    </div>

                    <div id="guest-phone" className="min-w-0">
                      <PhoneNumberField
                        label={t('checkout.phoneNumber')}
                        phone={form.phone}
                        phoneCode={form.phoneCode}
                        onPhoneChange={(value) => {
                          setInvalidFieldIds(new Set());
                          setValidationAlertOpen(false);
                          setForm((f) => ({ ...f, phone: value }));
                        }}
                        onPhoneCodeChange={handleChange}
                        countryOptions={UAE_PHONE_CODE_OPTIONS}
                        inputClassName={`flex-1 rounded-lg border border-[#E2E7E8] bg-white px-3 py-2 text-sm text-[#05090D] outline-none transition placeholder:text-[#879198] focus:border-[#05090D] focus:ring-2 focus:ring-[#EFFCC4] ${fieldErrorClass('guest-phone')}`}
                      />
                      {fieldRequiredHint('guest-phone')}
                    </div>
                  </div>

                  {!isCustomerPickup ? (
                  <div className={guestSectionClass}>
                    <h3 className="text-base font-bold text-[#05090D]">{t('checkout.shippingDetails')}</h3>

                    <div className={`grid min-w-0 gap-3 ${isUaeCountry(form.country) && form.state ? 'sm:grid-cols-2' : ''}`}>
                      <div id="guest-state" className="min-w-0">
                        <label className={guestLabelClass}>
                          {isUaeCountry(form.country) ? t('checkout.selectEmirate') : t('checkout.emirateState')}
                        </label>
                        {form.country === 'India' ? (
                          <SearchableSelect
                            value={form.state}
                            onChange={handleStateSelect}
                            options={indiaStatesAndDistricts.map((s) => s.state)}
                            placeholder={t('checkout.selectState')}
                            searchPlaceholder="Search state..."
                            required
                            hasError={fieldHasError('guest-state')}
                            triggerClassName={checkoutSelectClass}
                          />
                        ) : isUaeCountry(form.country) ? (
                          <SearchableSelect
                            value={form.state}
                            onChange={handleStateSelect}
                            options={UAE_EMIRATES}
                            placeholder={t('checkout.selectEmirate')}
                            searchPlaceholder="Search emirate..."
                            required
                            hasError={fieldHasError('guest-state')}
                            triggerClassName={checkoutSelectClass}
                          />
                        ) : (
                          <input
                            className={`${guestFieldClass} ${fieldErrorClass('guest-state')}`}
                            type="text"
                            name="state"
                            placeholder={t('checkout.emirateState')}
                            value={form.state || ''}
                            onChange={handleChange}
                            required
                          />
                        )}
                        {fieldRequiredHint('guest-state')}
                      </div>

                      {isUaeCountry(form.country) && form.state ? (
                        <div id="guest-area" className="min-w-0">
                          <label className={guestLabelClass}>{t('checkout.selectArea')}</label>
                          <SearchableSelect
                            value={form.district}
                            onChange={(value) => {
                              setInvalidFieldIds(new Set());
                              setValidationAlertOpen(false);
                              setSidebarPayError('');
                              setForm((f) => ({ ...f, district: value }));
                            }}
                            options={getUaeAreaOptionsForEmirate(form.state, form.district)}
                            placeholder={t('checkout.selectArea')}
                            searchPlaceholder="Search area..."
                            emptyMessage={t('checkout.noAreasFound')}
                            listHint={t('checkout.areaListHint', {
                              count: getUaeAreaOptionsForEmirate(form.state, form.district).length,
                              emirate: form.state,
                            })}
                            allowCustomValue
                            formatCustomOption={(area) => t('checkout.useCustomArea', { area })}
                            required
                            hasError={fieldHasError('guest-area')}
                            triggerClassName={checkoutSelectClass}
                          />
                          {fieldRequiredHint('guest-area')}
                          {!fieldHasError('guest-area') ? (
                            <p className="mt-1 text-xs text-slate-500">{t('checkout.areaHint')}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <p className={`${guestLabelClass} mb-2`}>{t('checkout.street')}</p>
                      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <label htmlFor="guest-building" className={guestLabelClass}>
                            {t('checkout.buildingVilla')} <span className="text-red-600" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="guest-building"
                            className={`${guestFieldClass} ${fieldErrorClass('guest-building')}`}
                            type="text"
                            name="buildingOrVilla"
                            placeholder={t('checkout.buildingVilla')}
                            value={form.buildingOrVilla || ''}
                            onChange={handleChange}
                            autoComplete="address-line1"
                            required
                          />
                          {fieldRequiredHint('guest-building')}
                        </div>
                        <div className="min-w-0">
                          <label htmlFor="guest-apartment" className={guestLabelClass}>{t('checkout.apartmentFloor')}</label>
                          <input
                            id="guest-apartment"
                            className={guestFieldClass}
                            type="text"
                            name="apartmentOrFloor"
                            placeholder={t('checkout.apartmentFloor')}
                            value={form.apartmentOrFloor || ''}
                            onChange={handleChange}
                            autoComplete="address-line3"
                          />
                        </div>
                        <div className="min-w-0 sm:col-span-2">
                          <label htmlFor="guest-street" className={guestLabelClass}>
                            {t('checkout.streetName')} <span className="text-red-600" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="guest-street"
                            className={`${guestFieldClass} ${fieldErrorClass('guest-street')}`}
                            type="text"
                            name="streetName"
                            placeholder={t('checkout.streetName')}
                            value={form.streetName || ''}
                            onChange={handleChange}
                            autoComplete="address-line2"
                            required
                          />
                          {fieldRequiredHint('guest-street')}
                        </div>
                      </div>
                    </div>

                    {form.country === 'India' && form.state ? (
                      <div id="guest-district" className="min-w-0">
                        <label className={guestLabelClass}>{t('checkout.selectDistrict')}</label>
                        <select
                          className={`${guestFieldClass} ${fieldErrorClass('guest-district')}`}
                          name="district"
                          value={form.district}
                          onChange={handleChange}
                          required
                        >
                          <option value="">{t('checkout.selectDistrict')}</option>
                          {districts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        {fieldRequiredHint('guest-district')}
                      </div>
                    ) : !isUaeCountry(form.country) && form.country !== 'India' ? (
                      <div className="min-w-0">
                        <label className={guestLabelClass}>{t('checkout.selectDistrict')}</label>
                        <input
                          className={guestFieldClass}
                          type="text"
                          name="district"
                          placeholder="Area or district"
                          value={form.district || ''}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    ) : null}

                    {form.country === 'India' ? (
                      <div id="guest-pincode" className="min-w-0 sm:max-w-xs">
                        <label htmlFor="guest-pincode-input" className={guestLabelClass}>Pincode</label>
                        <input
                          id="guest-pincode-input"
                          className={`${guestFieldClass} ${fieldErrorClass('guest-pincode')}`}
                          type="text"
                          name="pincode"
                          inputMode="numeric"
                          placeholder="6-digit pincode"
                          value={form.pincode || ''}
                          onChange={handleChange}
                          maxLength={6}
                        />
                        {fieldRequiredHint('guest-pincode')}
                      </div>
                    ) : null}

                    <p id="guest-country" className="text-xs text-[#5E6870]">{t('checkout.country')}: United Arab Emirates</p>
                  </div>
                  ) : null}
                </div>
              ) : null}
              <h2 className="text-base font-bold text-[#05090D]">{t('checkout.deliveryMethod')}</h2>
              <div className="space-y-3">
                {pickupAvailable ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFulfillmentChoice('delivery')}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        !isCustomerPickup
                          ? 'border-[#05090D] bg-[#F8FEE6]'
                          : 'border-[#E2E7E8] bg-white hover:border-[#05090D]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFA] text-[#05090D]">
                          <Truck className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-900">{t('checkout.deliverToYou')}</span>
                          <p className="mt-0.5 text-sm text-slate-500">{t('checkout.deliverToYouHint')}</p>
                        </div>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          !isCustomerPickup ? 'border-[#05090D] bg-[#C8F404]' : 'border-[#E2E7E8] bg-white'
                        }`}>
                          {!isCustomerPickup ? <Check className="h-3 w-3 text-[#05090D]" strokeWidth={3} /> : null}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentChoice('pickup')}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        isCustomerPickup
                          ? 'border-[#05090D] bg-[#F8FEE6]'
                          : 'border-[#E2E7E8] bg-white hover:border-[#05090D]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFA] text-[#05090D]">
                          <MapPin className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-900">{t('checkout.storePickup')}</span>
                          <p className="mt-0.5 text-sm text-slate-500">{t('checkout.storePickupHint')}</p>
                        </div>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isCustomerPickup ? 'border-[#05090D] bg-[#C8F404]' : 'border-[#E2E7E8] bg-white'
                        }`}>
                          {isCustomerPickup ? <Check className="h-3 w-3 text-[#05090D]" strokeWidth={3} /> : null}
                        </span>
                      </div>
                    </button>
                  </div>
                ) : null}
                {isCustomerPickup ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t('checkout.pickupAddressLabel')}</p>
                    <p className="mt-2 text-base font-semibold leading-relaxed text-slate-900">{CUSTOMER_PICKUP_ADDRESS.line}</p>
                    <p className="mt-1 text-sm text-slate-600">{t('checkout.pickupCollect')}</p>
                    <button
                      type="button"
                      onClick={() => setShowPickupMap(true)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                    >
                      <MapPin className="h-4 w-4" />
                      {t('checkout.viewLocation')}
                    </button>
                  </div>
                ) : null}
                {!isCustomerPickup && availableShippingOptions.map((option) => {
                  const optionFee = calculateShipping({
                    cartItems: cartArray,
                    shippingSetting,
                    shippingOption: option,
                    paymentMethod: form.payment === 'cod' ? 'COD' : 'CARD',
                    shippingState: form.state,
                    includeCODFee: false,
                  });
                  const optionDays = formatDeliveryDays(option.estimatedDays, '3-5');
                  const isSelected = shippingMethod === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setShippingMethod(option.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'border-[#05090D] bg-[#F8FEE6]'
                          : 'border-[#E2E7E8] bg-white hover:border-[#05090D]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-[#05090D]">{option?.name || 'Delivery'}</span>
                          <p className="text-xs text-[#5E6870]">{t('checkout.deliveredIn', { days: optionDays })}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-[#05090D]">
                          {optionFee === 0 ? t('cart.free') : formatMoney(optionFee)}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!isCustomerPickup && !availableShippingOptions.length ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    No delivery options are available for the selected location.
                  </p>
                ) : null}
              </div>
              
              {/* State-wise charge note */}
              {!isCustomerPickup && form.state && shippingSetting?.stateCharges && Array.isArray(shippingSetting.stateCharges) && (() => {
                const stateCharge = shippingSetting.stateCharges.find(
                  (entry) => String(entry?.state || '').trim().toLowerCase() === String(form.state || '').trim().toLowerCase()
                );
                return stateCharge ? (
                  <div className="text-xs text-slate-600 mt-2">
                    ℹ️ <span className="font-medium">Shipping charge for {form.state}:</span> {formatMoney(stateCharge.fee)} (varies by state)
                  </div>
                ) : null;
              })()}
              <div>
                <h2 className="text-base font-bold text-[#05090D]">{t('checkout.paymentMethods')}</h2>
                <p className="mt-1 text-sm text-[#5E6870]">{t('checkout.paymentEncrypted')}</p>
              </div>
              {fieldRequiredHint('checkout-payment')}

              {storefrontWalletEnabled && user && walletBalance > 0 ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWalletBalance}
                      onChange={(e) => setUseWalletBalance(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-amber-600"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900">{t('checkout.useWalletBalance')}</span>
                      <p className="mt-1 text-sm text-amber-900">
                        {t('checkout.walletAvailable', { amount: formatMoney(walletBalance) })}
                      </p>
                      {useWalletBalance && walletRedeemAmount > 0 ? (
                        <p className="mt-1 text-sm font-medium text-amber-800">
                          -{formatMoney(walletRedeemAmount)} {t('checkout.walletApplied')}
                        </p>
                      ) : null}
                    </div>
                  </label>
                </div>
              ) : null}

              {storefrontWalletEnabled && isFullWalletPayment ? (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-900">{t('checkout.payWithWallet')}</p>
                  <p className="mt-1 text-sm text-emerald-800">{t('checkout.walletCoversOrder')}</p>
                </div>
              ) : (
              <div id="checkout-payment" className={`flex flex-col gap-2 ${fieldHasError('checkout-payment') ? 'rounded-xl ring-2 ring-red-100' : ''}`}>
                {/* Credit Card Option */}
                {showCardPayment ? (
                <label className={paymentChoiceClass}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={form.payment === 'card'}
                    onChange={handleChange}
                    className={paymentRadioClass}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <span className="text-sm font-semibold text-gray-900 md:text-base">{t('checkout.creditDebitCard')}</span>
                        <div className="text-[11px] leading-4 text-gray-600 md:text-xs">{t('checkout.cardSubtitle')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Image src={VisaLogo} alt="Visa" width={36} height={24} className="h-5 w-auto object-contain rounded-sm bg-black"/>
                      <Image src={MastercardLogo} alt="Mastercard" width={36} height={24} className="h-5 w-auto object-contain"/>
                      <Image src={AmexLogo} alt="American Express" width={36} height={24} className="h-5 w-auto object-contain"/>
                      <Image src={GooglePayLogo} alt="Google Pay" width={40} height={24} className="h-5 w-auto object-contain rounded-sm bg-black"/>
                    </div>
                  </div>
                </label>
                ) : null}

                {showVaultsPayPayment ? (
                <>
                <label className={paymentChoiceClass}>
                  <input
                    type="radio"
                    name="payment"
                    value="vaultspay"
                    checked={form.payment === 'vaultspay'}
                    onChange={handleChange}
                    className={paymentRadioClass}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold leading-tight text-gray-950">{t('checkout.creditDebitCard')}</span>
                    <span className="mt-0.5 block truncate text-[13px] leading-tight text-slate-500">{t('checkout.visaMastercard')}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Image src={VisaLogo} alt="Visa" width={52} height={32} className="h-6 w-auto object-contain md:h-7" />
                    <Image src={MastercardLogo} alt="Mastercard" width={52} height={32} className="h-6 w-auto object-contain md:h-7" />
                  </div>
                </label>
                {showVaultsPayGooglePay ? (
                <label className={paymentChoiceClass}>
                  <input
                    type="radio"
                    name="payment"
                    value="googlepay"
                    checked={form.payment === 'googlepay'}
                    onChange={handleChange}
                    className={paymentRadioClass}
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-950">{t('checkout.googlePay')}</span>
                  <Image src={GooglePayLogo} alt="" width={56} height={32} className="h-6 w-auto shrink-0 object-contain md:h-7" />
                </label>
                ) : null}
                {showVaultsPayApplePay ? (
                <label className={paymentChoiceClass}>
                  <input
                    type="radio"
                    name="payment"
                    value="applepay"
                    checked={form.payment === 'applepay'}
                    onChange={handleChange}
                    className={paymentRadioClass}
                  />
                  <Image src={ApplePayLogo} alt="" width={56} height={32} className="hidden h-7 w-auto shrink-0 object-contain md:block" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold leading-tight text-gray-950">{t('checkout.applePay')}</span>
                    <span className="mt-0.5 block truncate text-[13px] leading-tight text-slate-500 md:hidden">{t('checkout.applePayHint')}</span>
                  </span>
                  <Image src={ApplePayLogo} alt="" width={56} height={32} className="h-8 w-14 shrink-0 rounded-sm object-cover object-center md:hidden" />
                </label>
                ) : null}
                </>
                ) : null}

                {/* Cash on Delivery Option */}
                {showCodPayment ? (() => {
                  const maxCODAmount = shippingSetting?.maxCODAmount || 0;
                  const remainingAmount = totalAfterWallet;
                  const isCODDisabled =
                    (maxCODAmount > 0 && remainingAmount > maxCODAmount);

                  return (
                    <div className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 transition-colors md:p-4 ${
                      isCODDisabled
                        ? 'cursor-not-allowed border-[#E2E7E8] bg-[#F8FAFA] opacity-50'
                        : 'cursor-pointer border-[#E2E7E8] bg-white has-[:checked]:border-[#05090D] has-[:checked]:bg-[#F8FEE6]'
                    }`}>
                      <input
                        type="radio"
                        name="payment"
                        id="checkout-payment-cod"
                        value="cod"
                        checked={form.payment === 'cod' && !isCODDisabled}
                        onChange={handleChange}
                        disabled={isCODDisabled}
                        className={paymentRadioClass}
                      />
                      <div className="min-w-0 flex-1">
                        <div>
                          <label htmlFor="checkout-payment-cod" className="block truncate text-[15px] font-semibold leading-tight text-gray-950">{isCustomerPickup ? t('checkout.cashOnPickup') : t('checkout.cashOnDelivery')}</label>
                          <span className="mt-0.5 block truncate text-[13px] leading-tight text-slate-500">{isCustomerPickup ? t('checkout.cashOnPickupSubtitle') : t('checkout.codSubtitle')}</span>
                        </div>
                        {isCODDisabled && maxCODAmount > 0 && remainingAmount > maxCODAmount && (
                          <span className="text-xs text-red-600 ml-8">Max limit AED{maxCODAmount}</span>
                        )}
                      </div>
                      {codFee > 0 && (
                        <div className="group relative flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-950 shadow-sm">
                          <span className="flex flex-col leading-tight">
                            <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-wide text-amber-800">
                              {t('checkout.codFee')}
                            </span>
                            <span className="whitespace-nowrap text-sm font-bold md:text-base">
                              +{formatMoneyPlain(codFee)}
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label={t('checkout.codFee')}
                            aria-describedby="checkout-cod-fee-tooltip"
                            className="rounded-full text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                          >
                            <Info size={15} aria-hidden="true" />
                          </button>
                          <span
                            id="checkout-cod-fee-tooltip"
                            role="tooltip"
                            className="absolute end-0 top-full z-30 hidden w-56 whitespace-normal rounded-lg bg-slate-900 px-3 py-2 text-start text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
                          >
                            {t('checkout.codFeeTooltip', { amount: formatMoneyPlain(codFee) })}
                          </span>
                        </div>
                      )}
                      <svg className="h-6 w-6 shrink-0 text-slate-800 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                        <rect x="3" y="6.5" width="18" height="12" rx="2" />
                        <path d="M3 10.5h18" />
                        <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
                      </svg>
                    </div>
                  );
                })() : null}

                {/* Tamara BNPL Option */}
                {showTamaraPayment ? (() => {
                  const tamaraInstalment = totalAfterWallet > 0 ? Number((totalAfterWallet / 4).toFixed(2)) : 0;
                  return (
                    <label className="flex cursor-pointer flex-col justify-center gap-0 rounded-2xl border border-[#e6e8ee] bg-white px-3.5 py-3.5 transition-colors has-[:checked]:border-[#6f63f6] has-[:checked]:bg-[#f4f1ff] md:rounded-xl md:border-2 md:border-slate-200 md:p-4 md:has-[:checked]:border-[#f075a3] md:has-[:checked]:bg-[#fff5f9]">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="tamara"
                          checked={form.payment === 'tamara'}
                          onChange={handleChange}
                          className={`${paymentRadioClass} md:accent-[#f075a3]`}
                        />
                        <BnplLogo provider="tamara" size="checkout" className="!hidden md:!block md:!h-6" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold leading-tight text-gray-950">Tamara</span>
                          <span className="mt-0.5 block truncate text-[13px] leading-tight text-slate-500 md:hidden">{t('checkout.splitInto4')}</span>
                          <span className="mt-0.5 hidden truncate text-xs leading-tight text-slate-500 md:block">{t('checkout.splitPayments')}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 md:hidden">
                          <BnplLogo provider="tamara" size="checkout" className="!h-6" />
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400">i</span>
                        </span>
                      </div>
                      {form.payment === 'tamara' ? (
                      <>
                      <div className="mt-2 text-sm text-[#F75B94]">
                        Pay <span className="font-bold">{formatMoneyFixed(tamaraInstalment)}</span> today, then 3 interest-free payments.
                      </div>
                      </>
                      ) : null}
                    </label>
                  );
                })() : null}

                {/* Tabby BNPL Option */}
                {showTabbyPayment ? (() => {
                  const tabbyInstalment = totalAfterWallet > 0 ? Number((totalAfterWallet / 4).toFixed(2)) : 0;
                  return (
                    <label className="flex cursor-pointer flex-col justify-center gap-0 rounded-2xl border border-[#e6e8ee] bg-white px-3.5 py-3.5 transition-colors has-[:checked]:border-[#6f63f6] has-[:checked]:bg-[#f4f1ff] md:rounded-xl md:border-2 md:border-slate-200 md:p-4 md:has-[:checked]:border-[#3DBEA3] md:has-[:checked]:bg-[#f0faf8]">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="tabby"
                          checked={form.payment === 'tabby'}
                          onChange={handleChange}
                          className={`${paymentRadioClass} md:accent-[#3DBEA3]`}
                        />
                        <BnplLogo provider="tabby" size="checkout" className="!hidden md:!block md:!h-6" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold leading-tight text-gray-950">Tabby</span>
                          <span className="mt-0.5 block truncate text-[13px] leading-tight text-slate-500 md:hidden">{t('checkout.splitInto4')}</span>
                          <span className="mt-0.5 hidden truncate text-xs leading-tight text-slate-500 md:block">{t('checkout.splitPayments')}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 md:hidden">
                          <BnplLogo provider="tabby" size="checkout" className="!h-6" />
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400">i</span>
                        </span>
                      </div>
                      {form.payment === 'tabby' ? (
                      <>
                      <div className="mt-2 text-sm text-[#2E9E88]">
                        Pay <span className="font-bold">{formatMoneyFixed(tabbyInstalment)}</span> today, then 3 interest-free payments.
                      </div>
                      </>
                      ) : null}
                      {form.payment === 'tabby' && (
                        <div className="ml-8 mt-3 border border-gray-200 rounded-lg p-2 bg-white" id="tabbyCard"></div>
                      )}
                    </label>
                  );
                })() : null}
              </div>
              )}

              {hasPersonalizedOfferItem && (
                <div className="rounded-xl border border-[#E2E7E8] bg-[#F8FAFA] p-3 text-sm text-[#8D5900]">
                  COD is not available for personalized offer products. Please use online payment.
                </div>
              )}
              <button
                type="submit"
                onClick={handlePlaceOrderClick}
                className={`hidden w-full items-center justify-center rounded-full py-3.5 text-base font-semibold transition md:flex ${placeOrderButtonColors}`}
                disabled={isCheckoutSubmitDisabled}
                aria-busy={placingOrder}
              >
                {placingOrder ? renderPlacingOrderLabel() : renderPlaceOrderButtonContent()}
              </button>
            </form>
        </div>
        {/* Right column: discount input, order summary and place order button */}
        <aside className="h-fit rounded-2xl bg-[#F8FAFA] p-4 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#05090D]">{t('checkout.orderSummary')}</h2>
            <Link href="/cart" className="text-sm font-semibold text-[#05090D] underline">{isArabic ? 'تعديل السلة' : 'Edit cart'}</Link>
          </div>
          <div className="mb-4 space-y-3">
            {cartArray.slice(0, 3).map((item) => (
              <div key={item._cartKey || item._id} className="flex items-center gap-3">
                <img src={item.image || item.images?.[0] || '/placeholder.png'} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#05090D]">{item.name}</p>
                  <p className="text-xs text-[#5E6870]">Qty {item._displayQuantity ?? item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#05090D]">{item._isFreeGift ? 'FREE' : formatMoney(item._lineTotal ?? item._cartPrice ?? item.price ?? 0)}</p>
              </div>
            ))}
            {cartArray.length > 3 ? (
              <button type="button" onClick={() => setShowAllOrderItemsModal(true)} className="text-sm font-semibold text-[#05090D] underline">
                +{cartArray.length - 3} more
              </button>
            ) : null}
          </div>

          {!appliedCoupon ? (
            <form onSubmit={handleApplyCoupon} className="mb-4 flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  if (couponError) setCouponError('');
                }}
                placeholder="Enter coupon"
                className="min-w-0 flex-1 rounded-lg border border-[#E2E7E8] bg-white px-3 py-2 text-sm text-[#05090D] outline-none focus:border-[#05090D]"
              />
              <button
                type="submit"
                disabled={couponLoading || !isCouponAllowedPayment(form.payment)}
                className="shrink-0 rounded-lg border border-[#E2E7E8] bg-white px-3 py-2 text-sm font-semibold text-[#05090D] disabled:opacity-50"
              >
                {couponLoading ? '...' : 'Apply'}
              </button>
            </form>
          ) : null}
          {couponError ? <p className="mb-3 text-xs text-[#B12F39]">{couponError}</p> : null}
          {form.payment && !isCouponAllowedPayment(form.payment) ? (
            <p className="mb-3 text-xs text-[#5E6870]">Coupons work with card or cash on delivery.</p>
          ) : null}

          {/* Price breakdown */}
          <div className="mb-4 space-y-3 border-b border-emerald-100 pb-4">
            <div className="flex min-w-0 items-start justify-between gap-3 text-sm">
              <span className="min-w-0 text-slate-600">{t('checkout.subtotal')}</span>
              <span className="shrink-0 text-end font-medium tabular-nums text-slate-900">{formatMoney(subtotal)}</span>
            </div>

            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex min-w-0 items-start justify-between gap-3 text-sm text-blue-700">
                <span className="min-w-0 break-words">{t('checkout.couponDiscount')} ({appliedCoupon.code})</span>
                <span className="shrink-0 text-end font-semibold tabular-nums">-{formatMoney(couponDiscount)}</span>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{t('checkout.shippingHandling')}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isCustomerPickup
                      ? t('checkout.pickupCollect')
                      : `${summaryDeliveryLabel} · ${t('checkout.deliveredInDays', { days: summaryDeliveryDays })}`}
                  </p>
                  {hasFreeShippingProduct && effectiveShipping === 0 && !isFreeShippingCouponApplied ? (
                    <p className="mt-1 text-xs text-emerald-700">{t('checkout.productFreeShippingNote')}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  {isFreeShippingCouponApplied && shipping > 0 ? (
                    <>
                      <span className="block text-xs text-slate-400 line-through">{formatMoney(shipping)}</span>
                    <span className="font-semibold text-[#217A4D]">{t('cart.free')}</span>
                    </>
                  ) : (
                    <span className={`font-semibold ${effectiveShipping === 0 ? 'text-[#217A4D]' : 'text-[#05090D]'}`}>
                      {effectiveShipping === 0 ? t('cart.free') : formatMoney(effectiveShipping)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {codFee > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{t('checkout.codFee')}</span>
                <span className="font-semibold text-slate-900">{formatMoney(codFee)}</span>
              </div>
            ) : null}

            {isFreeShippingCouponApplied && shippingDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-700">
                <span>{t('checkout.freeShippingCoupon')} ({appliedCoupon.code})</span>
                <span className="font-semibold">-{formatMoney(shippingDiscount)}</span>
              </div>
            )}

            {storefrontWalletEnabled && walletRedeemAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-amber-800">
                <span>{t('checkout.walletApplied')}</span>
                <span className="font-semibold">-{formatMoney(walletRedeemAmount)}</span>
              </div>
            )}
          </div>

          {appliedCoupon && (couponDiscount > 0 || isFreeShippingCouponApplied) && (
            <div className="mb-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">{t('checkout.couponApplied')}</span>
                <span className="font-semibold text-slate-900">{appliedCoupon.code}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{t('checkout.youSave')}</span>
                  <span className="font-semibold text-emerald-700">{formatMoney(totalSavings)}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setAppliedCoupon(null);
                  setCoupon('');
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                {t('checkout.removeCoupon')}
              </button>
            </div>
          )}

            <div className="mb-1 rounded-xl bg-[#F8FAFA] px-3 py-3">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-base font-bold text-[#05090D]">{t('checkout.totalToPay')}</span>
              <span className="text-[clamp(18px,4.5vw,24px)] font-bold tabular-nums text-[#05090D]">{formatMoney(totalAfterWallet)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('checkout.inclVat')}</p>
          </div>
          {sidebarPayError ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 shadow-sm"
            >
              {sidebarPayError}
            </p>
          ) : isLoggedInAreaMissing || isLoggedInDistrictMissing ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {isLoggedInDistrictMissing ? t('checkout.selectDistrict') : t('checkout.selectAreaRequired')}
            </p>
          ) : null}
          <button
            type="submit"
            form="checkout-form"
            onClick={handlePlaceOrderClick}
            className="hidden"
            disabled={isCheckoutSubmitDisabled}
            aria-busy={placingOrder}
          >
            {placingOrder ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-[#05090D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                {renderPlacingOrderLabel()}
              </span>
            ) : (
              renderPlaceOrderButtonContent()
            )}
            {placingOrder && (
              <span className="absolute left-0 top-0 h-full w-full overflow-hidden rounded opacity-20">
                <span className="block h-full w-1/3 bg-white animate-[shimmer_1.2s_ease_infinite]" />
              </span>
            )}
          </button>
        </aside>
      </div>

      {/* Sticky Footer - Only Total and Place Order on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E7E8] bg-white p-3 md:hidden">
        <div className="mx-auto max-w-6xl">
          {sidebarPayError ? (
            <p
              role="alert"
              className="mb-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 shadow-sm"
            >
              {sidebarPayError}
            </p>
          ) : isLoggedInAreaMissing || isLoggedInDistrictMissing ? (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {isLoggedInDistrictMissing ? t('checkout.selectDistrict') : t('checkout.selectAreaRequired')}
            </p>
          ) : null}
          <button
            type="submit"
            form="checkout-form"
            onClick={handlePlaceOrderClick}
            className={`relative flex w-full items-center justify-between rounded-full px-6 py-4 text-base font-semibold transition ${mobilePlaceOrderButtonColors} ${placingOrder ? 'animate-bounce' : ''}`}
            disabled={isCheckoutSubmitDisabled}
            aria-busy={placingOrder}
          >
            <span className="text-lg font-bold">{formatMoney(totalAfterWallet)}</span>
            {placingOrder ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-[#05090D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                {renderPlacingOrderLabel()}
              </span>
            ) : (
              <span className="flex items-center justify-end min-w-0">
                {renderPlaceOrderButtonContent()}
              </span>
            )}
            {placingOrder && (
              <span className="absolute left-0 top-0 h-full w-full overflow-hidden rounded opacity-20">
                <span className="block h-full w-1/3 bg-white animate-[shimmer_1.2s_ease_infinite]" />
              </span>
            )}
          </button>
        </div>
      </div>
      </div>
      </div>
      </div>

      <CheckoutValidationAlert
        open={validationAlertOpen}
        issues={validationIssues}
        title={isArabic ? 'يرجى إكمال هذه الحقول' : 'Please complete these fields'}
        hint={isArabic ? 'اضغط على الحقل للانتقال إليه' : 'Tap a field below to go there'}
        confirmLabel={isArabic ? 'حسناً' : 'OK'}
        onClose={() => setValidationAlertOpen(false)}
        onIssueClick={handleValidationIssueClick}
      />

      {removeLastItemConfirm ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label={t('checkout.removeLastItemCancel')}
            onClick={() => setRemoveLastItemConfirm(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-remove-last-item-title"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <h3 id="checkout-remove-last-item-title" className="text-lg font-semibold text-slate-900">
              {t('checkout.removeLastItemTitle')}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t('checkout.removeLastItemMessage')}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRemoveLastItemConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t('checkout.removeLastItemCancel')}
              </button>
              <button
                type="button"
                onClick={confirmRemoveLastItem}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {t('checkout.removeLastItemConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAllOrderItemsModal ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close all order items"
            onClick={() => setShowAllOrderItemsModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-all-items-title"
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h3 id="checkout-all-items-title" className="text-lg font-semibold text-slate-900">
                {t('checkout.yourOrder')} ({cartArray.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAllOrderItemsModal(false)}
                className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {cartArray.map(renderCheckoutOrderItem)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AddressModal 
        open={showAddressModal} 
        allowGuest={!user}
        setShowAddressModal={(show) => {
          setShowAddressModal(show);
          if (!show) setEditingAddressId(null);
        }} 
        onAddressAdded={(addr) => {
          const saved = !user ? upsertGuestAddress(guestAddresses, addr).address : addr;
          if (!user) {
            const next = upsertGuestAddress(guestAddresses, addr);
            setGuestAddresses(next.addresses);
            writeGuestCheckoutState({
              addresses: next.addresses,
              selectedId: next.address._id,
              draft: formToGuestDraft(next.address),
            });
          }
          setForm((f) => ({
            ...f,
            addressId: saved._id,
            name: saved.name || f.name,
            email: saved.email || f.email,
            phone: cleanDigits(saved.phone) || cleanDigits(user?.phoneNumber || user?.phone) || f.phone,
            phoneCode: saved.phoneCode || UAE_PHONE_CODE,
            alternatePhone: cleanDigits(saved.alternatePhone),
            alternatePhoneCode: saved.alternatePhoneCode || UAE_PHONE_CODE,
            street: saved.street || f.street,
            buildingOrVilla: saved.buildingOrVilla || f.buildingOrVilla,
            streetName: saved.streetName || saved.street || f.streetName,
            apartmentOrFloor: saved.apartmentOrFloor || f.apartmentOrFloor,
            city: saved.city || f.city,
            state: saved.state || f.state,
            district: saved.district || f.district,
            country: saved.country || f.country,
            pincode: pickValidPincode(saved.zip, saved.pincode, f.pincode),
          }));
          if (user) dispatch(fetchAddress({ getToken }));
          setEditingAddressId(null);
        }}
        initialAddress={editingAddressId ? checkoutAddressList.find(a => a._id === editingAddressId) : null}
        isEdit={!!editingAddressId}
        onAddressUpdated={(updated) => {
          if (!user && updated) {
            const next = upsertGuestAddress(guestAddresses, updated);
            setGuestAddresses(next.addresses);
            writeGuestCheckoutState({
              addresses: next.addresses,
              selectedId: next.address._id,
              draft: formToGuestDraft(next.address),
            });
            setForm((f) => ({
              ...f,
              addressId: next.address._id,
              name: next.address.name || f.name,
              email: next.address.email || f.email,
              phone: cleanDigits(next.address.phone) || f.phone,
              phoneCode: next.address.phoneCode || f.phoneCode || UAE_PHONE_CODE,
              street: next.address.street || f.street,
              buildingOrVilla: next.address.buildingOrVilla || f.buildingOrVilla,
              streetName: next.address.streetName || next.address.street || f.streetName,
              apartmentOrFloor: next.address.apartmentOrFloor || f.apartmentOrFloor,
              city: next.address.city || f.city,
              state: next.address.state || f.state,
              district: next.address.district || f.district,
              country: next.address.country || f.country,
              pincode: pickValidPincode(next.address.zip, next.address.pincode, f.pincode),
            }));
          } else if (user) {
            dispatch(fetchAddress({ getToken }));
          }
          setEditingAddressId(null);
        }}
        onAddressDeleted={(addressId) => {
          if (!user) {
            const next = removeGuestAddress(guestAddresses, addressId);
            setGuestAddresses(next);
            const nextSelected = next[0] || null;
            writeGuestCheckoutState({
              addresses: next,
              selectedId: nextSelected?._id || '',
              draft: nextSelected ? formToGuestDraft(nextSelected) : formToGuestDraft(form),
            });
            if (form.addressId === addressId) {
              if (nextSelected) {
                setForm((f) => ({
                  ...f,
                  addressId: nextSelected._id,
                  name: nextSelected.name || f.name,
                  email: nextSelected.email || f.email,
                  phone: cleanDigits(nextSelected.phone) || f.phone,
                  phoneCode: nextSelected.phoneCode || f.phoneCode || UAE_PHONE_CODE,
                  street: nextSelected.street || f.street,
                  buildingOrVilla: nextSelected.buildingOrVilla || f.buildingOrVilla,
                  streetName: nextSelected.streetName || nextSelected.street || f.streetName,
                  apartmentOrFloor: nextSelected.apartmentOrFloor || f.apartmentOrFloor,
                  city: nextSelected.city || f.city,
                  state: nextSelected.state || f.state,
                  district: nextSelected.district || f.district,
                  country: nextSelected.country || f.country,
                  pincode: pickValidPincode(nextSelected.zip, nextSelected.pincode, f.pincode),
                }));
              } else {
                setForm((f) => ({ ...f, addressId: '' }));
              }
            }
            return;
          }
          dispatch(fetchAddress({ getToken }));
          if (form.addressId === addressId) {
            setForm((f) => ({ ...f, addressId: '' }));
          }
        }}
        addressList={checkoutAddressList}
        selectedAddressId={form.addressId}
        onSelectAddress={(addressId) => {
          // Find the selected address and populate form with its data
          const selectedAddr = checkoutAddressList.find(a => a._id === addressId);
          if (selectedAddr) {
            setForm(f => {
              const addressPhone = cleanDigits(selectedAddr.phone);
              const userPhone = cleanDigits(user?.phoneNumber || user?.phone);
              const finalPhone = addressPhone || userPhone || f.phone || '';
              const finalPincode = pickValidPincode(selectedAddr.zip, selectedAddr.pincode, f.pincode);

              return { 
                ...f, 
                addressId,
                name: selectedAddr.name || f.name,
                email: selectedAddr.email || f.email,
                phone: finalPhone,
                phoneCode: selectedAddr.phoneCode || UAE_PHONE_CODE,
                alternatePhone: cleanDigits(selectedAddr.alternatePhone),
                alternatePhoneCode: selectedAddr.alternatePhoneCode || UAE_PHONE_CODE,
                street: selectedAddr.street || f.street,
                buildingOrVilla: selectedAddr.buildingOrVilla || f.buildingOrVilla,
                streetName: selectedAddr.streetName || selectedAddr.street || f.streetName,
                apartmentOrFloor: selectedAddr.apartmentOrFloor || f.apartmentOrFloor,
                city: selectedAddr.city || f.city,
                state: selectedAddr.state || f.state,
                district: selectedAddr.district || f.district,
                country: selectedAddr.country || f.country,
                pincode: finalPincode,
              };
            });
          } else {
            setForm(f => ({ ...f, addressId }));
          }
        }}
      />
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
      <PrepaidUpsellModal 
        open={showPrepaidModal}
        orderTotal={upsellOrderTotal}
        discountAmount={upsellOrderTotal * 0.05}
        onClose={completePrepaidUpsell}
        onNoThanks={completePrepaidUpsell}
        onAutoDismiss={completePrepaidUpsell}
        onPayNow={handlePayNowForExistingOrder}
        loading={payingNow}
      />

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setShowCouponModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">{t('checkout.applyCoupon')}</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Coupon Input */}
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <form onSubmit={handleApplyCoupon} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-4 py-3 flex-1 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!isCouponAllowedPayment(form.payment)}
                  className={`font-semibold px-6 py-3 rounded-lg transition whitespace-nowrap w-full sm:w-auto ${
                    !isCouponAllowedPayment(form.payment)
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Apply
                </button>
              </form>
              {form.payment && !isCouponAllowedPayment(form.payment) && (
                <div className="text-xs text-amber-600 mt-2">
                  Coupons are available for Card and Cash on Delivery only.
                </div>
              )}
              {couponError && <div className="text-red-500 text-xs mt-2">{couponError}</div>}
            </div>

            {/* Available Coupons */}
            <div className="p-4 sm:p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Available Coupons</h4>
              
              {availableCoupons.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No coupons available at the moment</p>
              ) : (
                availableCoupons.map((cpn) => {
                  // Determine eligibility
                  // Convert cartItems object to array
                  const cartItemsArray = Object.entries(cartItems || {})
                    .map(([id, value]) => ({
                      productId: getCartEntryProductId(id, value),
                      quantity: getCartEntryQuantity(value),
                      variantId: typeof value === 'object' ? value?.variantId : undefined,
                      isFreeGift: isFreeGiftEntry(value),
                    }))
                    .filter((item) => item.quantity > 0 && item.productId && !item.isFreeGift);
                  
                  const itemsTotal = cartItemsArray.reduce((sum, item) => {
                    const product = products.find((p) => p._id === item.productId);
                    if (!product) return sum;
                    const cartValue = cartItems[Object.keys(cartItems).find((key) => getCartEntryProductId(key, cartItems[key]) === item.productId)];
                    const pricing = resolveCartLinePricing(product, cartValue, item.quantity);
                    return sum + pricing.lineTotal;
                  }, 0);
                  
                  const cartProductIds = cartItemsArray.map(item => item.productId);
                  
                  const canUseCoupons = isCouponAllowedPayment(form.payment);
                  let isEligible = true;
                  let ineligibleReason = '';

                  if (!canUseCoupons) {
                    isEligible = false;
                    ineligibleReason = 'Only for Card or Cash on Delivery';
                  }
                  
                  // Check if expired
                  if (cpn.isExpired) {
                    isEligible = false;
                    ineligibleReason = 'Coupon expired';
                  }
                  // Check if exhausted
                  else if (cpn.isExhausted) {
                    isEligible = false;
                    ineligibleReason = 'Usage limit reached';
                  }
                  // Check minimum order value
                  else if (itemsTotal < cpn.minOrderValue) {
                    isEligible = false;
                    ineligibleReason = `Min order AED${cpn.minOrderValue} required`;
                  }
                  // Check if product-specific
                  else if (cpn.specificProducts?.length > 0) {
                    const hasEligibleProduct = cpn.specificProducts.some(pid => cartProductIds.includes(pid));
                    if (!hasEligibleProduct) {
                      isEligible = false;
                      ineligibleReason = 'Not applicable for your products';
                    }
                  }
                  
                  const badgeColors = {
                    green: 'bg-green-100 text-green-700',
                    orange: 'bg-orange-100 text-orange-700',
                    purple: 'bg-purple-100 text-purple-700',
                    blue: 'bg-blue-100 text-blue-700',
                  };
                  const badgeClass = badgeColors[cpn.badgeColor] || badgeColors.green;
                  
                  return (
                    <div
                      key={cpn._id}
                      className={`border border-dashed rounded-lg p-4 mb-3 transition ${
                        isEligible 
                          ? 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100' 
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`${badgeClass} font-bold text-xs px-2 py-1 rounded`}>
                            {cpn.code}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900 block">{cpn.title}</span>
                            {!isEligible && <span className="text-xs text-red-600 font-medium">{ineligibleReason}</span>}
                          </div>
                        </div>
                        {isEligible ? (
                          <button
                            type="button"
                            disabled={couponLoading}
                            onClick={() => handleApplyCoupon({ preventDefault: () => {} }, cpn.code)}
                            className="ml-2 whitespace-nowrap px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {couponLoading ? 'Applying...' : t('checkout.useCode')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="ml-2 whitespace-nowrap px-3 py-1.5 rounded-md bg-gray-200 text-gray-500 text-xs font-semibold cursor-not-allowed"
                          >
                            {t('checkout.notEligible')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{cpn.description}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
      {showPickupMap ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPickupMap(false)}>
          <div
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('checkout.pickupAddressLabel')}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{CUSTOMER_PICKUP_ADDRESS.line}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPickupMap(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('checkout.closeMap')}
              </button>
            </div>
            <iframe
              title={CUSTOMER_PICKUP_ADDRESS.line}
              src={customerPickupMapEmbedUrl()}
              className="h-[42dvh] min-h-[180px] w-full border-0 sm:h-[360px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="flex justify-end px-5 py-3">
              <a
                href={customerPickupMapLink()}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-amber-800 hover:underline"
              >
                {t('checkout.viewLocation')}
              </a>
            </div>
          </div>
        </div>
      ) : null}
      <Script src="https://checkout.tabby.ai/tabby-card.js" onLoad={() => setTabbyCardLoaded(true)} />
    </>
  );
}
