# HAMODY product badges for the app

Last updated: 27 October 2026  
Audience: Android and Flutter

Badges on a product card and on the product page. No login. Do not call `/api/store/product` or `/api/store/product/app-discount`.

The product itself comes from the public product calls the app already uses:

```http
GET https://www.hamody.com/api/products
GET https://www.hamody.com/api/products/by-slug?slug=
GET https://www.hamody.com/api/products/batch
```

Home, shop, category, brand, search, and offers lists use the same product fields. Prices are in AED. `price` is the selling price. `AED` or `mrp` is the compare-at price when it is higher than `price`.

---

## 1. What to draw

| Badge | Where | Source |
|---|---|---|
| Image badge | On the product photo | `GET /api/public/new-tag` plus the product |
| Delivery time | Under the price on a card. Under the title on the product page when that placement is on | `timeBadges` on `GET /api/store/appearance/sections/public` |
| Text badge | Product page, under the title area | `product.attributes.badges` plus `productPageInfo.badgeSettings` |
| Sale percent | Next to the price | Compare `price` with `AED` or `mrp` |
| App discount | Charged at checkout. The product calls do not return it | `POST /api/orders` with the app header |

A product can show more than one image badge and more than one delivery badge.

---

## 2. Image badges

```http
GET https://www.hamody.com/api/public/new-tag
```

No login. Cached for about 1 minute. Keep the last good copy on the device.

```json
{
  "enabled": true,
  "displayDays": 5,
  "showOnImageOverlay": true,
  "badges": []
}
```

`enabled` false means draw no image badges. `showOnImageOverlay` false means the same: do not paint them on the photo.

Each badge:

| Field | Meaning |
|---|---|
| `id` | Stable id. A product’s `imageBadgeIds` lists the badges pinned to that product |
| `enabled` | `false` hides this badge |
| `label` / `labelAr` | English and Arabic words |
| `placement` | `top-left`, `top-center`, `top-right`, `middle-left`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right` |
| `backgroundColor`, `textColor`, `borderColor` | `#rrggbb`, or `transparent` for the fill and border |
| `borderWidth` | 0–8. `0` means no border |
| `fontFamily` | `sans`, `serif`, `display` (Poppins), `mono`, `script` |
| `fontWeight` | `400`–`800` |
| `textTransform` | `uppercase`, `capitalize`, `lowercase`, `none` |
| `shape` | `pill`, `rounded`, `square`, `tag`, `circle` |
| `size` | `small`, `medium`, `large` |
| `shadow` | `none`, `soft`, `strong` |
| `offset` | `tight`, `normal`, `loose` — distance from the photo edge |
| `opacity` | 50–100 |
| `letterSpacing` | `tight`, `normal`, `wide` |
| `condition` | When the badge appears. See below |
| `conditionValue` | Days for `new` is `displayDays` on the root. For `low-stock` this is the quantity, default 5 |
| `productIds` | Product ids. Empty means every product, unless `condition` is `products` |
| `categoryIds`, `categoryNames` | Category limits |
| `tags` | Product tag limits |
| `priceMin`, `priceMax` | Price limits. `null` means that side is open |

At most 8 badges.

### When a badge shows

Skip a badge when `enabled` is false.

Show it when the product’s `imageBadgeIds` contains that badge `id`.

Otherwise show it when the condition matches:

| `condition` | Show when |
|---|---|
| `always` | Every product |
| `none` | Every product, after the limits below |
| `products` | The product id is in `productIds`. An empty list shows nothing |
| `category` | The product `category` or `categories` matches `categoryIds` or `categoryNames`. An empty list shows nothing |
| `tag` | The product `tags` include one of `tags`. An empty list shows nothing |
| `price` | `price` is inside `priceMin` and `priceMax`. Both empty shows nothing |
| `new` | `createdAt` is within `displayDays` days. A future `createdAt` still counts |
| `on-sale` | `AED` or `mrp` is higher than `price`, and `price` is above 0 |
| `out-of-stock` | `inStock` is false, or stock is 0. With variants, out of stock means every variant stock is 0 |
| `low-stock` | Still in stock, and `stockQuantity` is from 1 through `conditionValue` |
| `fast-delivery` | `fastDelivery` is true |
| `free-shipping` | `freeShippingEligible` is true |

If `productIds`, categories, tags, or a price range are set, the product must match those too, on top of the condition.

Arabic uses `labelAr`.

### How to draw it

On top of the product photo. Stack badges that share a `placement`, about 4 px apart. Top placements stack downward. Bottom placements stack upward.

| `size` on a card | Text |
|---|---|
| `small` | about 9 px |
| `medium` | about 10 px |
| `large` | about 12 px |

| `offset` | Inset from the photo edge |
|---|---|
| `tight` | about 4 px |
| `normal` | about 8 px |
| `loose` | about 12 px |

| `shape` | Corners |
|---|---|
| `pill`, `circle` | Fully round. A circle is at least about 22 px |
| `rounded` | About 6 px |
| `square` | About 2 px |
| `tag` | A small notch on the end edge |

`letterSpacing` `tight` is `-0.02em`, `normal` is `0.02em`, `wide` is `0.14em`. `shadow` `soft` is a light shadow, `strong` is a heavier one.

---

## 3. Delivery time badge

```http
GET https://www.hamody.com/api/store/appearance/sections/public
```

No login. Cached for about 2 minutes. Read `timeBadges`.

A product shows a delivery badge only when its `_id` is in that rule’s `productIds`. An empty `productIds` list matches no product.

