# Product Card API and Data Contract

Last updated: 2 November 2026
Audience: storefront and app developers
API root: `https://www.hamody.com/api`

This document describes the public product data used to render product cards: catalog endpoints, fields, pricing, images and video previews, availability, ratings, badges, delivery labels, links, and card actions.

## 1. Product card data flow

The website card is rendered by `components/ProductCard.jsx`. Catalog endpoints return product records; the card component formats the data and handles the product link, cart controls, and ecommerce events.

| Use case | Endpoint |
|---|---|
| Catalog, home, search, category, or filtered listing | `GET /api/products` |
| Re-fetch a known set of product IDs in the requested order | `POST /api/products/batch` |
| Load one product by slug or product ID | `GET /api/products/by-slug?slug={slug}` |
| Load full product-page data | `GET /api/products/page?slug={slug}` |
| Top-selling list | `GET /api/products/top-selling` |
| Top-rated list | `GET /api/products/top-rated` |
| Public image badge definitions | `GET /api/public/new-tag` |
| Public delivery badge settings | `GET /api/store/appearance/sections/public` |

These are public storefront endpoints; no store-dashboard sign-in is required. Do not use `/api/store/product` or `/api/store/product/app-discount` to populate public cards.

## 2. Catalog list: `GET /api/products`

Example:

```http
GET /api/products?paginated=true&page=1&limit=24&sortBy=newest&slim=false
```

For general catalog use, `GET /api/products` returns an array. If `paginated=true`, a `page` parameter is supplied, or `all=true`, it returns a pagination object:

```json
{
  "products": [
    {
      "_id": "66f0c1a2b3c4d5e6f7081920",
      "name": "Turbo Cordless Leaf Blower",
      "slug": "turbo-cordless-leaf-blower",
      "price": 64,
      "AED": 89,
      "images": ["https://cdn.example.com/blower-1.jpg"],
      "inStock": true,
      "stockQuantity": 12,
      "averageRating": 4.5,
      "ratingCount": 8
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 24,
  "totalPages": 1
}
```

### Query parameters

| Parameter | Meaning |
|---|---|
| `paginated=true` | Return the pagination object. Supplying `page` also enables pagination. |
| `page` | One-based page number. |
| `limit` | Page size; at most 60 in paginated mode and 500 otherwise. Defaults to 24 for paginated requests and 20 otherwise. |
| `offset` | Starting row when not using page-based pagination. |
| `all=true` | Return all matching products as `{ products, total, page, limit, totalPages }`. |
| `sortBy` or `sort` | `newest` (default), `priceLowToHigh`, `price-low-high`, `priceHighToLow`, `price-high-low`, `nameAZ`, `nameZA`, `popularity`, `rating`, or `discount`. |
| `category` | One category slug or name. |
| `categories` | Comma-separated category slugs or names; used instead of `category` when supplied. |
| `includeOutOfStock=true` | Include out-of-stock products. Otherwise catalog visibility rules apply. |
| `inStockOnly=true` | Restrict results to in-stock products. |
| `fastDelivery=true` | Restrict results to fast-delivery products. |
| `bestSeller=true` | Restrict results to best sellers. |
| `priceFilter` | `all` (default), `under499`, `500to999`, `1000to1999`, or `2000plus`. |
| `minPrice`, `maxPrice` | Additional numeric price bounds. |
| `badge`, `tag` | Filter by a badge or product tag. |
| `minRating` | Minimum approved-review average; enables rating-aware filtering. |
| `ids` | Comma-separated Mongo product IDs; at most 250 valid IDs are used. |
| `slim` | `true` selects the smaller card/list projection. `false` requests the richer projection. For small non-rated lists, slim is the default. |

Paginated and all-product results deduplicate products by SKU. Out-of-stock products are sorted after in-stock products. Published products are included; records with `published: false` are hidden.

The response includes `Cache-Control` and `X-Cache` headers. The regular catalog cache is 10 minutes with stale-while-revalidate; category, ID, and minimum-rating filtered requests bypass that product cache. In development the response is not cached.

### Slim versus rich results

