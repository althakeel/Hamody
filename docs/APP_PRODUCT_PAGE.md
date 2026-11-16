# HAMODY product page

**Audience:** Android / Flutter / storefront  
**Last updated:** 9 November 2026  
**Website:** `https://www.hamody.com/product/{slug}`  
**API root:** `https://www.hamody.com/api`  
**Web source:** `app/(public)/product/[slug]/page.jsx`, `components/ProductDetails.jsx`

This is the **full product page** document: what to load, what to draw, prices, gallery, variants / bundles, add to cart, Notify Me, reviews, related products, and badges.

Deeper splits (keep using these when you need more detail):

| Topic | Doc |
|-------|-----|
| Buy box, variant types, app discount, add to cart body | [APP_PRODUCT.md](./APP_PRODUCT.md) |
| Every HTTP call (Notify Me, reviews, wishlist, FBT) | [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md) |
| Image + delivery badges | [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md) |
| Share sheet | [APP_PRODUCT_SHARE.md](./APP_PRODUCT_SHARE.md) |
| Product cards (related / FBT rows) | [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md) |
| Checkout after cart | [APP_CHECKOUT.md](./APP_CHECKOUT.md) |

Send `Accept-Language: en` or `ar`. Prices stay numbers. Draw `https://www.hamody.com/currency/aed-dirham.png` next to the number. Do **not** print the letters `AED`.

Do not scrape the HTML page. Do not call `/api/store/product*`.

---

## 1. Page map (what the customer sees)

| Zone | Content |
|------|---------|
| Gallery | Product images / video; image badges on the photo; share |
| Buy box | Title, brand link, sale + compare price, % off, delivery time badge, variant/bundle pickers, qty, **Add to cart** or **Notify Me** |
| Trust / delivery lines | Fast delivery, free shipping, return / replacement when flags say so |
| Product overview | Highlights (description) + Specifications (spec table) |
| Reviews | Stars, list, write review when allowed |
| Frequently bought together | FBT products |
| Related | Same-category product cards |
| Sticky bar (phone) | Add to cart or Notify Me |

---

## 2. Calls on open

| # | When | Method | Path | Auth |
|---|------|--------|------|------|
| 1 | Always | `GET` | `/api/products/by-slug?slug={slug}` | None |
| 2 | After `product._id` | `GET` | `/api/review?productId={id}` | None |
| 3 | After `product._id` | `GET` | `/api/products/{id}/fbt` | None |
| 4 | Breadcrumb | `GET` | `/api/categories` | None |
| 5 | Delivery copy, badges, WhatsApp | `GET` | `/api/store/appearance/sections/public` | None |
| 6 | Delivery fee line | `GET` | `/api/shipping?storeId={product.storeId}` | None |
| 7 | Related row | `GET` | `/api/products?category={categorySlug}&limit=6&paginated=true` | None |
| 8 | Image badges (cache on device) | `GET` | `/api/public/new-tag` | None |
| 9 | Signed in | `POST` | `/api/browse-history` | Bearer |
| 10 | Signed in | `GET` | `/api/wishlist` | Bearer |

`404` on by-slug → product missing or unpublished → not-found screen.  
Guests skip browse history and wishlist.

Optional richer payload: `GET /api/products/page?slug={slug}&lang=en` (full page data; card-oriented lists still use by-slug / products list).

---

## 3. Load the product

```http
GET /api/products/by-slug?slug={slug}&lang=en
```

`lang` optional (`en` / `ar`). A 24-char hex value may be treated as product id.

```json
{
  "product": {
    "_id": "66f0c1a2b3c4d5e6f7081920",
    "name": "Turbo Cordless Leaf Blower",
    "slug": "turbo-cordless-leaf-blower",
    "price": 64,
    "AED": 89,
    "images": ["https://cdn.example.com/blower-1.jpg"],
    "sku": "ST4008",
    "inStock": true,
    "stockQuantity": 12,
    "hasVariants": true,
    "variants": [],
    "attributes": { "variantType": "simple" },
    "brand": "ST1920",
    "storeId": "69cf7453536ace6caa8c3716"
  }
}
```

### Fields the page uses

