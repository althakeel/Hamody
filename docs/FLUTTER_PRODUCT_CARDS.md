# Store1920 product cards — mobile API

Last updated: 9 October 2026  
Audience: Flutter developers  
Website: `https://www.store1920.com`  
API root: `https://www.store1920.com/api`

This file is only the **product card**: which API fills a card, and how that card looks on a phone. The rest of the app is in [FLUTTER_ENTIRE_APP.md](./FLUTTER_ENTIRE_APP.md). Category pages are in [FLUTTER_CATEGORY_APIS.md](./FLUTTER_CATEGORY_APIS.md).

No login. Send `Accept-Language: en` or `ar`.

Use this same card on home, shop, category, brand, search, offers, wishlist, and recommendations. Phone grid: **2 columns**, **12px** gap.

---

## 1. Where a card’s data comes from

Always send `page` so the list comes back as an object, not a bare array.

| Screen | API |
|---|---|
| Shop, new arrivals, best sellers, price filters | `GET /api/products?paginated=true&page=1&limit=24` |
| Search | `GET /api/search-products?keyword={text}&page=1&limit=24` |
| Camera search | `POST /api/search-by-image` |
| Category page | `GET /api/public/category-products?categoryId={id}&page=1&limit=100` |
| A list of ids (sliders, wishlist, featured) | `POST /api/products/batch` with `{ "productIds": ["…"] }` |
| Home featured grid | `GET /api/store/featured-products?includeProducts=true&limit=12` |
| Clearance | `GET /api/products/deals` |
| Top rated | `GET /api/products/top-rated` |
| Best sellers (dedicated) | `GET /api/products/top-selling` |
| Offers | `GET /api/public/offers` |
| Bought together, on the product page | `GET /api/products/{id}/fbt` |
| Badges on the image | `GET /api/public/new-tag` |

`POST /api/products/batch` returns `{ "products": [ … ] }` in the same order as `productIds`. Unpublished products and products with no image are left out.

---

## 2. Shop list query

```http
GET /api/products?paginated=true&page=1&limit=24&sortBy=newest
```

| Param | Values |
|---|---|
| `page` | Starts at 1 |
| `limit` | Default 24. With `paginated=true` the maximum is **60** |
| `sortBy` | `newest` (default), `priceLowToHigh`, `priceHighToLow`, `nameAZ`, `nameZA`. `sort` is the same parameter |
| `category` or `categories` | Category slug or id. Several slugs are comma-separated |
| `bestSeller` | `true` for best sellers |
| `fastDelivery` | `true` |
| `inStockOnly` | `true` hides out-of-stock cards |
| `includeOutOfStock` | `true` keeps out-of-stock cards in the list |
| `minPrice`, `maxPrice` | AED. Under 149 is `maxPrice=149`. Under 499 is `maxPrice=499` |
| `priceFilter` | `under499`, `500to999`, `1000to1999`, `2000plus` |
| `slim` | `false` when the card should show stars. A short page otherwise returns `averageRating: 0` and the stars stay hidden |

```json
{
  "products": [],
  "total": 240,
  "page": 1,
  "limit": 24,
  "totalPages": 10
}
```

New arrivals is the same list with `sortBy=newest`.

---

## 3. Fields on one card

```json
{
  "_id": "…",
  "name": "Camping lantern",
  "nameAr": "",
  "slug": "camping-lantern",
  "price": 49,
  "AED": 79,
  "images": ["https://…"],
  "inStock": true,
  "stockQuantity": 12,
  "averageRating": 4.6,
  "ratingCount": 18,
  "imageAspectRatio": "1:1",
  "imageBadgeIds": [],
  "createdAt": "2026-10-01T00:00:00.000Z"
}
```

| On the card | Field |
|---|---|
| Photo | First URL in `images`. If it fails, use a plain placeholder. The second image is a desktop hover only. Do not swap it on a phone |
| Name | `nameAr` when the language is Arabic and that field is not empty. Otherwise `name`. Two lines, then ellipsis |
| Sale price | `price`. Whole number, no decimals |
| Old price | `AED`, struck through, only when it is higher than `price` |
| Discount | `round((AED − price) / AED × 100)` when `AED` is higher. English `10% off`. Arabic `خصم 10٪` |
| Stars | 5 stars from `averageRating`, then `(ratingCount)`. Hide the row when `ratingCount` is 0 |
| Out of stock | `inStock` is false, or `stockQuantity` is 0 or less |
| Open the product | `/product/{slug}` |

Skip a product that has no `name` or no `slug`.

---

## 4. How the card looks

Match the phone shop at `https://www.store1920.com/shop`.

| Piece | Size |
|---|---|
| Card | White, 1px border `#e2e8f0`, corner radius **2px** |
| Image | Square, image fills the box |
| Name | **12px**, semibold, `#0f172a`, 2 lines |
| Sale price | **14px**, semibold, `#020617`. The mark is the dirham symbol, then the number. Do not print the letters AED |
| Old price | **10px**, `#94a3b8`, struck through. Same dirham symbol, same color as the old price |
| Discount | **10px**, semibold, `#047857` |
| Stars | **9px**. Filled `#facc15`, empty `#d1d5db`. Count is **9px** gray |
| Padding under the image | **8px** |

The currency mark is this file, not the letters AED:

```
https://www.store1920.com/currency/aed-dirham.png
```

Draw it just before the number, about **0.68em** tall, with a small gap. Tint it to the price color: `#020617` on the sale price, `#94a3b8` on the old price. The JSON field named `AED` is the old price number. It is not the label.

**Add button**, 12px from the bottom and the end edge of the image (right in English, left in Arabic):

| State | Look |
|---|---|
| Not in the cart | **32×32** white square, radius **10px**, border `#d1d5db`, plus icon `#475569` |
| In the cart | Blue bar `#2563eb`: minus (trash when the quantity is 1), the quantity, plus. Stays visible |
| Out of stock | Gray pill, **Out of stock**. No plus button |

Tapping the card opens the product. Tapping plus adds 1 and does not open the product.

---

## 5. Badges

```http
GET /api/public/new-tag
```

Draw a badge only when this response says that product qualifies (`imageBadgeIds`, on sale, new, low stock, and the other rules in that payload). Use its label, colors, shape, and corner. On a card the usual text is **10px**, about **8px** in from the corner. Do not hardcode a “NEW” ribbon.

Shapes: pill, rounded, square, tag, circle.