The slim projection includes card essentials such as name, localized name, slug, SKU, price fields, images, categories, availability, delivery flags, image badges, card video settings, and short descriptions. It currently returns `averageRating: 0` and `ratingCount: 0`; do not present those zeroes as an actual rating summary.

Use `slim=false` when the card needs rating information. Rich results include approved-rating aggregates in `averageRating` and `ratingCount`, as well as fields such as brand, variants, and attributes. If sorting/filtering by `minRating`, the API also uses rating data.

## 3. Batch lookup: `POST /api/products/batch`

Use this endpoint when the client already has product IDs and needs a fresh set of published, renderable products.

```http
POST /api/products/batch
Content-Type: application/json
```

```json
{
  "productIds": ["66f0c1a2b3c4d5e6f7081920"]
}
```

Response:

```json
{
  "products": [
    {
      "_id": "66f0c1a2b3c4d5e6f7081920",
      "name": "Turbo Cordless Leaf Blower",
      "slug": "turbo-cordless-leaf-blower",
      "price": 64,
      "AED": 89,
      "images": ["https://cdn.example.com/blower-1.jpg"],
      "averageRating": 4.5,
      "ratingCount": 8
    }
  ]
}
```

The endpoint removes duplicate IDs, preserves the requested order, filters unpublished or incomplete records, and attaches approved rating data. Products without a displayable image are omitted. An invalid `productIds` value returns `400`; an empty list returns `{ "products": [] }`.

## 4. Single product and ranked product endpoints

### Product lookup

```http
GET /api/products/by-slug?slug={slug}&lang=en
```

Returns `{ "product": { ... } }`. `lang` may be `en` or `ar`; otherwise the storefront language is resolved from the request. An absent slug returns `400`; an unpublished or missing product returns `404`. Production responses are cached for 300 seconds with stale-while-revalidate.

### Full product-page payload

```http
GET /api/products/page?slug={slug}&lang=en
```

Returns product-page data rather than a card-only projection. Use the card-oriented fields described below; refer to `docs/APP_PRODUCT.md` for variant selection, full product details, and cart behavior.

### Top-selling products

```http
GET /api/products/top-selling?limit=24&offset=0&days=30
```

Returns `{ success, source, products, total, offset, limit, hasMore, nextOffset }`. `days=0` (default) includes the full order history; a positive `days` limits the ranking window. `storeId` optionally filters to a store. Results are ranked by units sold and exclude cancelled, failed, refunded, and deleted order lines. The endpoint can fall back to the product `soldCount` field if order-based ranking is unavailable.

### Top-rated products

```http
GET /api/products/top-rated?threshold=4&minReviews=1&limit=50
```

Returns `{ "products": [...] }` based on approved ratings. The defaults are a 4-star threshold, one review, and a 50-product limit. This endpoint returns only in-stock products.

## 5. Card data fields

| Field | Card use |
|---|---|
| `_id` | Stable product ID; used for the cart, rating lookup, and tracking. |
| `name`, `nameAr` | Product title. Choose the localized value; API language localization may already replace localizable fields. |
| `slug` | Product link. A card requires a non-empty name and slug. |
| `price` | Current/sale price. Preferred over legacy sale-price aliases. |
| `AED`, `mrp` | Compare-at/regular price. Display crossed out only when greater than the sale price. |
| `discount` or `discountPercent` | Optional discount percentage. The card calculates it from compare-at and sale prices when both are available. |
| `images` | Ordered image/video media list. Entries may be URL strings or objects with a `url`, `src`, `path`, or `data` value. |
| `image` | Legacy/fallback image field. |
| `inStock`, `stockQuantity` | Product availability. Out-of-stock items show an “Out of stock” indicator instead of an add button. |
| `hasVariants`, `variants` | Variant availability/stock may affect whether the product can be added. The card displays base product price; variant selection belongs on the product page. |
| `averageRating` | Average approved rating, rounded for the five-star display. |
| `ratingCount` or `reviewCount` | Count shown beside the stars; no stars/count are rendered when the count is zero. |
| `imageBadgeIds`, `createdAt`, `tags`, `categories` | Inputs used to decide whether configured image badges apply. |
| `fastDelivery`, `freeShippingEligible`, `stockQuantity` | Product data that may be used by configured badge conditions. |
| `cardVideoPreviewEnabled`, `cardVideoPreviewDelaySec` | Controls the delayed video preview behavior. Defaults are enabled and 24 seconds. |
| `imageAspectRatio` | Stored product setting; the current website card renders a square media region. |

