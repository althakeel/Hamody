# Store1920 product page — Android

Last updated: 14 October 2026  
Audience: Android app  
Website: `https://www.store1920.com/product/{slug}`  
API root: `https://www.store1920.com/api`  
Web source: `app/(public)/product/[slug]/page.jsx`, `components/ProductDetails.jsx`, `components/ProductNotifyMeForm.jsx`

This file is every HTTP call the product page makes, including Notify Me. Name, sale price, regular price, app discount, images, product badges, time badge, bundle, variant, and add to cart are in [APP_PRODUCT.md](./APP_PRODUCT.md). The share button on the product photo is [APP_PRODUCT_SHARE.md](./APP_PRODUCT_SHARE.md). The phone navbar is [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md). The product card used for related and bundle rows is [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

Send `Accept-Language: en` or `ar` on public catalog calls. Arabic changes product and category names. Prices stay numbers. Do not print the letters **AED**. Draw `https://www.store1920.com/currency/aed-dirham.png` next to the number, the same way as the home page.

The website paints the first screen from the server. The app must call the routes below. Do not scrape the HTML page.

---

## 1. Calls on open

Call these when the customer opens `/product/{slug}`.

| # | When | Method | Path | Auth |
|---|---|---|---|---|
| 1 | Always | `GET` | `/api/products/by-slug?slug={slug}` | None |
| 2 | After you have `product._id` | `GET` | `/api/review?productId={id}` | None |
| 3 | After you have `product._id` | `GET` | `/api/products/{id}/fbt` | None |
| 4 | Breadcrumb | `GET` | `/api/categories` | None |
| 5 | Delivery copy, badges, WhatsApp button | `GET` | `/api/store/appearance/sections/public` | None |
| 6 | Delivery fee line | `GET` | `/api/shipping?storeId={product.storeId}` | None |
| 7 | Related row | `GET` | `/api/products?category={categorySlug}&limit=6&paginated=true` | None |
| 8 | Signed in only | `POST` | `/api/browse-history` | Firebase Bearer |
| 9 | Signed in only | `GET` | `/api/wishlist` | Firebase Bearer |
| 10 | First behavior event, if `storeId` is missing | `GET` | `/api/public/tracking-context` | None |

Guests do not call browse history or wishlist. Recently viewed for a guest stays on the device.

`404` from by-slug means the product is missing or unpublished. Show the not-found screen.

---

## 2. Product

```http
GET /api/products/by-slug?slug={slug}&lang=en
```

`lang` is optional. `en` or `ar` overrides `Accept-Language`. A 24-character hex slug is treated as a product id.

**200**

```json
{ "product": { } }
```

Fields the page uses:

| Field | Use |
|---|---|
| `_id` | Reviews, notify, wishlist, cart, FBT, browse history |
| `slug` | Page path `/product/{slug}` |
| `name`, `description`, `shortDescription`, `brand` | Already localized. Tapping the brand opens `/brand/{slug}` |
| `price` | Sale price |
| `AED` | Old price number, not a currency label. Show it only when it is higher than `price` |
| `images` | Gallery. Strings or objects with `url` |
| `sku` | Notify body and cart line |
| `inStock`, `stockQuantity` | Buy box vs Notify Me |
| `hasVariants`, `variants` | Size or color picker. A variant is in stock when `stock` is greater than 0 |
| `attributes` | Specs |
| `hasBulkPricing`, `bulkPricing` | Quantity price breaks |
| `imageBadgeIds` | Match labels from appearance badges |
| `fastDelivery`, `freeShippingEligible` | Delivery lines |
| `allowReturn`, `allowReplacement` | Policy lines |
| `specTableEnabled`, `specTableColumns`, `specTableRows` | Spec table |
| `storeId` | Shipping query |
| `category`, `categories` | Breadcrumb and related products |
| `aPlusDesktop`, `aPlusMobile` and the `Ar` and `Images` pairs | Extra description images. On a phone use the mobile set when it has images |

**400** `{ "error": "Missing slug" }`  
**404** `{ "error": "Product not found" }`

The brand name is a link. Build the slug from the English `brand` (lowercase, `&` becomes `and`, other symbols dropped, spaces become hyphens). `Toby's` opens `/brand/tobys`. Arabic shows `brandAr` as the label when it is set, and still uses the English name for the path. Brand page layout is [ANDROID_BRAND_PAGE.md](./ANDROID_BRAND_PAGE.md).

---

## 2b. Product overview

This block sits under the buy box. Title is **Product Overview**. The two sources are the description (`description`, already localized) and the spec rows (`specTableRows` when `specTableEnabled` is true).

Do not draw a gray capsule with a dark filled pill. That control is heavier than the text, and the body then reads as one dark wall. Use a quiet text switch, open line height, and a short first view.

| Piece | Size |
|---|---|
| Card | White. Padding **16** px. No border |
| Title | **18** px, semibold, `#111827`. One line |
| Switch | **8** px under the title. Two words in a row, **20** px gap. No background track |
| Active word | **15** px, semibold, `#0f172a`. A **2** px line under the word, same color, **8** px below the letters |
| Idle word | **15** px, medium, `#64748b` |
| Change | Fade the body in **150** ms. Do not jump the page |

The first word is the description tab title from the product when it is set (`attributes.descriptionTabTitle`, or `descriptionTabTitleAr` in Arabic). Otherwise **Highlights**. The second word is `attributes.specificationTabTitle` or **Specifications**. Hide the second word when there are no spec rows. Hide the switch when only one source exists, and show that source under the title.

### Highlights

Render the description HTML. Paragraphs stay paragraphs. Lists stay lists.

| Piece | Size |
|---|---|
| Text | **15** px, line height **1.7**, color `#334155` |
| Space between paragraphs | **14** px |
| List | Disc, **8** px between items, **20** px inset |
| First view | About **7** lines, then a white fade **48** px tall |
| Read more | Centered, **14** px, semibold, `#0f172a`, **12** px under the fade. Tapping it expands in place. The label becomes **Read less** |

A description shorter than 7 lines has no fade and no Read more.

### Specifications

One row per spec. No boxed table and no gray header cell.

| Piece | Size |
|---|---|
| Row | Padding **12** px vertical. A **1** px line `#f1f5f9` under every row except the last |
| Label | Start side, **13** px, `#64748b`, about **42%** of the width |
| Value | End side, **15** px, `#0f172a`, the rest of the width. Wrap. Top-aligned with the label |

### Scroll control

The round up-arrow sits **16** px above the add-to-cart bar, on the end edge. It must not cover the last line of this block. The page content ends **24** px below the bar, so the last paragraph can scroll clear of both the arrow and the bar.


## 3. Notify Me

Show the form when the selected variant, or the product if it has no variants, is out of stock. Hide the add-to-cart button in that state. The form is also the phone sticky bar when the product cannot be bought.

No login. Email **or** phone is enough. Both may be sent.

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

| Field | Rule |
|---|---|
| `productId` | Required. `product._id` |
| `sku` | Optional. Selected variant SKU, else `product.sku` |
| `email` | Optional if `phone` is set. Must look like an email when present |
| `phone` | Optional if `email` is set. Local digits. Default country code `+971` |
| `phoneCode` | Optional. Defaults to `+971` |

**200**

```json
{
  "success": true,
  "message": "We will notify you when this is back in stock."
}
```

Show that message and clear the form. Sending the same email or phone again for the same product still returns success. The stored request goes back to pending.

| Status | Body |
|---|---|
| 400 | `{ "error": "Enter an email or phone number." }` |
| 400 | `{ "error": "Enter a valid email address." }` |
| 400 | `{ "error": "..." }` phone validation message |
| 400 | `{ "error": "Product is required." }` |
| 404 | `{ "error": "Product not found." }` |
| 400 | `{ "error": "This product is not available for alerts." }` when the product has no store |

The seller list at `/api/store/notify-list` is the dashboard. Do not call it from the product page.

---

## 4. Reviews

Approved reviews only. At most 30, newest first.

```http
GET /api/review?productId={productId}
```

**200** `{ "reviews": [ ] }`

Each review: `_id`, `rating`, `review`, `images`, `videos`, `customerName`, `helpfulCount`, `createdAt`, `user` (`name`, `image`).

The website loads this list with the page. The app should call it on open, and again after a review is submitted.

### Can this customer write one?

```http
GET /api/review/can-review?productId={productId}
Authorization: Bearer {firebaseIdToken}
```

The token is optional. Without it the answer is that they are signed out.

**200** `{ "canReview": false, "signedIn": false }` when there is no token.

With a token, **200** includes `canReview` and `signedIn: true`, plus the reason when they cannot review (no delivered order for this product, or a review already exists).

### Submit

Signed in. The customer must have a delivered order that contains this product. One review per product.

```http
POST /api/review
Authorization: Bearer {firebaseIdToken}
Content-Type: multipart/form-data
```

| Part | Rule |
|---|---|
| `productId` | Required |
| `rating` | 1–5 |
| `review` | Text |
| `images` | Repeat the part for each file |

**200** `{ "review": { } }`  
**401** not signed in  
**403** no delivered order  
**409** already reviewed

### Helpful

No login. `voterId` is a stable device id so the same phone cannot vote twice.

```http
POST /api/review/helpful
Content-Type: application/json
```

```json
{ "reviewId": "REVIEW_ID", "voterId": "DEVICE_ID" }
```

---

## 5. Frequently bought together

```http
GET /api/products/{productId}/fbt
```

**200**

```json
{
  "enableFBT": true,
  "products": [],
  "bundlePrice": 0,
  "bundleDiscount": 0
}
```

Hide the block when `enableFBT` is false or `products` is empty. Each product in `products` is published and in stock. `name` is localized.

The website also sends behavior events for this block. See section 11.

---

## 6. Related products

There is no `/api/products/related` route. The website picks up to 6 other published products in the same `category` or `categories` list, then drops the current product, and puts out-of-stock cards last.

For the app:

```http
GET /api/products?category={categorySlug}&limit=6&paginated=true
```

`category` is the category **slug**, not the display name. Resolve it with `GET /api/categories`. Remove the current product from the result. If that list is empty, call `GET /api/products?limit=6&paginated=true` and still remove the current product.

---

## 7. Categories

```http
GET /api/categories
```

**200** `{ "categories": [ ] }`

Each category: `_id`, `name`, `nameAr`, `slug`, `parentId`, `children`.

Build the breadcrumb from the product’s `category` and `categories` values. Match an id to `_id`. If the value is not an id, match `name` or `slug`. Walk `parentId` up to the root, root first.

Cache this list. The website keeps it for 10 minutes.

---

## 8. Page copy, badges, WhatsApp

```http
GET /api/store/appearance/sections/public
```

No auth. The product page reads two objects. Ignore the home and offers fields.

### `productPageInfo`

| Field | Use |
|---|---|
| `returnsText` | Returns line. Default `Easy Returns` |
| `vatText` | Default `All prices include VAT.` |
| `deliveryPrefix`, `deliverySuffix` | Estimate sentence |
| `cutoffHour`, `cutoffMinute` | Order-by time, 0–23 and 0–59 |
| `deliveryMinDays`, `deliveryMaxDays` | Estimate window |
| `rushPrefix`, `rushHour`, `rushMinute`, `rushDayLabel` | Rush line |
| `badgeSettings.badges` | Up to 20 badges: `label`, `backgroundColor`, `textColor`, `borderRadius` |

Match `product.imageBadgeIds` to those labels. Unknown labels use a gray badge (`#565959` background, white text).

### `whatsappProductWidget`

Show the button only when `enabled` is true and `phone` is not empty. Open `https://wa.me/{digits}?text={encoded message}`. The message can include the product name and the page URL. Position comes from `position` (`left` or `right`).

---

## 9. Shipping

```http
GET /api/shipping?storeId={product.storeId}
```

No auth. Skip the call when `storeId` is empty.

Use the public fields: `freeShippingThreshold`, `defaultShippingFee`, `enableExpressShipping`, `expressShippingFee`, `expressEstimatedDays`, `shippingOptions`. Do not send a seller token. A seller token returns the dashboard settings instead of the public fallback.

---

## 10. Cart and wishlist

Add to cart writes the device cart first. If the customer is signed in, upload the whole cart.

```http
POST /api/cart
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

```json
{ "cart": { } }
```

`cart` is the full cart map the app already stores, not a single line. Guests do not call this.

```http
GET /api/cart
Authorization: Bearer {firebaseIdToken}
```

Load this when a signed-in customer opens the app, not on every product view.

Wishlist:

```http
GET /api/wishlist
Authorization: Bearer {firebaseIdToken}
```

**200** `{ "wishlist": [ ] }`. Each item has `productId` and `product`. The heart is filled when this product’s id is in the list.

```http
POST /api/wishlist
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

```json
{ "productId": "PRODUCT_ID", "action": "add" }
```

`action` is `add` or `remove`.

**200** `{ "message": "Added to wishlist", "inWishlist": true }` or `{ "message": "Removed from wishlist", "inWishlist": false }`. Adding twice returns `{ "message": "Already in wishlist", "inWishlist": true }`.

**401** `{ "error": "Unauthorized" }` when the token is missing. Send the customer to sign in before the heart toggles.

---

## 11. Browse history and behavior

Signed in, once per product view:

```http
POST /api/browse-history
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

```json
{ "productId": "PRODUCT_ID" }
```

**200** `{ "success": true, "message": "Browse history updated" }`  
**400** `{ "error": "Product ID required" }`  
**401** missing or bad token

The same product updates `viewedAt`. It does not create a second row.

Behavior events, when the FBT block is used:

```http
POST /api/analytics/customer-behavior
Content-Type: application/json
```

No auth. Body includes `storeId`, `eventType`, `productId`, `anonymousId`, `sessionId`, `pageType` (`product`), `pagePath`, `value`, `currency` (`AED`), and `metadata`.

`eventType` values from this page:

| Event | When |
|---|---|
| `fbt_viewed` | The bundle block is on screen |
| `fbt_item_selected` | A bundle checkbox turns on |
| `fbt_item_unselected` | A bundle checkbox turns off |
| `fbt_add_bundle_clicked` | The customer taps add bundle |
| `fbt_add_bundle_success` | The bundle lines were added |

If `storeId` is not on the product yet:

```http
GET /api/public/tracking-context
```

Use `storeId` from that JSON for the behavior post. Skip the behavior post when `storeId` is still empty.

Meta ViewContent and the Google `view_item` event are pixels, not these REST routes. They are not required to render the page.

---

## 12. What not to call

| Path | Why |
|---|---|
| `GET /api/store/notify-list` | Seller dashboard |
| `PATCH /api/products/{id}/fbt` | Seller dashboard |
| `POST /api/products` | Creates a product |
| `DELETE /api/browse-history` | Clears history from account settings, not this page |
