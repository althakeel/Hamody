# Store1920 product cards

**Audience:** Android / Flutter / storefront  
**Last updated:** 9 November 2026  
**API root:** `https://www.store1920.com/api`  
**Website card:** `components/ProductCard.jsx`  
**Deeper API contract:** [PRODUCT_CARD_API.md](./PRODUCT_CARD_API.md)

A product card is the small product tile on home, shop, category, brand, search, and offers. It shows the photo, name, price, optional badges, optional stars, and add-to-cart. Tap opens `/product/{slug}`.

No login. Do **not** call `/api/store/product` or `/api/store/product/app-discount` for cards.

Send `Accept-Language: en` or `ar`. Prices stay numbers. Draw the dirham icon next to the number — do not print the letters `AED`.

---

## 1. Which API to call

| Screen | Call |
|--------|------|
| Home / shop / category / search list | `GET /api/products` |
| Refresh known IDs (wishlist, recently viewed, cart hydration) | `POST /api/products/batch` |
| One product by slug | `GET /api/products/by-slug?slug=` |
| Top sellers | `GET /api/products/top-selling` |
| Top rated | `GET /api/products/top-rated` |
| Image badges | `GET /api/public/new-tag` |
| Delivery time badge settings | `GET /api/store/appearance/sections/public` → `timeBadges` |

Full query params and cache rules: [PRODUCT_CARD_API.md](./PRODUCT_CARD_API.md).

### List example

```http
GET /api/products?paginated=true&page=1&limit=24&sortBy=newest&slim=false
```

