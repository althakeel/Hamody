# Store1920 brand page — design and APIs

Last updated: 12 October 2026  
Audience: Android app  
Website: `https://www.store1920.com`  
API root: `https://www.store1920.com/api`  
Web source: `app/(public)/brand/[slug]/page.jsx`, `components/brand/BrandPageView.jsx`

A brand page is `https://www.store1920.com/brand/{slug}`. Example: `/brand/nexso`.

The brands on the store, and the products call, are in [APP_BRANDS_API.md](./APP_BRANDS_API.md).

This is not a category. `/category/brands/nexso` is a category under Brands. `/brand/nexso` matches the product `brand` name. Do not open one when the link is the other.

Send `Accept-Language: en` or `ar`. No login.

Product cards on this page use the same card as the rest of the app: [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md). Phone grid: **2 columns**, **12 px** gap.

---

## 1. APIs

| Piece | Method | Path | Auth |
|---|---|---|---|
| Home logo row | GET | `/api/public/brands` | No |
| Product list and brand header | GET | `/api/public/brand-products?slug={slug}&page=1&limit=100` | No |
| Seller brand list, page text, banners | GET, PATCH | `/api/store/brands` | Store Firebase token |

`GET /api/public/brands` returns every saved brand page, including `image` (the logo). Field list and the home-slider rules are in [APP_BRANDS_API.md](./APP_BRANDS_API.md).

`GET /api/public/brand-products` returns `brand` plus `products`. `brand` has the name, Arabic name, description, logo, and banners. Header stats in section 3 are still computed on the website and are not in that JSON. Use `total` for the product count. Do not call `GET /api/store/brands` from the customer app. That route is the seller dashboard.

---

## 2. Page design

Page background is white. Content width is at most **1400 px**, with **16 px** side padding and **16 px** top padding. Arabic sets the page to RTL.

Top to bottom:

### Breadcrumb

`Home / {brand name}`  
13 px, color `#64748b`. The brand name is `#0f172a`. Gap around the slash is 8 px. Margin under the row is 16 px.

### Banner

Draw it only when at least one banner URL exists. Skip the block when all six banner fields are empty.

| Property | Phone |
|---|---|
| Radius | 16 px |
| Border | 1 px `#e2e8f0` |
| Background | `#f8fafc` |
| Image | contain, centered, aspect **768 / 280** |
| Margin below | 12 px |

Pick the phone image in this order. Use the first URL that is not empty.

| Language | Order |
|---|---|
| English | `bannerMobileEn`, `bannerMobileAr`, `bannerTabletEn`, `bannerTabletAr`, `bannerEn`, `bannerAr` |
| Arabic | `bannerMobileAr`, `bannerMobileEn`, `bannerTabletAr`, `bannerTabletEn`, `bannerAr`, `bannerEn` |

### Hero card

White card, radius 16, border 1 px `#e2e8f0`, padding 12, gap 12 between logo and text. Margin below 16 px.

| Piece | Design |
|---|---|
| Logo | 56 × 56, radius 12, border `#e2e8f0`, background `#f8fafc`, image cropped to fill. Hide the box when `image` is empty or the image fails |
| Eyebrow | `Brand` in English, `الماركة` in Arabic. 10 px, semibold, uppercase, tracking wide, color `#ea580c` |
| Title | Brand name, 20 px, bold, `#0f172a` |
| Product chip | `{count} products available`. Pill, background `#f1f5f9`, text 12 px `#475569` |
| Reviews chip | Only when `reviewCount` > 0. Five stars, filled `#f59e0b`, empty `#cbd5e1`, then `{rating} ({count} reviews)`. Same pill as the product chip |
| Fast shipping chip | Only when `fastDeliveryPercent` > 0. Pill `#fff7ed`, text `#c2410c`, 12 px truck icon. Copy: `Fast shipping on {percent} percent of items` |
| Description | 14 px, line height 24, `#475569`. First 220 characters, then `...` and a `Continue reading` button in `#ea580c`. Arabic description is RTL |

Name and description follow the app language: Arabic fields when the language is Arabic and those fields are not empty, otherwise English.