| Field | Use |
|-------|-----|
| `_id` | Cart, reviews, notify, wishlist, FBT, browse history |
| `slug` | Path `/product/{slug}` |
| `name`, `description`, `shortDescription`, `brand` | Localized copy. Brand opens `/brand/{slug}` |
| `price` | Sale price |
| `AED` / `mrp` | Compare-at — show struck only when higher than sale |
| `images` | Gallery (string URL or `{ "url": "…" }`) |
| `sku` | Default SKU; variant may override |
| `inStock`, `stockQuantity` | Buy box vs Notify Me |
| `hasVariants`, `variants` | Pickers |
| `attributes.variantType` | `simple` · `variants` · `bulk_bundles` · `variant_bundles` |
| `attributes` | Specs / tab titles |
| `hasBulkPricing`, `bulkPricing` | Qty price breaks |
| `imageBadgeIds` | Pin image badges |
| `fastDelivery`, `freeShippingEligible` | Delivery lines |
| `allowReturn`, `allowReplacement` | Policy lines |
| `specTableEnabled`, `specTableColumns`, `specTableRows` | Specs tab |
| `storeId` | Shipping query |
| `category`, `categories` | Breadcrumb + related |
| `aPlusDesktop` / `aPlusMobile` (+ `Ar` / `Images`) | Extra description media — phone prefers mobile set when present |

**400** `{ "error": "Missing slug" }`  
**404** `{ "error": "Product not found" }`

Brand path: lowercase English `brand`, `&` → `and`, strip other symbols, spaces → hyphens (`Toby's` → `/brand/tobys`). Show `brandAr` as label when Arabic is on.

---

## 4. Prices

| Price | Field | When to show |
|-------|-------|--------------|
| Sale | `price` (or selected variant/pack `price`) | Always when &gt; 0 |
| Regular | `AED` / `mrp` (or variant) | Only when higher than sale — strike through |
| % off | `round((regular - sale) / regular * 100)` | When regular &gt; sale |
| App discount | Third number — charged at checkout with app header | See [APP_PRODUCT.md](./APP_PRODUCT.md) § app discount |

Selected variant / pack replaces both sale and compare. If the row has no `price`, fall back to product `price`. Same for `AED`.

---

## 5. Bundle or variant

Read `attributes.variantType` first.

| `variantType` | Kind | Customer picks |
|---------------|------|----------------|
| `simple` (or missing + empty `variants`) | Simple | Nothing |
| `variants` | Variant | Color / size / option |
| `bulk_bundles` | Bundle | Pack size (Buy 1, Buy 2…) |
| `variant_bundles` | Both | Option first, then pack |

Legacy (no `variantType`): row with `options.bundleQty` → bundle; color/size/option without bundle → variant; both → variant+bundle.

### Variant row

```json
{
  "price": 64,
  "AED": 89,
  "sku": "ST4008-BLK",
  "stock": 4,
  "options": { "color": "Black", "size": "M", "image": "https://cdn.example.com/black.jpg" }
}
```

One picker per option key. Skip `bundleQty`, `image`, `imageSlot`, `optionLabel`, `tag`, `bundleTitle` as picker labels.  
`stock` (or `stockQuantity`) &gt; 0 → that choice is buyable.

### Bundle row

```json
{
  "price": 109,
  "sku": "ST4008-B2",
  "stock": 6,
  "options": { "bundleQty": 2, "bundleTitle": "", "imageSlot": 1 }
}
```

Heading: **BUNDLE AND SAVE MORE!** / **وفّر أكثر مع الباقات!**  
Label: `bundleTitle` if set, else Buy 1 / Buy 2 / …

### Variant + bundle

Match the row whose options equal the pick **and** `bundleQty` equals the pack. That row’s `price` is the sale price.

---

## 6. Images

1. `images` in order. URL from string, or `url` / `src` / `path` on objects.  
2. First non-video = main photo. Video: `.mp4` `.webm` `.ogg` `.mov` `.m4v` `.avi` `.mkv`.  
3. Variant/bundle can replace main via `options.image` URL or `options.imageSlot` (1 = first image).  
4. No image → `https://store1920-images.s3.ap-south-1.amazonaws.com/uploads/placeholder.png`.

Share on the photo: [APP_PRODUCT_SHARE.md](./APP_PRODUCT_SHARE.md).

---

## 7. Add to cart