```json
{
  "products": [
    {
      "_id": "66f0c1a2b3c4d5e6f7081920",
      "name": "Turbo Cordless Leaf Blower",
      "nameAr": "",
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

Use `slim=false` when the card needs real ratings. Slim lists may return `averageRating: 0` and `ratingCount: 0` — do not draw stars from those zeroes.

### Batch example

```http
POST /api/products/batch
Content-Type: application/json
```

```json
{ "productIds": ["66f0c1a2b3c4d5e6f7081920"] }
```

Returns `{ "products": [ … ] }` in the same order as the IDs. Products without a usable image are dropped.

---

## 2. What to draw on the card

One vertical tile. Do not turn it into a wide list row unless the screen already uses that layout.

| Piece | Rule |
|-------|------|
| Image | Square (`aspect-square`). First usable image. Optional second image on hover (web). Optional delayed video preview when configured |
| Image badges | On the photo — see [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md) |
| Title | One or two lines, truncated. Arabic uses `nameAr` when present |
| Stars | Only when `ratingCount` / `reviewCount` &gt; 0 |
| Sale price | `price` (live selling price) |
| Compare price | `AED` or `mrp` when **higher** than `price` — strike through |
| Discount % | Optional; calculate from compare and sale when both exist |
| Delivery badge | Under the price from `timeBadges` |
| Cart control | Add (+) when in stock and qty 0. Qty stepper when already in cart. “Out of stock” when not sellable |
| Tap | Open `/product/{slug}` |

Skip a product if it has no `name`, no `slug`, or no usable `_id`.

---

## 3. Card fields

| Field | Use |
|-------|-----|
| `_id` | Cart key, tracking, ratings |
| `name` / `nameAr` | Title |
| `slug` | Link `/product/{slug}` |
| `price` | Sale / live price |
| `AED` / `mrp` | Compare-at (strike when higher than `price`) |
| `discount` / `discountPercent` | Optional %; card can also compute it |
| `images` | Ordered media (URL string or `{ url }`) |
| `image` | Legacy single image fallback |
| `inStock` / `stockQuantity` | Availability |
| `hasVariants` / `variants` | Stock may depend on variants; variant pick is on the product page, not the card |
| `averageRating` | Stars (round for display) |
| `ratingCount` / `reviewCount` | Count next to stars |
| `imageBadgeIds`, `tags`, `categories`, `createdAt` | Badge matching |
| `fastDelivery`, `freeShippingEligible` | Badge conditions |
| `cardVideoPreviewEnabled` | Delayed video on card (default on) |
| `cardVideoPreviewDelaySec` | Delay before video shows (default 24) |

---

## 4. Price rules

| Situation | Draw |
|-----------|------|
| Only `price` | Show `price` |
| `price` + higher `AED`/`mrp` | Show `price` + struck compare |
| `price` ≥ compare | Do **not** strike the compare price |
| Missing sale but compare + discount % | Derive sale from compare and % |
| Missing compare but sale + discount % | Derive compare from sale and % |

Currency: numbers from the API; format with the storefront market helper / dirham icon. Do not hard-code `"AED 64"` text in the app UI.

Website aliases also accepted by the card component: `salePrice`, `discountedPrice`, `sellingPrice`, `offerPrice`, `currentPrice` for sale; `compareAtPrice`, `originalPrice`, `listPrice`, `basePrice`, `regularPrice` for compare.

---

## 5. Images and video

1. Prefer `images[0]` (normalized).  
2. If there is a second image, web may cross-fade on hover.  
3. Video extensions: `.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`, `.avi`, `.mkv` (query string ignored).  
4. If the first media is video and preview is enabled and a later image exists → show that image as poster, then reveal muted looping video after ready + delay.  
5. If no media → placeholder.

Alt text = localized product name.

---

## 6. Stock and cart on the card

| State | UI |
|-------|----|
| Out of stock | Grey “Out of stock” — no add |
| In stock, not in cart | White + button |
| In cart | Blue control with − / qty / + (web: qty pill, expand on hover on desktop) |

Add sends quantity **1** of the base product. Variants and bundles are finished on the product page. Re-check price and stock before checkout.

Cart sync for logged-in users: upload cart after add/remove (website uses Redux `uploadCart` + Firebase token). Guest cart stays on device until login.

---

## 7. Badges (short)

| Badge | Source |
|-------|--------|
| Image overlay badges | `GET /api/public/new-tag` + product fields |
| Delivery time under price | `timeBadges` from appearance public API |
| Sale % next to price | From `price` vs `AED`/`mrp` |

Full badge rules: [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md).

---

## 8. Phone layout (recommended)

Match the website card proportions on mobile grids:

| Piece | Size guide |
|-------|------------|
| Media | Square, full card width |
| Title | ~12–13 px, 2 lines max |
| Stars | Small row, only if reviews &gt; 0 |
| Price | Sale prominent; compare smaller struck |
| Gap | Tight padding under image (~8–12 px) |
| Cart | Bottom-end over the image (same corner as website) |

Home carousels may use a fixed card width; shop grids use equal columns. Keep one card composition — not a dashboard of chips.

---

## 9. Tracking (website parity)

| Action | Event |
|--------|-------|
| Card visible in a list | Item list impression |
| Tap card | `select_item` |
| Add / remove | Ecommerce add_to_cart / remove_from_cart |

Pass `itemListId`, `itemListName`, and index when the parent list knows them (e.g. “Home — New arrivals”).

---

## 10. Do / don’t

**Do**

- Use public `/api/products*` only  
- Require `name` + `slug` + `_id`  
- Use `slim=false` when showing stars  
- Open `/product/{slug}` on tap  

**Don’t**

- Don’t call seller `/api/store/product*` for cards  
- Don’t treat slim zero ratings as real reviews  
- Don’t pick variants on the card  
- Don’t show struck compare when it is not higher than sale  

---

## 11. Checklist

- [ ] List from `GET /api/products` or batch from `POST /api/products/batch`  
- [ ] Square image + title + price  
- [ ] Strike compare only when higher than sale  
- [ ] Stars only when review count &gt; 0  
- [ ] Image badges + delivery badge wired  
- [ ] Out of stock blocks add  
- [ ] Tap → product page  
- [ ] Arabic title when language is `ar` and `nameAr` exists  

---

## 12. Related docs

| Doc | Topic |
|-----|--------|
| [PRODUCT_CARD_API.md](./PRODUCT_CARD_API.md) | Full API params, slim/rich, cache |
| [APP_PRODUCT.md](./APP_PRODUCT.md) | Full product page |
| [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md) | Image + delivery badges |
| [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md) | Android product screen |
| [FLUTTER_CATEGORY_APIS.md](./FLUTTER_CATEGORY_APIS.md) | Category lists that feed cards |