### Product grid

Same product card as shop. Sort on the website is newest first. The first response is page 1, 100 products. Load the next page when the customer reaches the end of the list.

### Empty state

When `total` is 0: centered card, radius 8, border `#e5e7eb`, padding 64 px vertical. Text `#6b7280`, 18 px: `No products in this category yet.`

### Trust row

Four cells, 2 columns on a phone, gap 8 px, margin top 32 px.

| Cell | English | Arabic |
|---|---|---|
| Shield | Warranty available | from `category.trust.warranty` |
| Truck | Delivery offers available | from `category.trust.freeDelivery` |
| Wallet | Cash on delivery | الدفع عند الاستلام |
| Card | Instalments available | from `category.trust.instalments` |

Each cell: white, radius 16, border `#e2e8f0`, padding 12. Icon box 32 × 32, radius 12, background `#fff7ed`, icon `#ea580c` at 16 px. Label 14 px, medium, `#334155`.

These four lines are fixed. They are not returned by an API.

---

## 3. Header numbers the website computes

The website does not send this object on `GET /api/public/brand-products`. It is computed from published products whose `brand` equals the brand name, ignoring letter case.

| Field | Meaning |
|---|---|
| `productCount` | Published products for that brand, one row per SKU |
| `fastDeliveryPercent` | Whole percent of those products with `fastDelivery` true. `0` hides the chip |
| `reviewCount` | Approved reviews on those products |
| `averageRating` | Average of those reviews, one decimal. `0` when there are no reviews |

Example the page uses internally:

```json
{
  "productCount": 42,
  "fastDeliveryPercent": 18,
  "averageRating": 4.6,
  "reviewCount": 120
}
```

`productCount` matches `total` from the products API. The app can show `{total} products available` from that response. Rating and fast-shipping chips need the numbers above, which the public products JSON does not include.

---

## 4. `GET /api/public/brand-products`

No auth. `Cache-Control` is dynamic. Call it again for each page.

```http
GET /api/public/brand-products?slug=nexso&page=1&limit=100
```

| Query | Rule |
|---|---|
| `slug` | Required. Lowercase brand slug. `NEXSO` and `nexso` both resolve |
| `page` | Default `1`. Values below 1 become 1 |
| `limit` | Default `100`. The server caps this at **100** |

### Slug

The website builds a slug by lowercasing the brand name, turning `&` into `and`, dropping other symbols, and replacing spaces with hyphens.

| Brand name | Path |
|---|---|
| `NEXSO` | `/brand/nexso` |
| `Beauty & Care` | `/brand/beauty-and-care` |

A brand exists when a saved brand page has that slug, or at least one published product has a `brand` that slugifies to it.

### Success `200`

```json
{
  "brand": {
    "slug": "nexso",
    "path": "/brand/nexso",
    "name": "NEXSO",
    "nameAr": "",
    "image": "https://…",
    "description": "",
    "descriptionAr": "",
    "bannerMobileEn": "",
    "bannerMobileAr": ""
  },
  "products": [],
  "total": 42,
  "page": 1,
  "limit": 100
}
```

`brand` is the saved page from section 5. The other banner keys are on that object too. When no seller page was saved, `brand.image` is empty and `brand.name` is the product brand text.

`products` is the published catalog for that brand, newest `createdAt` first. Duplicate SKUs are collapsed to one card. Each product is the storefront product object, including:

| Field | Use |
|---|---|
| `_id` | Product id |
| `slug` | Product path |
| `name`, `nameAr` | Card title |
| `brand` | Brand label |
| `images` | First image is the card photo |
| `price`, `mrp` | Card price |
| `inStock` | Stock state |
| `fastDelivery` | Fast-delivery mark on the card |
| `averageRating`, `ratingCount` | Stars on the card, when reviews exist |

