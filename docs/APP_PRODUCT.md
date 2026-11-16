# HAMODY app product

Last updated: 28 October 2026  
Audience: Android and Flutter  
Website: `https://www.hamody.com/product/{slug}`  
API root: `https://www.hamody.com/api`

This is the product page. It covers the name, sale price, regular price, app discount price, images, product badges, the delivery time badge, and whether the product is a bundle, a variant, both, or neither. **Add to cart** is included.

Other product-page calls (reviews, delivery, related products) are in [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md). The share sheet is in [APP_PRODUCT_SHARE.md](./APP_PRODUCT_SHARE.md).

Send `Accept-Language: en` or `ar`. Arabic replaces `name` with the Arabic name. Prices stay numbers. Draw `https://www.hamody.com/currency/aed-dirham.png` next to the number. Do not print the letters AED.

---

## 1. Load the product

```http
GET https://www.hamody.com/api/products/by-slug?slug={slug}
```

No sign-in. `200` is `{ "product": { } }`. `404` is **Product not found**.

```json
{
  "product": {
    "_id": "66f0c1a2b3c4d5e6f7081920",
    "name": "Turbo Cordless Leaf Blower",
    "slug": "turbo-cordless-leaf-blower",
    "price": 64,
    "AED": 89,
    "images": [
      "https://cdn.example.com/blower-1.jpg",
      "https://cdn.example.com/blower-2.jpg"
    ],
    "sku": "ST4008",
    "inStock": true,
    "stockQuantity": 12,
    "hasVariants": true,
    "variants": [],
    "attributes": { "variantType": "simple" }
  }
}
```

| Field | Meaning |
|---|---|
| `_id` | Cart line id and order item id |
| `name` | Product name. Already localized |
| `price` | Sale price |
| `AED` | Regular price |
| `images` | Gallery. A string URL, or `{ "url": "…" }` |
| `sku` | Product code. A variant can replace it |
| `hasVariants` | `true` when the seller saved variant rows |
| `variants` | Each choice: price, stock, options, sometimes its own image |
| `attributes.variantType` | `simple`, `variants`, `bulk_bundles`, or `variant_bundles` |

---

## 2. Name, sale price, regular price

Show `name` as the title.

| Price | Field | When to show it |
|---|---|---|
| Sale | `price`, or the selected variant’s `price` | Always, when it is above 0 |
| Regular | `AED`, or the selected variant’s `AED` | Only when it is higher than the sale price. Strike it through |

A selected variant replaces both numbers. If that variant has no `price`, use the product `price`. If it has no `AED`, use the product `AED`.

Percent off, when the regular price is higher:

```text
round((regular - sale) / regular * 100)
```

The app discount price is a third number. Section 8 says when to show it. Card screens use the same price fields. Their badge rules are in [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md).

---

## 3. Bundle or variant

Read `attributes.variantType` first.

| `variantType` | Kind | What the customer picks |
|---|---|---|
| `simple`, or the field is missing and `variants` is empty | Simple | Nothing. One sale price. One **Add to cart** |
| `variants` | Variant | Color, size, or another option. Not a bundle |
| `bulk_bundles` | Bundle | Pack size only: Buy 1, Buy 2, Buy 3 |
| `variant_bundles` | Variant and bundle | Color, size, or option, and a pack size |

Older products have no `variantType`. Then:

- A row with `options.bundleQty` greater than 0 is a bundle pack.
- A row with `options.color`, `options.size`, or `options.option`, and no `bundleQty`, is a variant.
- Rows that have both a pack size and a color, size, or option are variant and bundle.

`hasVariants: false` and an empty `variants` array is a simple product.

### Variant row

```json
{
  "price": 64,
  "AED": 89,
  "sku": "ST4008-BLK",
  "stock": 4,
  "options": {
    "color": "Black",
    "size": "M",
    "image": "https://cdn.example.com/black.jpg"
  }
}
```

Show one picker per option key. Skip `bundleQty`, `image`, `imageSlot`, `optionLabel`, `tag`, and `bundleTitle`. Those are not picker labels.

| Key | Label |
|---|---|
| `color` | Color |
| `size` | Size |
| `option` | The value in `optionLabel`, or Option |
| `title` | Variant |

The selected row’s `price` is the sale price. Its `stock` greater than 0 means that choice can be added. `stock` may also be stored as `stockQuantity`.

### Bundle row

```json
{
  "price": 109,
  "sku": "ST4008-B2",
  "stock": 6,
  "options": {
    "bundleQty": 2,
    "bundleTitle": "",
    "imageSlot": 1
  }
}
```

Heading: **BUNDLE AND SAVE MORE!** Arabic: **وفّر أكثر مع الباقات!**

| `bundleQty` | Label when `bundleTitle` and `title` are empty |
|---|---|
| `1` | Buy 1 |
| `2` or more | Buy 2, Buy 3, and so on |

Use `options.bundleTitle` when it is set. On a bundle-only product, `options.title` is the next label. Each row shows that label, its own `price`, and its image when it has one.

The sale price is the selected pack’s `price`.

### Variant and bundle

The customer picks the color, size, or option first, then the pack. Match the row whose options equal the pick and whose `bundleQty` equals the pack. That row’s `price` is the sale price.

---

## 4. Images

`images` is the gallery, in order. Each entry is a URL string or an object. Read the URL from `url`, then `src`, then `path`.

The first image that is not a video is the main photo. Video files end in `.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`, `.avi`, or `.mkv`. If the first file is a video, show the next image as the poster and play the video in the gallery.