The card skips invalid product objects, missing names/slugs/IDs, and cart variation rows. Image URLs must be absolute HTTP(S), root-relative, or `data:image/` URLs. Retired media URLs are ignored; if no image can be resolved, a placeholder is used.

## 6. Price display rules

The website card prefers `price` for the live price and `AED`, then `mrp`, for the compare-at price. Compatibility aliases are also accepted by the component: `salePrice`, `discountedPrice`, `sellingPrice`, `offerPrice`, `currentPrice` and snake_case equivalents for the sale price; `compareAtPrice`, `originalPrice`, `listPrice`, `basePrice`, `regularPrice` and snake_case equivalents for the regular price.

| Situation | Display |
|---|---|
| Sale price only | Show the sale price. |
| Sale price plus higher regular price | Show the sale price and strike through the regular price. |
| Both price fields absent/zero, but a regular price and positive explicit discount exist | Derive the sale price from regular price and discount. |
| Regular price absent/zero, but a sale price and positive explicit discount exist | Derive the regular price from sale price and discount. |
| Sale price is higher than or equal to regular price | Do not show the regular price as a crossed-out price. |

Displayed prices are converted and formatted for the active storefront market. API prices should remain numeric; clients should not hard-code an AED label in place of the market currency display.

## 7. Images and video previews

`images` is ordered. The first renderable image is the default card image; if there is another image, the card fades to it on hover. Video files (`.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`, `.avi`, `.mkv`) are recognized by extension, ignoring query strings.

| First media | Card behavior |
|---|---|
| Image | Display it; optionally cross-fade to the second image on hover. |
| Video, preview enabled and a later image exists | Show the first later image as poster; load the video and reveal it after it is ready plus `cardVideoPreviewDelaySec`. |
| Video, preview disabled or no poster image | Show the video directly. |
| No usable image or video | Show the configured placeholder. |

Videos preview muted, looped, and inline. Cards should use a poster image where possible and keep the accessible image alt text equal to the localized product name.

## 8. Badges and delivery label

### Image badges

Load settings from:

```http
GET /api/public/new-tag
```

This public endpoint returns global badge display settings and badge definitions. Product-level `imageBadgeIds` pins badges to products; other rules can match new products, categories, tags, prices, sales, stock, fast delivery, or free shipping. Settings are cached publicly for 60 seconds with stale-while-revalidate.

For the complete badge conditions, localized labels, placement, styling, and visibility rules, see [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md).

### Delivery badge

The website card renders `TimeDeliveryBadge` below the price using the product `_id`. Its configuration is in:

```http
GET /api/store/appearance/sections/public
```

Read `timeBadges` from the response and apply the configured product/page rules and localized labels. The public appearance response includes defaults if stored settings are unavailable.

## 9. Card link, cart, and analytics

- Product links use `/product/{slug}`.
- Clicking the card records a GA4 `select_item` event; cards can receive `itemListId`, `itemListName`, and `itemListIndex` for list attribution.
- A visible add button dispatches the cart action for quantity one and uploads the cart for signed-in users. The card blocks adding an out-of-stock product and shows an out-of-stock label.
- When the item is already in the cart, the card shows the quantity control with decrease/remove and add-more actions.
- Add/remove actions send ecommerce tracking events. The visible card price is used for event values.
- A compact card layout may omit the review stars; the name, price, image, delivery badge, and cart control follow the selected component layout.

Cards are a preview and entry point, not the authority for variant selection or checkout price validation. Revalidate availability and price when loading the product page and processing the order.

## 10. Related references

- [APP_PRODUCT.md](./APP_PRODUCT.md) — product page, variants, price display, and add-to-cart behavior.
- [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md) — detailed image badge contract.
- `components/ProductCard.jsx` — website card implementation.
- `lib/productMedia.js` — media normalization and video preview rules.
- `lib/productVisibility.js` — published and stock visibility rules.