Draw the card from [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

Next page: `page=2` with the same `slug`. Stop when `page * limit` is greater than or equal to `total`, or when `products` comes back empty.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 404 | `{ "error": "Brand not found" }` | No saved page and no published product for that slug |
| 500 | `{ "error": "Failed to load products" }` | Server failure. Keep the products already on screen |

An unknown brand is a not-found screen, not an empty grid.

---

## 5. Brand record the website stores

Sellers edit this at `/store/brands`. The same object is `brand` on `GET /api/public/brand-products`, and each item in `brands` on `GET /api/public/brands`.

```json
{
  "id": "…",
  "slug": "nexso",
  "path": "/brand/nexso",
  "name": "NEXSO",
  "nameAr": "",
  "description": "",
  "descriptionAr": "",
  "image": "https://…",
  "bannerEn": "",
  "bannerAr": "",
  "bannerTabletEn": "",
  "bannerTabletAr": "",
  "bannerMobileEn": "",
  "bannerMobileAr": "",
  "metaTitle": "",
  "metaDescription": ""
}
```

| Field | Limit | Screen |
|---|---|---|
| `name` | Brand name. Products match this text, any letter case | Title |
| `nameAr` | Arabic title | Title when the app is Arabic |
| `description` | English story | Hero body |
| `descriptionAr` | Arabic story | Hero body in Arabic, RTL |
| `image` | Logo URL | 56 × 56 hero image |
| `bannerMobileEn`, `bannerMobileAr` | Phone banner URLs | Banner |
| `bannerTabletEn`, `bannerTabletAr` | Fallback if the phone banner is empty | Banner |
| `bannerEn`, `bannerAr` | Desktop banner. Last fallback on a phone | Banner |
| `metaTitle` | Max 120 characters | Screen title. Falls back to `name` |
| `metaDescription` | Max 320 characters | Share text. Falls back to `description` |
| `path` | Always `/brand/{slug}` | Open this path for the brand |

If no seller page was saved, the website still opens `/brand/{slug}` from the product brand name alone. Then name is the product brand string, and logo, banners, and descriptions are empty.

---

## 6. Seller API — not for the customer app

`GET /api/store/brands` and `PATCH /api/store/brands` need `Authorization: Bearer {sellerFirebaseIdToken}`. `401` is `{ "error": "Unauthorized" }`.

### List

```json
{
  "brands": [
    {
      "name": "NEXSO",
      "productCount": 42,
      "page": { "slug": "nexso", "path": "/brand/nexso", "name": "NEXSO" }
    }
  ],
  "totalBrands": 12,
  "duplicateGroups": [
    { "key": "nexso", "names": ["NEXSO", "nexso"], "productCount": 42 }
  ],
  "totalProductsWithBrand": 900
}
```

`page` is `null` until the seller saves a brand page. `productCount` here counts every store product with that brand string, including unpublished ones. The public page count is published products only.

### Save the public page

```http
PATCH /api/store/brands
```

```json
{
  "action": "save-page",
  "name": "NEXSO",
  "nameAr": "",
  "description": "",
  "descriptionAr": "",
  "image": "https://…",
  "bannerEn": "",
  "bannerAr": "",
  "bannerTabletEn": "",
  "bannerTabletAr": "",
  "bannerMobileEn": "",
  "bannerMobileAr": "",
  "metaTitle": "",
  "metaDescription": ""
}
```

Success: `{ "success": true, "page": { … }, "message": "Brand page saved" }`.  
`400` when `name` is empty.

### Rename or merge product brands

```json
{ "action": "rename", "from": "Nexso", "to": "NEXSO" }
```

| `action` | Effect |
|---|---|
| `rename` | Products whose `brand` is exactly `from` become `to` |
| `merge` | Same as rename |
| `merge-case` | Every letter-case of `from` becomes `to` |

Success includes `matchedCount`, `modifiedCount`, `from`, `to`, and `message`.  
`400` when `from` or `to` is empty, or when `from` and `to` are the same on a rename.

---

## 7. What not to call

| Call | Why |
|---|---|
| `GET /api/store/brands` from the customer app | Seller list. Includes drafts and duplicate names |
| `GET /api/public/category-products` for `/brand/nexso` | That API is the category page |
| `/category/brands/{slug}` as a substitute | Different page, different products |
