"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { BellRing, Mail, Plus, Save, Search, X } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { MAX_CUSTOM_LOW_STOCK_PRODUCTS } from "@/lib/lowStockAlertConstants";

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24];
const PRODUCT_PAGE = 80;
const PRODUCT_SOURCES = [
  { id: "search", label: "Search" },
  { id: "skus", label: "SKU list" },
  { id: "all", label: "All products" },
  { id: "category", label: "Category" },
  { id: "brand", label: "Brand" },
  { id: "latest", label: "Latest" },
  { id: "tag", label: "Tags" },
];

function parseSkuList(value) {
  return [...new Set(
    String(value || "")
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

const DEFAULT_SETTINGS = {
  enabled: true,
  threshold: 20,
  intervalHours: 3,
  recipients: ["merchandise@althakeel.com"],
  customEnabled: false,
  customThreshold: 20,
  customIntervalHours: 3,
  customRecipients: ["merchandise@althakeel.com"],
  customProducts: [],
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/15";

function productThumb(product = {}) {
  return (
    product.image
    || product.images?.[0]
    || product.thumbnail
    || ""
  );
}

function getProductId(product) {
  return String(product?._id || product?.id || product?.productId || "").trim();
}

function flattenCategoryOptions(categories = []) {
  const rows = [];
  const seen = new Set();
  const walk = (items, depth) => {
    for (const item of items || []) {
      const id = String(item?._id || item?.id || "").trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        rows.push({
          id,
          label: `${depth ? "— ".repeat(depth) : ""}${item?.name || "Category"}`,
        });
      }
      if (Array.isArray(item?.children) && item.children.length) {
        walk(item.children, id ? depth + 1 : depth);
      }
    }
  };
  const list = Array.isArray(categories) ? categories : [];
  const roots = list.filter((item) => !item?.parentId);
  walk(roots.length ? roots : list, 0);
  return rows;
}

function toWatchedProduct(product) {
  const productId = getProductId(product);
  if (!productId) return null;
  return {
    productId,
    name: String(product.name || "Unnamed product").trim(),
    sku: String(product.sku || "").trim(),
    image: productThumb(product),
  };
}

export default function LowStockAlertSettings() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState("");
  const [loadError, setLoadError] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [skuListText, setSkuListText] = useState("");
  const [productSource, setProductSource] = useState("search");
  const [pickerCategory, setPickerCategory] = useState("");
  const [pickerBrand, setPickerBrand] = useState("");
  const [pickerTags, setPickerTags] = useState([]);
  const [pickerTagInput, setPickerTagInput] = useState("");
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [addingSkus, setAddingSkus] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Please sign in again to load these settings.");
        const { data } = await axios.get("/api/store/settings/low-stock-alerts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) {
          setLoadError("");
          const next = {
            ...DEFAULT_SETTINGS,
            ...data.settings,
            recipients: Array.isArray(data.settings?.recipients)
              ? data.settings.recipients
              : DEFAULT_SETTINGS.recipients,
            customRecipients: Array.isArray(data.settings?.customRecipients)
              ? data.settings.customRecipients
              : DEFAULT_SETTINGS.customRecipients,
            customProducts: Array.isArray(data.settings?.customProducts)
              ? data.settings.customProducts
              : [],
          };
          setSettings({
            ...next,
            recipientsText: next.recipients.join(", "),
            customRecipientsText: next.customRecipients.join(", "),
          });
        }
      } catch (error) {
        if (active) {
          const message = error?.response?.data?.error || error.message || "Could not load low-stock alert settings.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [categoryRes, brandRes] = await Promise.all([
          fetch("/api/categories", { headers }),
          fetch("/api/store/product?page=1&manage=true&distinct=brands", { headers }),
        ]);
        const categoryData = await categoryRes.json().catch(() => ({}));
        const brandData = await brandRes.json().catch(() => ({}));
        if (cancelled) return;
        setCatalogCategories(flattenCategoryOptions(categoryData.categories));
        setCatalogBrands(Array.isArray(brandData.brands) ? brandData.brands : []);
      } catch (error) {
        console.error("Error loading product filters:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const buildProductQuery = (source, { forSelectAll = false } = {}) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("manage", "true");
    const query = productQuery.trim();
    const browseLimit = forSelectAll ? String(PRODUCT_PAGE) : "48";

    if (source === "search") {
      if (!query) return null;
      // Comma-separated SKU paste uses Add SKUs instead of live search.
      if (parseSkuList(query).length > 1) return null;
      params.set("search", query);
      params.set("limit", forSelectAll ? String(PRODUCT_PAGE) : "20");
    } else if (source === "skus") {
      return null;
    } else if (source === "all") {
      params.set("sort", "name");
      params.set("limit", browseLimit);
    } else if (source === "latest") {
      params.set("sort", "newest");
      params.set("limit", browseLimit);
    } else if (source === "category") {
      if (!pickerCategory) return null;
      params.set("category", pickerCategory);
      params.set("limit", browseLimit);
    } else if (source === "brand") {
      if (!pickerBrand) return null;
      params.set("brand", pickerBrand);
      params.set("limit", browseLimit);
    } else if (source === "tag") {
      if (!pickerTags.length) return null;
      params.set("tags", pickerTags.join(","));
      params.set("limit", browseLimit);
    } else {
      return null;
    }

    return params;
  };

  useEffect(() => {
    const params = buildProductQuery(productSource);
    if (!params) {
      setProductResults([]);
      setSearchingProducts(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const token = await getToken();
        const { data } = await axios.get(`/api/store/product?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setProductResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        setProductResults([]);
      } finally {
        setSearchingProducts(false);
      }
    }, productSource === "search" ? 300 : 0);

    return () => clearTimeout(timer);
    // buildProductQuery reads the current picker fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery, productSource, pickerCategory, pickerBrand, pickerTags, getToken]);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const parseEmails = (text, fallback = []) => {
    const list = String(text ?? "")
      .split(/[,\n;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    return list.length ? list : fallback;
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to save these settings.");
      const payload = {
        enabled: settings.enabled,
        threshold: Number(settings.threshold),
        intervalHours: Number(settings.intervalHours),
        recipients: parseEmails(settings.recipientsText, settings.recipients),
        customEnabled: settings.customEnabled,
        customThreshold: Number(settings.customThreshold),
        customIntervalHours: Number(settings.customIntervalHours),
        customRecipients: parseEmails(settings.customRecipientsText, settings.customRecipients),
        customProducts: settings.customProducts || [],
      };
      const { data } = await axios.patch("/api/store/settings/low-stock-alerts", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings({
        ...data.settings,
        recipientsText: data.settings.recipients.join(", "),
        customRecipientsText: data.settings.customRecipients.join(", "),
      });
      toast.success(data.message || "Stock alert settings saved.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Could not save stock alert settings.");
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async (action) => {
    setSendingNow(action);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to send the alert.");
      const payload = { action };
      if (action === "sendTest" || action === "sendTestCustom") {
        payload.recipients = parseEmails(settings.recipientsText, settings.recipients);
        payload.customRecipients = parseEmails(
          settings.customRecipientsText,
          settings.customRecipients,
        );
      }
      const { data } = await axios.post(
        "/api/store/settings/low-stock-alerts",
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data?.success) {
        toast.success(data.message || "Stock alert sent.");
      } else {
        toast.error(data?.message || "Alert was not sent.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Could not send stock alert.");
    } finally {
      setSendingNow("");
    }
  };

  const addCustomProducts = (products) => {
    const incoming = (products || []).map(toWatchedProduct).filter(Boolean);
    if (!incoming.length) return;

    setSettings((current) => {
      const existing = current.customProducts || [];
      const seen = new Set(existing.map((row) => row.productId));
      const next = [...existing];
      for (const product of incoming) {
        if (seen.has(product.productId)) continue;
        if (next.length >= MAX_CUSTOM_LOW_STOCK_PRODUCTS) {
          toast.error(`You can watch up to ${MAX_CUSTOM_LOW_STOCK_PRODUCTS} custom products.`);
          break;
        }
        seen.add(product.productId);
        next.push(product);
      }
      return next.length === existing.length ? current : { ...current, customProducts: next };
    });
  };

  const addCustomProduct = (product) => {
    addCustomProducts([product]);
    if (productSource === "search") {
      setProductQuery("");
      setProductResults([]);
    }
  };

  const addProductsBySkuList = async (rawSkus) => {
    const skus = parseSkuList(rawSkus).slice(0, MAX_CUSTOM_LOW_STOCK_PRODUCTS);
    if (!skus.length) {
      toast.error("Enter one or more SKUs separated by commas.");
      return;
    }

    setAddingSkus(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const { data } = await axios.post(
        "/api/store/product/resolve-skus",
        { skus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const found = Array.isArray(data?.products) ? data.products : [];
      const missing = Array.isArray(data?.missing) ? data.missing : [];
      if (found.length) {
        addCustomProducts(found);
        toast.success(`Added ${found.length} product${found.length === 1 ? "" : "s"} by SKU.`);
        setSkuListText("");
        if (productSource === "search" && productQuery.includes(",")) {
          setProductQuery("");
          setProductResults([]);
        }
      }
      if (missing.length) {
        toast.error(
          missing.length <= 5
            ? `SKU not found: ${missing.join(", ")}`
            : `${missing.length} SKUs not found (e.g. ${missing.slice(0, 3).join(", ")}…)`,
        );
      } else if (!found.length) {
        toast.error("No products match those SKUs.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Could not add products by SKU.");
    } finally {
      setAddingSkus(false);
    }
  };

  const removeCustomProduct = (productId) => {
    setSettings((current) => ({
      ...current,
      customProducts: (current.customProducts || []).filter((row) => row.productId !== productId),
    }));
  };

  const addPickerTag = (raw) => {
    const parts = String(raw || "").split(/[,\n،]/).map((tag) => tag.trim()).filter(Boolean);
    if (!parts.length) return;
    setPickerTags((prev) => {
      const next = [...prev];
      parts.forEach((tag) => {
        if (!next.some((item) => item.toLowerCase() === tag.toLowerCase())) next.push(tag);
      });
      return next.slice(0, 40);
    });
    setPickerTagInput("");
  };

  const selectAllProducts = async () => {
    const params = buildProductQuery(productSource, { forSelectAll: true });
    if (!params) return;
    setSelectingAll(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const products = [];
      let total = 0;
      let page = 1;
      while (products.length < MAX_CUSTOM_LOW_STOCK_PRODUCTS) {
        params.set("page", String(page));
        params.set("limit", String(PRODUCT_PAGE));
        const res = await fetch(`/api/store/product?${params.toString()}`, { headers });
        const data = await res.json();
        const batch = Array.isArray(data.products) ? data.products : [];
        total = Number(data?.pagination?.total || 0);
        if (!batch.length) break;
        products.push(...batch);
        if (products.length >= total || batch.length < PRODUCT_PAGE) break;
        page += 1;
      }
      const selected = products.slice(0, MAX_CUSTOM_LOW_STOCK_PRODUCTS);
      addCustomProducts(selected);
      if (!selected.length) {
        toast.error("No products matched");
      } else if (total > selected.length) {
        toast.success(`Added the first ${selected.length}. Max is ${MAX_CUSTOM_LOW_STOCK_PRODUCTS} watched products.`);
      }
    } catch (error) {
      console.error("Error selecting products:", error);
      toast.error("Failed to select products");
    } finally {
      setSelectingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading stock alert settings...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">Could not load the saved alert settings.</p>
        <p className="mt-1 text-sm text-slate-600">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Reload settings
        </button>
      </div>
    );
  }

  const recipientText = settings.recipientsText ?? settings.recipients.join(", ");
  const customRecipientText = settings.customRecipientsText ?? settings.customRecipients.join(", ");
  const customProducts = settings.customProducts || [];
  const canBrowse = Boolean(buildProductQuery(productSource));

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <BellRing size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Option 1</p>
            <h3 className="text-base font-semibold text-slate-900">Catalog low-stock alerts</h3>
            <p className="mt-1 text-sm text-slate-500">
              Emails when any product or variant in the catalog is below the threshold (including 0 / out of stock).
            </p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
          <span>
            <span className="block text-sm font-medium text-slate-800">Enable catalog email alerts</span>
            <span className="mt-0.5 block text-xs text-slate-500">Production checks inventory every hour on Vercel cron.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => updateSetting("enabled", event.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Low-stock threshold (units)</span>
            <input
              className={inputClass}
              type="number"
              min="1"
              max="100000"
              step="1"
              value={settings.threshold}
              onChange={(event) => updateSetting("threshold", event.target.value)}
              required
            />
            <span className="text-xs text-slate-500">Alert when available stock is below this number.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Repeat interval</span>
            <select
              className={inputClass}
              value={settings.intervalHours}
              onChange={(event) => updateSetting("intervalHours", Number(event.target.value))}
            >
              {INTERVAL_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  Every {hours} hour{hours === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">Alerts are sent at the next scheduled check after each interval.</span>
          </label>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Catalog alert recipient emails</span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={recipientText}
            onChange={(event) => updateSetting("recipientsText", event.target.value)}
            placeholder="merchandise@althakeel.com, admin@example.com"
            required
          />
          <span className="text-xs text-slate-500">
            Separate addresses with commas, semicolons, or new lines.
          </span>
        </label>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => sendNow("sendTest")}
            disabled={Boolean(sendingNow) || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail size={16} />
            {sendingNow === "sendTest" ? "Sending test..." : "Send test email"}
          </button>
          <button
            type="button"
            onClick={() => sendNow("sendNow")}
            disabled={Boolean(sendingNow) || saving || !settings.enabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail size={16} />
            {sendingNow === "sendNow" ? "Sending..." : "Send catalog alert now"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Plus size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Option 2</p>
            <h3 className="text-base font-semibold text-slate-900">Custom product stock alerts</h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose products by SKU, brand, category, tags, or search. Only those products are checked, and emails go to a separate recipient list.
            </p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3.5">
          <span>
            <span className="block text-sm font-medium text-slate-800">Enable custom product alerts</span>
            <span className="mt-0.5 block text-xs text-slate-500">Separate from the full-catalog alert above.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.customEnabled}
            onChange={(event) => updateSetting("customEnabled", event.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Custom threshold (units)</span>
            <input
              className={inputClass}
              type="number"
              min="1"
              max="100000"
              step="1"
              value={settings.customThreshold}
              onChange={(event) => updateSetting("customThreshold", event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Custom repeat interval</span>
            <select
              className={inputClass}
              value={settings.customIntervalHours}
              onChange={(event) => updateSetting("customIntervalHours", Number(event.target.value))}
            >
              {INTERVAL_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  Every {hours} hour{hours === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Custom alert recipient emails</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={customRecipientText}
            onChange={(event) => updateSetting("customRecipientsText", event.target.value)}
            placeholder="buyer@example.com, ops@example.com"
            required
          />
          <span className="text-xs text-slate-500">
            Only these emails get the watched-product alert — separate from catalog recipients.
          </span>
        </label>

        <div className="mt-5">
          <span className="text-sm font-medium text-slate-700">Watched products</span>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRODUCT_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setProductSource(source.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  productSource === source.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>

          {productSource === "search" ? (
            <div className="mt-2 space-y-2">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} pl-9`}
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Search by name or SKU — or paste several SKUs with commas"
                />
              </div>
              {parseSkuList(productQuery).length > 1 ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {parseSkuList(productQuery).length} SKUs detected — add them all at once.
                  </p>
                  <button
                    type="button"
                    onClick={() => addProductsBySkuList(productQuery)}
                    disabled={addingSkus}
                    className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addingSkus ? "Adding…" : "Add SKUs"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {productSource === "skus" ? (
            <div className="mt-2 space-y-2">
              <textarea
                className={`${inputClass} min-h-24 resize-y font-mono text-xs`}
                value={skuListText}
                onChange={(event) => setSkuListText(event.target.value)}
                placeholder="Paste SKUs separated by commas, e.g. SKU001, SKU002, SKU003"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Separate with commas (or new lines). Up to {MAX_CUSTOM_LOW_STOCK_PRODUCTS} products.
                </p>
                <button
                  type="button"
                  onClick={() => addProductsBySkuList(skuListText)}
                  disabled={addingSkus || !parseSkuList(skuListText).length}
                  className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingSkus ? "Adding…" : "Add SKUs"}
                </button>
              </div>
            </div>
          ) : null}

          {productSource === "category" ? (
            <select
              value={pickerCategory}
              onChange={(event) => setPickerCategory(event.target.value)}
              className={`${inputClass} mt-2`}
            >
              <option value="">Choose a category...</option>
              {catalogCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          ) : null}

          {productSource === "brand" ? (
            <select
              value={pickerBrand}
              onChange={(event) => setPickerBrand(event.target.value)}
              className={`${inputClass} mt-2`}
            >
              <option value="">Choose a brand...</option>
              {catalogBrands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          ) : null}

          {productSource === "tag" ? (
            <div className="mt-2 space-y-2">
              {pickerTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {pickerTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPickerTags((prev) => prev.filter((item) => item !== tag))}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              ) : null}
              <input
                type="text"
                value={pickerTagInput}
                onChange={(event) => setPickerTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addPickerTag(pickerTagInput);
                  }
                }}
                onBlur={() => addPickerTag(pickerTagInput)}
                placeholder="Type a tag, then press Enter"
                className={inputClass}
              />
            </div>
          ) : null}

          {productSource !== "skus" ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {productSource === "all"
                ? "Products in the catalog."
                : productSource === "latest"
                  ? "Newest products first."
                  : "Add one by one, or select all matches (up to 250)."}
            </p>
            <button
              type="button"
              onClick={selectAllProducts}
              disabled={selectingAll || searchingProducts || !canBrowse}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectingAll ? "Selecting..." : "Select all"}
            </button>
          </div>
          ) : null}

          {productSource !== "skus" ? (
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {productSource === "search" && !productQuery.trim() ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Type a product name or SKU to search</p>
            ) : productSource === "search" && parseSkuList(productQuery).length > 1 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">
                Use Add SKUs above to add all comma-separated SKUs at once
              </p>
            ) : productSource === "category" && !pickerCategory ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Choose a category</p>
            ) : productSource === "brand" && !pickerBrand ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Choose a brand</p>
            ) : productSource === "tag" && pickerTags.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Add a tag to see products</p>
            ) : searchingProducts ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Searching…</p>
            ) : productResults.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No products found</p>
            ) : (
              productResults.map((product) => {
                const id = getProductId(product);
                const already = customProducts.some((row) => row.productId === id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={already}
                    onClick={() => addCustomProduct(product)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {productThumb(product) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={productThumb(product)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">N/A</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{product.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {[product.sku, product.brand].filter(Boolean).join(" · ") || "No SKU"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-indigo-700">{already ? "Added" : "Add"}</span>
                  </button>
                );
              })
            )}
          </div>
          ) : null}

          {customProducts.length ? (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {customProducts.map((product) => (
                <li
                  key={product.productId}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                >
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xs text-slate-400">N/A</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{product.name || "Product"}</span>
                    <span className="block truncate text-xs text-slate-500">{product.sku || product.productId}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomProduct(product.productId)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label="Remove product"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No watched products yet. Search or filter and add products above.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {customProducts.length} / {MAX_CUSTOM_LOW_STOCK_PRODUCTS} products selected.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => sendNow("sendTestCustom")}
            disabled={Boolean(sendingNow) || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail size={16} />
            {sendingNow === "sendTestCustom" ? "Sending test..." : "Send test email"}
          </button>
          <button
            type="button"
            onClick={() => sendNow("sendNowCustom")}
            disabled={Boolean(sendingNow) || saving || !settings.customEnabled || customProducts.length < 1}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail size={16} />
            {sendingNow === "sendNowCustom" ? "Sending..." : "Send custom alert now"}
          </button>
        </div>
      </section>

      <div className="flex justify-end rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <button
          type="submit"
          disabled={saving || Boolean(sendingNow)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save alert settings"}
        </button>
      </div>
    </form>
  );
}