A variant image replaces the main photo while that variant is selected:

1. `options.image` when it is a URL.
2. Otherwise `options.imageSlot`. Slot `1` is the first product image, slot `2` is the second.

A bundle row uses the same two fields. When neither is set, keep the product gallery.

When the product has no image, use `https://store1920-images.s3.ap-south-1.amazonaws.com/uploads/placeholder.png`.

---

## 5. Add to cart

The button label is **Add to cart**. Hide it when the selected choice has no stock. A simple product is out of stock when `inStock` is false, or `stockQuantity` is 0.

One cart line per product `_id`. Changing the variant or the bundle replaces that line.

Keep the cart on the phone. After a signed-in add, also send the whole cart:

```http
POST https://www.hamody.com/api/cart
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

| Product | `price` | `quantity` | `variantOptions` |
|---|---|---|---|
| Simple | Product `price` | How many the customer chose | `{}` |
| Variant | Selected variant `price` | How many | The picked keys, such as `{ "color": "Black" }` |
| Bundle | Selected pack `price` | How many packs | `{ "bundleQty": 2 }` |
| Variant and bundle | Matched row `price` | How many packs | The picked keys plus `bundleQty` |

`sku` is the variant `sku` when that row has one, otherwise the product `sku`.

A guest does not call `POST /api/cart`. The phone keeps the same object and sends it later on `POST /api/orders` as `items`. Checkout is in [APP_CHECKOUT.md](./APP_CHECKOUT.md).

`401` on the cart call means the sign-in expired. Refresh the Firebase token and send the cart again. Do not drop the line from the phone.

---

## 6. Product badges

Two kinds sit on the product page. They are separate from the delivery time badge.

### On the photo

Load once and reuse:

```http
GET https://www.hamody.com/api/public/new-tag
```

No sign-in. `enabled` false, or `showOnImageOverlay` false, means draw nothing on the photo.

Paint a badge on the product image when `product.imageBadgeIds` contains that badge `id`, or when its `condition` matches this product. `condition` `new` uses `createdAt` and the root `displayDays`. `on-sale` means `AED` is higher than `price`. `out-of-stock` means `inStock` is false or every variant `stock` is 0. Arabic uses `labelAr`.

Place it with `placement`: `top-left`, `top-center`, `top-right`, `middle-left`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right`. Stack badges that share a corner about 4 px apart. Colors, shape, and size come from that badge object. The full condition list is in [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md).

### Under the title

Read `product.attributes.badges`. Each entry is a string, or `{ "label": "Best seller" }`. Skip an empty label.

Colors come from the appearance call in the next section, `productPageInfo.badgeSettings.badges`. Match `label` to the badge text, ignoring letter case.

| Field | Use |
|---|---|
| `backgroundColor` | Fill. Unknown labels use `#565959` |
| `textColor` | Default `#ffffff` |
| `borderRadius` | 0–24. The website uses `0` when the map has no radius |

Draw a wrap row under the title. Text is 12 px, bold, horizontal padding about 10 px. This row is not drawn on top of the photo.

---

## 7. Time badge

```http
GET https://www.hamody.com/api/store/appearance/sections/public
```

No sign-in. Read `timeBadges`.

Draw the delivery badge on the product page only when `timeBadges.placements.productPage` is true and this product `_id` is in that rule’s `productIds`. An empty `productIds` list matches no product.

Order, when the product is on more than one rule: `today`, `tomorrow`, `standard`, `customBadges`, `customDates`, `dayRanges`.

| Rule | Words when the seller left the label empty |
|---|---|
| `today` | Prefix `GET IN`. Arabic prefix `خلال`. The rest is the time left until `cutoff` |
| `tomorrow` | `express` and `Tomorrow`. Arabic `إكسبريس` and `غداً` |
| `standard` | `Standard` or `عادي`, then `date` and `time` |
| `customBadges` | The saved label, or `date` and `time` |
| `customDates` | `27 Oct delivery`, or `توصيل 27 أكتوبر` |
| `dayRanges` | `2-5 DAYS`, or `2-5 أيام` |

`cutoff` uses **Asia/Dubai**. A `countdown` style shows `prefix` plus the time left, such as `2 HR 15 MIN` or `2 س 15 د`, and updates about every 30 seconds. At or after the cutoff, if this product is not also on tomorrow, use the tomorrow look. If it is also on tomorrow, show `0 MIN`.

`common.rotate` true and more than one matching badge: show one at a time, every `rotateSeconds` (1–30, default 3). `rotate` false: show only the first badge.

On the product page the badge sits under the title. It is not the text badge row from section 6.

---

## 8. App discount price

The product call does not include `appDiscountEnabled`, `appDiscountType`, or `appDiscountValue`. Do not invent a lower price from `price` alone.

The server applies the discount when the app places the order, after the variant or bundle price is chosen:

```http
POST https://www.hamody.com/api/orders
X-Store1920-Client: app
X-Store1920-Platform: android
```

`X-Store1920-Platform` is `ios` on iPhone. A missing app header means the order keeps the website sale price.

| Type | App price |
|---|---|
| `percent` | `sale * (1 - value / 100)`. `value` is at most 100 |
| `amount` | `sale - value` |

`sale` is the selected variant or bundle `price`, otherwise the product `price`. Round to 2 decimals. Never below 0. If the result is not lower than `sale`, the order keeps `sale`. The discount does not run on a website offer token or a free gift.

On the product page, show the sale price and the regular price from section 2. The amount the customer pays is the line `price` in the order response after `POST /api/orders`. That is the app discount price.