```json
{
  "timeBadges": {
    "today": { "enabled": true, "style": "countdown", "prefix": "GET IN", "prefixAr": "خلال", "label": "Today", "labelAr": "اليوم", "cutoff": "20:00", "productIds": [] },
    "tomorrow": { "enabled": true, "style": "express", "prefix": "express", "prefixAr": "إكسبريس", "label": "Tomorrow", "labelAr": "غداً", "productIds": [] },
    "standard": { "enabled": true, "style": "express", "prefix": "Standard", "prefixAr": "عادي", "label": "", "labelAr": "", "date": "", "time": "", "productIds": [] },
    "customBadges": [],
    "customDates": [],
    "dayRanges": [],
    "placements": { "allCards": true, "productPage": false, "pages": [] },
    "common": { "rotate": true, "rotateSeconds": 3, "hover": "none" }
  }
}
```

Order, for a product that is listed on more than one rule: today, tomorrow, standard, `customBadges`, `customDates`, `dayRanges`.

| Rule | Label when the seller left it empty |
|---|---|
| today | Prefix `GET IN` / `خلال`. Countdown uses the cutoff |
| tomorrow | `express` + `Tomorrow`, or `إكسبريس` + `غداً` |
| standard | `Standard` / `عادي`, then `date` and `time` such as `27 Oct, 8:00 pm` |
| customBadges | The saved label, or `date` and `time` |
| customDates | `27 Oct delivery`, or `توصيل 27 أكتوبر` |
| dayRanges | `2-5 DAYS`, or `2-5 أيام` |

`cutoff` and clocks use **Asia/Dubai**.

### Styles

| `style` | Draw |
|---|---|
| `countdown` | One pill. Text is `prefix` plus the time left until `cutoff`. `2 HR 15 MIN`, or `2 س 15 د`. Update about every 30 seconds. At or after the cutoff, if this product is not also on tomorrow, switch to the tomorrow look. If it is also on tomorrow, show `0 MIN` |
| `express` | Two parts. The prefix sits on `accentColor` / `accentTextColor`. The label sits on `backgroundColor` / `textColor` |
| `pill` | One pill. `prefix` and `label` in one line on `backgroundColor` |
| `repeat` | One bar. The icon and the words (`prefix` and `label` in one line) are drawn twice, side by side, on `backgroundColor` with `textColor`. No arrow. Default fill `#ddd6fe`, text `#5b35d5`, lightning icon |

Shared look: `fontSize` 8–28, `fontWeight` `500`–`800`, `fontFamily` `sans` or `serif`, `italic`, `uppercase`, `shape` `pill` (fully round), `rounded`, or `square`. `icon` is `lightning`, `plus`, or `none`. A `logo` URL replaces the icon. `arrow` true adds a small chevron after a pill.

### Where

`placements.productPage` true: draw under the title on the product page.

`placements.allCards` true: draw under the price on every product card.

`placements.allCards` false: draw only on the card screens listed in `placements.pages`: `home`, `shop`, `category`, `brand`, `search`, `new`, `bestSellers`, `offers`, `landing`, `slider`, `related`, `cart`, `other`.

`common.rotate` true and more than one badge: show one at a time, every `rotateSeconds` (1–30, default 3), with a short fade. `rotate` false: show only the first badge. `hover` is for the website. The phone can ignore it.

---

## 4. Product page text badges

On `GET /api/products/by-slug`, read `attributes.badges`. Each entry is a string, or `{ "label": "Best seller" }`.

Colors come from the same appearance call, `productPageInfo.badgeSettings.badges`:

| Field | Meaning |
|---|---|
| `label` | Match this to the badge text, ignoring letter case |
| `backgroundColor` | Fill. Unknown labels use `#565959` |
| `textColor` | Default `#ffffff` |
| `borderRadius` | 0–24 |

Draw them in a wrap row under the title area. About 12 px, bold, horizontal padding about 10 px. This row is separate from the image badges and the delivery badge.

---

## 5. Sale price on the card

When `AED` or `mrp` is higher than `price`, and `price` is above 0:

- Show `price` as the current price.
- Show `AED` or `mrp` struck through.
- The percent is `round((compare - price) / compare * 100)`.

This is the website sale. It is not the app discount.

---

## 6. App discount

`GET /api/products` and `GET /api/products/by-slug` do not include `appDiscountEnabled`, `appDiscountType`, or `appDiscountValue`. Do not invent an app-only price on the card from those calls.

The server applies the discount when the app places the order:

```http
POST https://www.hamody.com/api/orders
X-Store1920-Client: app
X-Store1920-Platform: android
```

`X-Client: app`, `mobile`, or `flutter` also marks the request as the app. `X-Platform: ios` is the iPhone app.

The discount runs on the selling price after the variant price is chosen. It does not run on a website offer token or a free gift.

| Type | App price |
|---|---|
| `percent` | `price * (1 - value / 100)`, value at most 100 |
| `amount` | `price - value` |

Round to 2 decimals. Never below 0. If the result is not lower than `price`, the order keeps `price`.

The line price in the order response is the price the customer pays.

---

## 7. Checklist

- Load `GET /api/public/new-tag` once and reuse it.
- Paint image badges from `badges` when `imageBadgeIds` contains the id, or when `condition` matches the product.
- Load `GET /api/store/appearance/sections/public` and read `timeBadges`.
- Draw a delivery badge only when the product `_id` is in that rule’s `productIds`.
- Countdown uses Asia/Dubai and `cutoff`.
- Product page text badges come from `attributes.badges`, colored by `productPageInfo.badgeSettings`.
- Strike through `AED` or `mrp` when it is higher than `price`.
- Send `X-Store1920-Client: app` on `POST /api/orders` so the app discount is applied. Do not calculate that discount from the product list.
