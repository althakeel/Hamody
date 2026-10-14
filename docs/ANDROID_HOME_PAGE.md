# Store1920 home page — Android

Last updated: 12 October 2026  
Audience: Android app  
Website: `https://www.store1920.com`  
API root: `https://www.store1920.com/api`  
Web source: `app/(public)/HomePageClient.jsx`

This file is only the home scroll. The phone navbar is [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md). Banner 2 field detail is [ANDROID_BANNER_2.md](./ANDROID_BANNER_2.md). The product card is [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

No login on the public calls below. Do not send `Authorization` on them. The only home call that needs a token is recently viewed, and only after the customer is signed in.

Send `Accept-Language: en` or `ar`. Arabic changes names and which banner file is used. Sliders still move left to right.

---

## 1. Currency mark

Do not print the letters **AED** next to a price.

Draw this symbol, then the number:

```
https://www.store1920.com/currency/aed-dirham.png
```

| Piece | Rule |
|---|---|
| Size | About **0.68em** of the price text, with a small gap before the number |
| Sale price | Tint the symbol `#020617`, same as the number. **14px**, semibold. Whole number, no decimals |
| Old price | Same symbol, tinted `#94a3b8`, struck through with the number. **10px**. Show only when it is higher than the sale price |
| JSON field `AED` | That field is the old price **number**. It is not the label |

The website paints the symbol with a mask so it takes the text color. On Android, tint the bitmap the same way. A plain black bitmap on a dark price is wrong.

---

## 2. Page chrome

| Piece | Phone |
|---|---|
| Background | White |
| Space between blocks | **24px** |
| Content width | At most **1400px**, **16px** side padding |
| Product grid | **2 columns**, **12px** gap. Card rules are in the product-card doc |
| Empty block | Leave it out. Do not show a blank gray box |
| Loading | Pulse in the same height as the block you are waiting for |

The “All categories” column inside the showcase is desktop only. Do not draw it on a phone.

---

## 3. The home list

Draw the blocks in this order. Skip a row when its “Show when” check fails.

Banner 2 is one slider. It appears in **one** of the three slots, chosen by `config.secondaryBannerSliderPlacement`. Unknown values mean `above_top_deals`.

The mid-page banner and the category sliders do not both show. If `GET /api/public/featured-sections` returns one or more sections, draw the category sliders and hide the mid-page banner. If that list is empty, draw the mid-page banner and hide the category sliders.

| # | Block | Show when | API |
|---|---|---|---|
| 1 | Shorter hero | `fullWidthBannerEnabled` is not true, and `mainBannerEnabled` is true, and `mainBannerImage` is not empty | `GET /api/public/shop-showcase` |
| 2 | Full-bleed hero | `fullWidthBannerEnabled` is true and at least one slide has an image | same |
| 3 | Lower full-width strip | `lowerFullWidthBannerEnabled` is true and at least one slide has an image | same |
| 4 | Top banner | `topBannerEnabled` is true **and** the full-bleed hero is off | same |
| 5 | Bottom banner | `bottomBannerEnabled` is true **and** the full-bleed hero is off | same |
| 6 | Small promo carousel | `productBanners` has at least one image. Maximum **4** | same, `config.productBanners` |
| 7 | Banner 2 | Placement is `below_small_banners`, the slider is not disabled, and a slide has an image | same, `config.secondaryBannerSlider*` |
| 8 | Category icon row | A home section has `sectionType` `hero_categories` or `section` `home_categories_slider`, and `isActive` is not false | `GET /api/home/sections` plus `GET /api/store/home-menu-categories` |
| 9 | Featured products | The product list is not empty | `GET /api/store/featured-products?includeProducts=true&limit=12` |
| 10 | Mid-page banner | Featured-sections list is **empty**, the slider is not disabled, and a slide has an image | shop-showcase `config.bannerSlider*` |
| 11 | Banner 2 | Placement is `above_top_deals` (this is the default) | shop-showcase |
| 12 | Top deals | The `top_deals` section exists, `isActive` is not false, and products come back | `GET /api/home/sections`, then products |
| 13 | Banner 2 | Placement is `below_top_deals` | shop-showcase |
| 14 | Category sliders | Featured-sections list is **not** empty | `GET /api/public/featured-sections` |
| 15 | Explore your interests | Always, when a tab has products | `GET /api/categories` and `GET /api/products` |
| 16 | Recently viewed | The customer has viewed products. Hide when the list is empty | `GET /api/browse-history` when signed in |
| 17 | Recommended | `enabled` is not false and `productIds` is not empty | `GET /api/store/explore-interests/public` |

Call these together on first open:

```
GET /api/public/shop-showcase
GET /api/home/sections
GET /api/store/home-menu-categories
GET /api/store/featured-products?includeProducts=true&limit=12
GET /api/store/appearance/sections/public
GET /api/public/featured-sections
GET /api/categories
GET /api/store/explore-interests/public
```

Then, only if a block needs product cards that were not already in the response:

```
POST /api/products/batch
{ "productIds": ["..."] }
```

```
GET /api/products?limit=60&slim=true
GET /api/products?category={slug}&limit=60&slim=true&inStockOnly=true
```

A `link` that starts with `/` opens an in-app screen. `https://` opens the browser. Ignore `javascript:` and `data:` links.

---

## 4. Block designs

### 1–5. Heroes and wide banners

One call, `GET /api/public/shop-showcase`. Read `config`.

Phone image order. Use the first URL that is not empty.

| Language | Order |
|---|---|
| English | `mobileImage`, `tabletImage`, `image` |
| Arabic | `mobileImageAr`, `mobileImage`, `tabletImageAr`, `tabletImage`, `imageAr`, `image` |

| Block | Height | Autoplay | Corners |
|---|---|---|---|
| Shorter hero | `mainBannerMobileHeight`. Default **100**. Clamp **80–700** | **5000** ms | Inset with the page padding |
| Full-bleed hero | Height follows the image. Do not force a fixed box | `fullWidthBannerSliderInterval` ms. Default **4000**. Range **2000–15000** | Square to the screen edge. No side inset |
| Lower strip | `lowerFullWidthBannerDesktopHeight` is the seller height. Default about **200**. On a phone, scale with the image | `lowerFullWidthBannerSliderInterval`. Default **4000** | Inside the **1400** column, **16px** side padding. Radius and border come from `lowerFullWidthBannerRadius`, `lowerFullWidthBannerBorderWidth`, `lowerFullWidthBannerBorderColor` |
| Top banner | Fill the banner box | `topBannerSliderInterval`. Default **4000** | **12px** |
| Bottom banner | Fill the banner box | `bottomBannerSliderInterval`. Default **4000** | **12px** |

Arrows and dots only when there are **2 or more** slides. One slide is a still image.

| Control | Design |
|---|---|
| Arrows | Vertically centered, **12px** in from the edge. Style `bannerArrowStyle`, default `circle`. Size `bannerArrowSize`: `sm` **28**, `md` **36**, `lg` **44**. Icon color `bannerArrowColor` default `#0f172a`. Fill `bannerArrowBgColor` default `#ffffff` |
| Dots | Centered, **12px** above the bottom. Active pill **28×10** white. Idle circle **10×10** white at about 45% |

Title, subtitle, and button are drawn only when that line’s switch is true **and** the text is not empty. If the words are already inside the picture, leave the switches off. Do not draw a second title on top of the photo.

| Line | Full-bleed | Shorter hero | Top | Bottom |
|---|---|---|---|---|
| Title | `fullWidthBannerTitle` / `fullWidthBannerTitleEnabled` | `mainBannerTitle` / `mainBannerTitleEnabled` | `topBannerTitle` / `topBannerTitleEnabled` | `bottomBannerTitle` / `bottomBannerTitleEnabled` |
| Subtitle | `fullWidthBannerSubtitle` / `SubtitleEnabled` | `mainBannerSubtitle` / `SubtitleEnabled` | `topBannerSubtitle` / `SubtitleEnabled` | `bottomBannerSubtitle` / `SubtitleEnabled` |
| Button | `fullWidthBannerCtaText`, `CtaEnabled`, `CtaBgColor`, `CtaTextColor` | `mainBannerCta*` | `topBannerCta*` | `bottomBannerCta*` |

Arabic copies use the `Ar` suffix (`fullWidthBannerTitleAr`, and the same pattern on the other banners). If the Arabic field is empty, use English.

Button colors default to background `#ef2d2d` and text `#ffffff`. Full-bleed title, when the switch is on, is white, about **22px**, extra bold.

Slide lists: `fullWidthBannerSliderItems`, `lowerFullWidthBannerSliderItems`, `topBannerSliderItems`, `bottomBannerSliderItems`. The shorter hero is a single `mainBannerImage`, not a list. Each list holds at most **8** slides. A slide with no image is dropped.

Arrow and slide field detail is also in [FLUTTER_HOME_HERO.md](./FLUTTER_HOME_HERO.md).

### 6. Small promo carousel

`config.productBanners`. Keep the first **4** items that have an image.

On a phone this is one full-width slide at a time, not a 4-column grid. The 4-column grid is desktop.

| Piece | Phone |
|---|---|
| Aspect | **1225 / 639** |
| Image | Fill the box, crop from the center |
| Corners | **2px**. Border **1px** `#eeeeee` |
| Motion | **700ms** ease-in-out. Direction stays left to right |
| Autoplay | **3500** ms when there are 2 or more slides |
| Dots | Centered, about **10px** above the bottom. Idle **7px** circle, white at 45%. Active is the same circle, solid white, scaled to **1.15** |
| Tap | `link` on that banner. Empty means the slide does not navigate |

### 7, 11, 13. Banner 2

Full design and fields: [ANDROID_BANNER_2.md](./ANDROID_BANNER_2.md).

Phone height default **120** (clamp 80–600). Full width. Autoplay default **3000** ms. Dots only when there is more than one slide.

### 8. Category icon row

`GET /api/store/home-menu-categories` returns `{ count, items }`. Each item is `name`, `image`, `url`, `categoryId`.

Draw the row only when section 3’s home-sections check passes and `items` is not empty.

| Piece | Phone |
|---|---|
| Layout | Horizontal row. Side padding **16px**. Gap **16px**. Snap while scrolling |
| Icon | **80×80**, radius **8px**, background `#f3f4f6`, image cropped to fill |
| Label | Under the icon, **10px**, medium, 2 lines, centered |
| Tap | `url` when it is set. Otherwise open the category for `categoryId` |

### 9. Featured products

```http
GET /api/store/featured-products?includeProducts=true&limit=12
```

Use `products`. Title is `sectionTitleAr` when the language is Arabic and that field is not empty, otherwise `sectionTitle`. Description uses `sectionDescription` / `sectionDescriptionAr` the same way. Defaults when those fields are empty: title **Craziest sale of the year!**, description **Grab the best deals before they're gone!**

Layout comes from `GET /api/store/appearance/sections/public` → `homeMenuCategories`.

| Field | Rule |
|---|---|
| `style` | `carousel` or `horizontal` means a sideways row. Anything else is a grid |
| `itemsPerRow` | 1–10. Default **6**. On a phone the grid is still **2 columns**. This number is the desktop column count |
| `rows` | 1–6. Default **2**. Visible count is `itemsPerRow × rows`, capped at **40** |

| Piece | Phone |
|---|---|
| Title | Centered, **24px**, semibold, `#1e293b` |
| Description | Centered, **14px**, `#475569`, **8px** under the title |
| Grid | **2 columns**, **12px** gap, **24px** under the title |
| Carousel | Same cards in a horizontal row, arrows on the phone, **12px** gap |
| Price | Dirham symbol from section 1, then the whole number |

Hide the block when `products` is empty.

### 10. Mid-page banner

Same component as Banner 2, but the fields are `bannerSliderEnabled`, `bannerSliderItems`, `bannerSliderMobileInterval` (default **4000**), `bannerSliderMobileHeight` (default **120**).

Draw it only when the featured-sections list is empty. When that list has sections, this banner is not on the home page.

### 12. Top deals

`GET /api/home/sections`. Find the section whose `section` is `top_deals`, `top-deals`, or `topdeals`. Hide the block when that section is missing or `isActive` is false.

Title is `titleAr` in Arabic when it is not empty, otherwise `title`. **16px**, semibold, `#111827`, **16px** under it. No eyebrow.

Products, at most **12**:

| `sectionType` | How to load |
|---|---|
| `manual` and `productIds` is not empty | `POST /api/products/batch` with the first 12 ids |
| `category` is set | `GET /api/products?category={category}&limit=12&inStockOnly=true` |
| anything else | Hide the block |

Phone grid is **2 columns**, **12px** gap. Same product card. Hide the block when the product list comes back empty.

### 14. Category sliders

```http
GET /api/public/featured-sections
```

Field list, app image ratios, and what not to call are in [ANDROID_CATEGORY_SLIDER.md](./ANDROID_CATEGORY_SLIDER.md).

Read `sections`. Each section already includes `products`. Drop a section whose product list is empty.

| Piece | Phone |
|---|---|
| Space between sections | **16px** |
| Side image | Desktop only. Do not draw `sideImage` or `sideImageAr` on a phone |
| App image | English uses `mobileImage`, then `mobileImageAr`. Arabic uses `mobileImageAr`, then `mobileImage`. Hide the image when both are empty. Frame it with `mobileImageRatio` (`3:4`, `2:4`, `4:5`, `1:1`, or `9:16`). `mobileImageWidth` and `mobileImageHeight` are the two numbers in that ratio |
| Panel | Radius **16px**, padding **12px**. Background is `backgroundColor` |
| Title | `titleAr` in Arabic when set, otherwise `title`. **20px**, bold, `#111827` |
| Subtitle | **12px**, `#6b7280`, only when it is not empty |
| Cards | Horizontal row. About **2.5** cards visible. **12px** gap |
| Autoplay | When `autoSlide` is true and there is more than one product. Interval `autoSlideIntervalMs` |
| Arrows | Show them when autoplay is off |

### 15. Explore your interests

Title is fixed: **Explore your interests**. Arabic: **استكشف اهتماماتك**. **20px**, bold, `#111827`, aligned to the start of the language.

Chips are a horizontal row under the title.

| Chip | Design |
|---|---|
| Shape | Pill, **16px** horizontal padding, **10px** vertical, **14px** semibold |
| Idle | White, border `#e5e7eb`, text `#334155` |
| Active | Background `#f9fafb`, text `#0f172a`, light ring |
| First chip | **Recommended** / **موصى به**. Products from `GET /api/products?limit=60&slim=true` |
| Later chips | Category names from `GET /api/categories`. Products from `GET /api/products?category={slug}&limit=60&slim=true` |

The product grid under the chips is **2 columns**, **12px** gap, **20px** under the chips. **Load more** is a white pill, border `#cbd5e1`, **14px** semibold, centered, when more products remain.

Empty tab: centered message **No products found in this category.**

### 16. Recently viewed

Hide the whole block when there is nothing to show. Maximum **8** products.

| Customer | Source |
|---|---|
| Signed in | `GET /api/browse-history` with `Authorization: Bearer {firebaseIdToken}`. Use `history[].product` |
| Guest | The ids the app stored while they opened products. Hydrate with `POST /api/products/batch` |

| Piece | Design |
|---|---|
| Eyebrow | **Your History**. **12px**, bold, uppercase, wide tracking, `#ea580c` |
| Title | **Recently Viewed Products**. **20px**, bold, `#111827` |
| Subtitle | **Products you've recently checked out**. **14px**, `#6b7280` |
| View all | **14px**, semibold, `#374151`, links to the recently viewed screen |
| Grid | **2 columns**, **12px** gap |

### 17. Recommended

```http
GET /api/store/explore-interests/public
```

```json
{ "enabled": true, "productIds": ["..."] }
```

Hide the block when `enabled` is false or `productIds` is empty. Load the cards with `POST /api/products/batch`. Show at most **10**.

| Piece | Design |
|---|---|
| Eyebrow | **Personalized**. **12px**, bold, uppercase, `#2563eb` |
| Title | **Recommended for You**. **20px**, bold, `#111827` |
| Subtitle | Hidden on a phone |
| View all | **14px**, semibold, `#374151`, opens the recommended screen |
| Row | Horizontal product cards, about **2.5** visible, **12px** gap |

---

## 5. Not on this page

| Leave out | Why |
|---|---|
| Navbar, search, cart badge, menu drawer | [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md) |
| App-only large hero, small strips, promo cards, tile banners | Those are `/store/mobile-features`. They are not this website home list |
| Seller routes under `/api/store/preferences` and `/api/store/mobile-*` writes | Customer app reads the public GETs only |
| Footer | Not part of the home scroll |
| Welcome popup | A dialog, not a block in this list |