Label: **Add to cart**. Hide when the selected choice is out of stock.  
Simple OOS: `inStock` false or `stockQuantity` 0.

One cart line per product `_id`. Changing variant/pack **replaces** that line.

```http
POST /api/cart
Authorization: Bearer {Firebase ID token}
Content-Type: application/json
```

```json
{
  "cart": {
    "66f0c1a2b3c4d5e6f7081920": {
      "quantity": 1,
      "price": 64,
      "sku": "ST4008",
      "productName": "Turbo Cordless Leaf Blower",
      "variantOptions": {}
    }
  }
}
```

| Product | `price` | `variantOptions` |
|---------|---------|------------------|
| Simple | Product `price` | `{}` |
| Variant | Variant `price` | e.g. `{ "color": "Black" }` |
| Bundle | Pack `price` | `{ "bundleQty": 2 }` |
| Variant + bundle | Matched row `price` | Options + `bundleQty` |

Guests keep the cart on device and send lines on `POST /api/orders`.  
`401` → refresh Firebase token and retry; do not drop the line.

---

## 8. Notify Me (out of stock)

Show when selected variant / product cannot be bought. Hide Add to cart.

```http
POST /api/stock-notify
Content-Type: application/json
```

```json
{
  "productId": "PRODUCT_ID",
  "sku": "SKU-OR-EMPTY",
  "email": "name@example.com",
  "phone": "501234567",
  "phoneCode": "+971"
}
```

Email **or** phone is enough. No login.  
**200** success message → clear form. Do not call `/api/store/notify-list` from the app.

---

## 9. Product overview (under buy box)

Title: **Product Overview**. Quiet text switch (not a heavy pill track):

| Tab | Source |
|-----|--------|
| Highlights (or `attributes.descriptionTabTitle`) | `description` HTML |
| Specifications (or `attributes.specificationTabTitle`) | `specTableRows` when `specTableEnabled` |

Hide the switch when only one source exists. Description: ~7 lines then Read more. Specs: label/value rows, no heavy table chrome. Full spacing: [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md) § Product overview.

---

## 10. Reviews

```http
GET /api/review?productId={productId}
```

Approved only, newest first (max 30). Fields: `rating`, `review`, `images`, `videos`, `customerName`, `helpfulCount`, `createdAt`, `user`.

Can write / submit rules and endpoints: [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md) § Reviews.

---

## 11. FBT and related

| Block | Call |
|-------|------|
| Frequently bought together | `GET /api/products/{id}/fbt` |
| Related | `GET /api/products?category={slug}&limit=6&paginated=true` |

Draw each item with the **product card** rules: [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

---

## 12. Badges (short)

| Badge | Source |
|-------|--------|
| On photo | `GET /api/public/new-tag` + product |
| Delivery time | `timeBadges` from appearance public API |
| Sale % | From sale vs compare |
| App discount | Checkout / app header — see APP_PRODUCT |

Full rules: [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md).

---

## 13. Wishlist & browse history (signed in)

```http
POST /api/browse-history
Authorization: Bearer …
{ "productId": "…" }
```

Wishlist get/add/remove: `/api/wishlist` — see [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md).

---

## 14. Checklist

- [ ] Load by-slug; handle 404  
- [ ] Gallery + badges + share  
- [ ] Title, brand link, sale + struck compare  
- [ ] Variant / bundle pickers from `variantType`  
- [ ] Add to cart with correct `variantOptions`  
- [ ] Notify Me when OOS  
- [ ] Overview: Highlights + Specs  
- [ ] Reviews list  
- [ ] FBT + related cards  
- [ ] Arabic via `Accept-Language` / `lang`  
- [ ] Dirham icon — no “AED” letters  

---

## 15. Related docs index

| Doc | Use when |
|-----|----------|
| [APP_PRODUCT.md](./APP_PRODUCT.md) | Buy box depth, app discount |
| [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md) | Full API table + Notify Me + reviews + layout px |
| [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md) | Badge matching |
| [APP_PRODUCT_SHARE.md](./APP_PRODUCT_SHARE.md) | Share targets |
| [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md) | Card tiles |
| [PRODUCT_CARD_API.md](./PRODUCT_CARD_API.md) | Catalog list API |
| [APP_CHECKOUT.md](./APP_CHECKOUT.md) | After cart |
