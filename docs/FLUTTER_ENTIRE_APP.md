# Store1920 customer app — full Flutter specification

Last updated: 9 October 2026  
Audience: Flutter developers building the Store1920 shopper app  
Website: `https://www.store1920.com`  
API root: `https://www.store1920.com/api`

This is the document to share for the **entire customer app**. It maps every shopper screen on the website to the screen and API the Flutter app should use. The app must match the **mobile website** (the phone layout under 768px wide): same screens, same product card, same products, prices, language, cart, checkout, and seller-controlled content. Desktop columns, hover effects, and sidebars are not the app.

Deeper field lists (request bodies, order document, WhatsApp OTP) stay in the linked files. Do not invent a second backend.

---

## 1. What this app is

Build the **shopper** app only.

| Build | Do not build |
|---|---|
| Home, shop, search, category, brand, product | Seller dashboard (`/store`, `/api/store` writes) |
| Cart, checkout, orders, addresses, wishlist | Platform admin (`/admin`, `/api/admin`) |
| Account, wallet, reviews, returns, support | Warehouse app (`/api/warehouse`) |
| Blogs, policies, offers, spin, landing pages | Payment webhooks, crons, Zoho, courier admin |
| English and Arabic | A separate product database |

Sellers change the look of the store on the website. The app **reads** those settings. It does not include the seller editor.

Currency is **AED**. Store is in the UAE.

---

## 2. Rules for every request

| Item | Value |
|---|---|
| Production host | `https://www.store1920.com` |
| Auth | Firebase. Send `Authorization: Bearer <Firebase ID token>` |
| Guest | No token. Send `isGuest` and guest contact when the endpoint asks for it |
| Language | `Accept-Language: en` or `ar`. Arabic layout is RTL |
| Store id | `GET /api/public/tracking-context` → `storeId`. Send it when an endpoint accepts `storeId` |
| Device id | One stable `anonymousId` per install (abandoned cart, analytics) |
| Images | Use the URL the API returns. Do not rebuild S3 paths |
| 401 | Refresh the Firebase ID token (`getIdToken(true)`) and retry once |

There is no Store1920 password API. Sign-in is Firebase (email, Google, phone). WhatsApp OTP is a separate flow that returns a Firebase custom token: [FLUTTER_WHATSAPP_OTP_AUTH.md](./FLUTTER_WHATSAPP_OTP_AUTH.md).

Password policy, lockout, CAPTCHA, and sessions: [AUTH_SECURITY.md](./AUTH_SECURITY.md).

---

## 3. App shell

### 3.1 Bottom bar

Five items. English left to right: **Home, Shop, center circle, Cart, Account**. Arabic mirrors the row.

The center circle is **not hardcoded**. Color, image, text, animation, and link come from:

```http
GET /api/store/appearance/sections/public
```

Read `offersPage.bottomNavMode`, `bottomNavImageUrl`, `bottomNavCircleText`, `bottomNavBelowText`, `bottomNavBelowTextAr`, `bottomNavHref`, `bottomNavBackgroundColor`, `bottomNavAnimation`, and `navGifUrl`.

Pixel sizes, animation timings, and link routing are in [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md). Follow that file exactly for the circle.

While that response is loading, show a gray skeleton circle. Do not flash a percent icon.

Hide the bar on a product detail screen, same as the website.

### 3.2 Language

The website is bilingual.

- English: LTR
- Arabic: RTL, Arabic product and category fields (`nameAr`, `descriptionAr`, and the same pattern on other content)
- If an Arabic field is empty, show the English field

### 3.3 Navbar color

Side icons on the bottom bar use the store navbar color when active:

```http
GET /api/store/navbar-menu
```

Field `backgroundColor`. Empty means keep the inactive gray `#94a3b8`.

---

## 4. Screens

Each row is a website URL, the app screen, and the API to load it.

### 4.1 Start and home

| Website | App screen | API |
|---|---|---|
| `/` | Home | See call order below |
| App-only banners | Home hero, strips, cards, tiles | `GET /api/public/mobile-features` |

Home call order:

```
1. GET /api/public/tracking-context
2. In parallel:
   GET /api/public/mobile-features?storeId={storeId}
   GET /api/public/shop-showcase
   GET /api/store/home-menu-categories
   GET /api/store/featured-products?includeProducts=true&limit=12
   GET /api/home/sections
   GET /api/public/featured-sections
   GET /api/public/category-sliders
   GET /api/store/explore-interests/public
   GET /api/categories
   GET /api/store/appearance/sections/public
3. If a section only returns product ids:
   POST /api/products/batch   { "productIds": ["..."] }
```

Banner hide rule: if `enabled` is false or the slide/tile list is empty, do not render that block.

Banner field detail: [MOBILE_FEATURES_DOCUMENTATION.md](./MOBILE_FEATURES_DOCUMENTATION.md).  
Home API notes: [MOBILE_HOME_PAGE_APIS.md](./MOBILE_HOME_PAGE_APIS.md).

| Home block | API |
|---|---|
| Large hero, small strips, promo cards, category tiles | `GET /api/public/mobile-features` or the four `/api/store/mobile-*` GETs |
| Website showcase (if you mirror the site hero) | `GET /api/public/shop-showcase` |
| Category icons | `GET /api/store/home-menu-categories` |
| Featured products | `GET /api/store/featured-products?includeProducts=true` |
| Top deals / home sections | `GET /api/home/sections` |
| Featured sliders | `GET /api/public/featured-sections` |
| Category sliders | `GET /api/public/category-sliders` |
| Explore / recommended | `GET /api/store/explore-interests/public` |
| Welcome popup | `offersPage` is separate. Popup config is inside appearance sections. Record events with `POST /api/public/home-popup-event` |
| Recently viewed | `GET /api/browse-history` after login |

A banner `link` or `path` that starts with `/` opens an in-app screen. `http` opens the in-app browser.

### 4.1.1 Home designs — how many, and what the seller can change

The home screen is **not one fixed layout**. There are **11 blocks**. Draw them in the order returned by `homeLayout.sections`. Skip a block when `enabled` is false, or when its images / products are empty.

```http
GET /api/public/mobile-features
```

Read `mobileFeatures.homeLayout.sections`. Each item is `{ id, enabled, label, path }`. Default order:

| # | `id` | What it looks like | Same as the website | Seller page |
|---|---|---|---|---|
| 1 | `shop-showcase` | Website banner stack (see below) | Yes | `/store/preferences` |
| 2 | `banner-slider` | Large hero slider, full width | App only | `/store/mobile-features/banners` |
| 3 | `small-banners` | Thin promo strips | App only | `/store/mobile-features/small-banners` |
| 4 | `promo-cards` | Taller promo cards | App only | `/store/mobile-features/promo-cards` |
| 5 | `tile-banners` | Two-column picture tiles | App only | `/store/mobile-features/tile-banners` |
| 6 | `home-menu` | Round category icons in a row | Yes | `/store/storefront/home-menu-categories` |
| 7 | `featured-products` | Product grid with a title | Yes | `/store/featured-products` |
| 8 | `home-sections` | Top deals product grid | Yes | `/store/customize/top-deals` |
| 9 | `featured-sections` | One slider per category | Yes | `/store/category-slider` |
| 10 | `explore` | Tabs of interest, then products | Yes | `/store/explore-interests` |
| 11 | `categories` | Category list / grid | Yes | `/store/categories` |

The seller can turn any of these off and drag them into a new order. Do not hardcode this table as the only order. Use the array from the API. If a new id appears later, skip it until you support it.

#### Four app-only banner designs

These four are **not** on the website. They exist only for the app. Hide a design when `enabled` is false or it has no image.

| Design | JSON key | Max images | Height | Auto-slide | Look |
|---|---|---|---|---|---|
| Large hero | `bannerSlider` | 8 | default **168** px, seller can set **100–400** | **2–30** seconds, default **4** | One full-width image at a time. Dots or swipe. |
| Small strips | `smallBanners` | 12 | default **68** px, range **40–200** | same interval | Short full-width strip under the hero. |
| Promo cards | `promoCards` | 8 | default **132** px, range **80–300** | same interval | Larger card. Optional **Ad** badge when `showAdBadge` is true. |
| Category tiles | `tileBanners` | 12 | no height setting | no auto-slide | **2 columns**. Each tile has image, title, subtitle, and a button (default label `Shop`). |

Every slide has `image`, `path` (use this for the tap; if missing use `link`), and optional `title`. Empty path becomes `/shop`.

Large hero extra setting: **Use website home banners**. When that is on, `bannerSlider.source` may be `website-shop-showcase`. Still draw it as the large hero. Do not call a second API for that case.

#### Website home designs (block `shop-showcase`)

`GET /api/public/shop-showcase` is the same banner stack the website home uses. The large photo with arrows and dots is specified on its own in [FLUTTER_HOME_HERO.md](./FLUTTER_HOME_HERO.md). The seller edits it under **Banner section** (`/store/preferences`). Draw only the pieces that are enabled and have an image.

Top to bottom on the website:

| # | Design | Setting that shows it | Notes |
|---|---|---|---|
| 1 | Full-bleed slider **or** a shorter hero | `fullWidthBannerEnabled` | If full-bleed is on, the shorter hero is hidden. Desktop art the seller is asked to upload is **2746 × 572**. On a phone, use the mobile image when the API sends one (`mobileImage`), otherwise the desktop image. Height follows `fullWidthBannerDesktopHeight` (website slider is about **350–500** px tall on desktop; scale it down on a phone). |
| 2 | Top banner | `topBannerEnabled`, and full-bleed is off | Image, optional title, subtitle, and button. Each of those can be turned off (`topBannerTitleEnabled`, `topBannerSubtitleEnabled`, `topBannerCtaEnabled`). |
| 3 | Bottom banner | `bottomBannerEnabled`, and full-bleed is off | Same options as the top banner. |
| 4 | 4-grid | images in the showcase grid | Up to four image or product tiles. |
| 5 | Small banners inside the showcase | showcase small-banner list | A row of smaller linked images. |
| 6 | Second slider | `secondaryBannerSliderEnabled` and at least one image | Seller picks where it sits: `below_small_banners`, `above_top_deals` (default), or `below_top_deals`. |

Arrow style, colors, and auto-slide interval are in the same showcase JSON. Use them. Do not draw a banner that has no image.

#### The rest of the website home, under the banners

After the showcase, the website draws these, and only when they have data:

| # | Design | When it shows | Customization |
|---|---|---|---|
| 7 | Category icon row | A home section of type `hero_categories` / `home_categories_slider` is active | Icon, name, link. Count per row comes from appearance `homeMenuCategories.itemsPerRow` (default **5**, max **10**). |
| 8 | Featured products | Products were chosen | Title and subtitle in English and Arabic. Seller picks products manually, by category, or by tags. Default title `Craziest sale of the year!`. |
| 9 | Top deals grid | Home section `top_deals` is active | Product grid, about **2 columns** on a phone. |
| 10 | Category sliders | At least one featured section exists | Horizontal product row per category, with that category’s title. |
| 11 | Explore your interests | Always, if the API returns groups | Tabs, then a product row. |
| 12 | Recent searches | The shopper has search history | Product grid. Hide when empty. |
| 13 | Recommended | Recommended product ids exist | Horizontal product row. |

Welcome popup is not a home block in the scroll. It is a dialog. Config is in `GET /api/store/appearance/sections/public` → `homeWelcomePopup`. If `enabled` is false, do not show it. It can contain a logo, offer text, email box, and a button. The seller can have more than one template; use `activeTemplateId`.

#### What you must not hardcode

- Section order (use `homeLayout.sections`)
- Banner height and slide speed (use `heightPx` and `slideIntervalSeconds`)
- Titles (use the API, English or Arabic)
- Which payment or banner is “always on”

If the seller disables a block, that block disappears on the next refresh. No extra app release.

### 4.2 Catalog

| Website | App screen | API |
|---|---|---|
| `/shop` | Shop / all products | `GET /api/products` |
| `/categories` | Category index | `GET /api/categories` |
| `/category/{slug}` | Category products. Slug may be nested, for example `/category/brands/porodo` | [FLUTTER_CATEGORY_APIS.md](./FLUTTER_CATEGORY_APIS.md) |
| `/brand/{slug}` | Brand page. This is **not** the category page. Home logos: `GET /api/public/brands` | `GET /api/public/brand-products?slug={slug}` |
| `/product/{slug}` and `/products/{slug}` | Product detail | `GET /api/products/by-slug` or `GET /api/products/page` |
| `/search-results` | Search | `GET /api/search-products` |
| Image search | Camera or gallery photo, then closest and related products | [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md) — `POST /api/search-by-image` |
| `/new-arrivals`, `/new` | New arrivals | `GET /api/products` sorted newest |
| `/best-sellers`, `/top-selling` | Best sellers | `GET /api/products` with the site sort |
| `/trending-now` | Trending | products list |
| `/recommended` | Recommended | explore-interests ids, then `POST /api/products/batch` |
| `/5-star-rated` | Top rated | `GET /api/products/top-rated` |
| `/clearance-sale` | Clearance | `GET /api/products/deals` |
| `/under-149`, `/under-499` | Price filters | `GET /api/products` with the price filter the website uses |
| `/recently-viewed` | Recently viewed | `GET /api/browse-history` (Bearer) |
| `/browse` | Browse | categories + products |

### 4.2.1 Product card — same design as the mobile website

Field list, list APIs, and this layout are in [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

Use this card on every product list: home, shop, category, brand, search, offers, wishlist, and recommendations. Open `https://www.store1920.com/shop` on a phone. That grid is the reference.

The phone grid is **2 columns** with a **12px** gap.

| Piece | Mobile website | App |
|---|---|---|
| Card | White, 1px border `#e2e8f0`, corner radius **2px**, no shadow | Same |
| Image | Square, image fills the box (`cover`, centered). White behind it | Same. Use the image URL from the API |
| Second image | Swaps in on desktop hover only | Phone has no hover. Show the first image |
| Name | **12px**, semibold, `#0f172a`, **2 lines**, then ellipsis. Left in English, right in Arabic | Arabic name when the language is Arabic. If that field is empty, use the English name |
| Sale price | **14px**, semibold, `#020617`. Whole number, no decimals. Dirham symbol, then the number. Do not print the letters AED | Symbol file `https://www.store1920.com/currency/aed-dirham.png`. Tint it to the price color |
| Old price | Struck through, **10px**, `#94a3b8`. Show only when it is higher than the sale price | Field is `AED` (compare-at) |
| Discount | **10px**, semibold, `#047857`. English `10% off`. Arabic `خصم 10٪` | `round((compare − sale) / compare × 100)` when compare is higher |
| Stars | 5 stars, **9px**. Filled `#facc15`, empty `#d1d5db`. Then `(count)` in **9px** gray | Show only when the review count is greater than 0 |
| Padding under the image | **8px** | Same |

**Add button**, sitting **12px** from the bottom and the end edge of the image (right in English, left in Arabic):

| State | Look |
|---|---|
| Not in the cart | **32×32** white square, radius **10px**, border `#d1d5db`, plus icon in `#475569` |
| In the cart | Blue bar `#2563eb`. Minus (trash icon when the quantity is 1), the quantity, plus. On a phone this bar stays visible |
| Out of stock | Gray pill, text **Out of stock**. No plus button |

Tapping the card opens the product. Tapping plus adds **1** and does not open the product. Tapping minus removes 1. At quantity 1, the left control removes the line.

**Badges** on the image (New, sale, and any other label the seller turned on) come from:

```http
GET /api/public/new-tag
```

Draw a badge only when that response says the product qualifies. Use the label, colors, corner, and position from the response. Do not hardcode a “NEW” ribbon. On a card the usual text size is **10px**, about **8px** in from the corner the seller chose. Shapes the seller can pick: pill, rounded, square, tag, circle.

Product detail also loads:

| Piece | API |
|---|---|
| Frequently bought together | `GET /api/products/{id}/fbt` |
| Reviews | `GET /api/review` |
| Can this user review | `GET /api/review/can-review` |
| WhatsApp button on selected products | `GET /api/whatsapp/product` |

Brand pages and category pages are different. `/brand/nexso` matches the product brand name. `/category/brands/nexso` is a category. Do not merge them.

### 4.3 Offers and landing pages

| Website | App screen | API |
|---|---|---|
| `/offers` | Today's deals | `GET /api/public/offers` |
| `/offer/{slug}` | One offer | `GET /api/personalized-offers/resolve/{slug}` |
| `/welcome-offer` | Welcome offer | offers / coupon flow |
| `/c/{slug}` | Landing page created in the dashboard | `GET /api/public/campaign-pages/{slug}` |

Offers title, product source (discount, hand-picked, or category), and the phone-circle settings are all in `GET /api/store/appearance/sections/public` → `offersPage`. The public offers endpoint returns the products for that page.

### 4.4 Cart and checkout

| Website | App screen | API |
|---|---|---|
| `/cart` | Cart | Local cart, and `GET` / `POST` / `DELETE /api/cart` when signed in |
| `/checkout` | Checkout | Validate, shipping, address, then create order |
| `/order-success` | Paid / placed | After create or `verify-*` |
| `/order-failed` | Payment failed | `POST /api/payment-cancelled` when the user backs out |
| `/recover-cart/{token}` | Recovery link | `GET /api/abandoned-cart-recovery/{token}` |
| `/cart?restore={token}` | Restore link | `GET /api/abandoned-cart-restore/{token}` |

Cart line shape:

```json
{
  "PRODUCT_ID": {
    "quantity": 1,
    "price": 16,
    "variantOptions": { "Color": "Black" }
  }
}
```

Checkout sequence:

```
1. POST /api/cart/validate
2. GET  /api/shipping?storeId=
3. GET  /api/address          (signed in)
4. POST /api/coupon           (if a code was entered)
5. POST /api/orders
6. If the method is card or BNPL, open the hosted page, then:
      POST /api/orders/verify-stripe
      POST /api/orders/verify-tabby
      POST /api/orders/verify-tamara
```

Payment methods the website can offer: **COD, card (Stripe), Tabby, Tamara**. Shipping settings can hide a method or cap the order total. Obey `GET /api/shipping`. Do not store card numbers. Do not call payment webhooks from the app.

Guest checkout sends `isGuest: true` and guest name, phone, and email on `POST /api/orders`.

Full request notes: [MOBILE_APP_API.md](./MOBILE_APP_API.md) sections 5–7.  
Order fields and statuses: [ORDER_DETAILS.md](./ORDER_DETAILS.md).  
Payment rules: [PAYMENT_SECURITY.md](./PAYMENT_SECURITY.md).

### 4.5 Account

All of these need a Firebase Bearer token unless noted.

| Website | App screen | API |
|---|---|---|
| `/sign-in`, `/sign-up` | Sign in / register | Firebase, plus [FLUTTER_WHATSAPP_OTP_AUTH.md](./FLUTTER_WHATSAPP_OTP_AUTH.md) |
| `/dashboard/orders`, `/orders` | My orders | `GET /api/orders` |
| `/dashboard/addresses` | Addresses | `GET` / `POST` / `PUT` / `DELETE /api/address` and `/api/address/{id}` |
| `/wishlist`, `/dashboard/wishlist` | Wishlist | `GET` / `POST` / `DELETE /api/wishlist`, count `GET /api/wishlist/count` |
| `/profile`, `/dashboard/profile` | Profile | `GET` / `PUT /api/profile` |
| `/wallet`, `/wallet/details` | Wallet | `GET /api/wallet`, `POST /api/wallet/bonus` |
| `/dashboard/security` | Sessions / security | `/api/auth/sessions`, `/api/auth/mfa` |
| `/dashboard/tickets` | Support tickets | `GET` / `POST /api/tickets`, `/api/tickets/{ticketId}` |
| `/return-request` | Return | `POST /api/orders/return-request` or `POST /api/return-request` |
| Track an order | Track | `POST /api/track-order` |
| `/browse-history` | History | `GET /api/browse-history` |

After a guest checks out and then signs in, call `POST /api/user/link-guest-orders` so old orders attach to the account.

Account delete: `POST /api/account/delete`.

### 4.6 Content

| Website | App screen | API |
|---|---|---|
| `/blogs` | Blog list | `GET /api/public/blogs` |
| `/blogs/{slug}` | Blog article | `GET /api/public/blogs/{slug}` |
| `/about-us` | About | Static page. Same copy as the website |
| `/contact-us` | Contact | Store contact from `GET /api/store-info` |
| `/faq`, `/help`, `/support` | Help | Same pages as the website. Open in a web view if you do not rebuild the copy |
| `/careers` | Careers | Web view of the page is acceptable |
| Policy URLs in the table below | Policy screen | Web view of the same URL is acceptable and stays in sync |

Policy paths:

`/privacy-policy`, `/cookie-policy`, `/terms-and-conditions`, `/terms-of-sale`, `/shipping-policy`, `/return-policy`, `/refund-policy`, `/cancellation-policy`, `/cancellation-and-refunds`, `/warranty-policy`, `/payment-and-pricing`, `/business-information`

Aliases exist (`/privacy` and `/privacy-policy`). Prefer the longer path.

### 4.7 Extras the website already has

| Feature | API |
|---|---|
| Coupon | `POST /api/coupon` and `GET /api/coupons` |
| Referral code | `GET /api/referral/my-code`, `POST /api/referral/claim` |
| Spin wheel | `GET /api/spin/campaign`, `POST /api/spin/play` |
| Giveaway eligibility | `GET /api/giveaways/eligible` |
| Personalized offer link | `GET /api/personalized-offers/validate/{token}` |
| Email preferences | `GET` / `POST /api/email-preferences` |
| Unsubscribe | `/unsubscribe` |
| Reviews | `POST /api/review`, `POST /api/review/helpful` |
| Delivery review | `POST /api/orders/delivery-review` |
| Stock / social proof | `GET /api/social-proof-products` |
| Search history | `GET /api/customer/recent-searches`, `GET /api/public/search-history` |

---

## 5. Deep links

Register these paths so a link opens the app, not only the website.

| Path | Action |
|---|---|
| `/product/{slug}` and `/products/{slug}` | Product |
| `/category/{...slug}` | Category |
| `/brand/{slug}` | Brand |
| `/c/{slug}` | Landing page |
| `/offers` | Offers |
| `/cart` | Cart |
| `/cart?restore={token}` | Restore cart |
| `/recover-cart/{token}` | Recovery offer |
| Stripe / Tabby / Tamara return URLs | Call the matching `verify-*` API, then show success or failure |
| `/offer/{slug}` | Personalized offer |

---

## 6. Seller controls the app must obey

These are edited on the website. The app only reads the public GET.

| Seller page | What changes in the app | Public read |
|---|---|---|
| `/store/mobile-features` | Home banners | `GET /api/public/mobile-features` |
| `/store/customize/bottom-button` | Phone center circle | `GET /api/store/appearance/sections/public` |
| `/store/customize/offers` | `/offers` products and titles | `GET /api/public/offers` and appearance `offersPage` |
| `/store/menu-management` | Navbar color | `GET /api/store/navbar-menu` |
| `/store/featured-products` | Home featured grid | `GET /api/store/featured-products` |
| `/store/home-preferences` | Home sections | `GET /api/home/sections` |
| `/store/shipping` | Delivery fee and which payment methods show | `GET /api/shipping` |
| `/store/landing-pages` | `/c/{slug}` pages | `GET /api/public/campaign-pages/{slug}` |
| `/store/blogs` | Blog posts | `GET /api/public/blogs` |
| `/store/brands` | Brand logos and pages. Brand **pages** are `/brand/{slug}` | `GET /api/public/brands` and `GET /api/public/brand-products` |

---

## 7. Build order

1. Firebase auth and language (English / Arabic).
2. Home from section 4.1, including mobile banners.
3. Product list, category, brand, search, product detail.
4. Cart and guest plus signed-in checkout (COD first, then card, Tabby, Tamara).
5. Orders, addresses, wishlist.
6. Bottom bar from [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md).
7. Offers, landing pages, blogs, policies.
8. Spin, coupons, wallet, returns, tickets.

---

## 8. Other documents

Use these when a screen needs request and response fields. This file is the map. Those files are the field reference.

| Topic | File |
|---|---|
| Every shopper route and checkout bodies | [APP_DEVELOPER_API.md](./APP_DEVELOPER_API.md) |
| Home | [ANDROID_HOME_PAGE.md](./ANDROID_HOME_PAGE.md) |
| Categories | [FLUTTER_CATEGORY_APIS.md](./FLUTTER_CATEGORY_APIS.md) |
| Bottom menu | [ANDROID_APP_BOTTOM_MENU.md](./ANDROID_APP_BOTTOM_MENU.md) |
| Checkout and card | [ANDROID_CHECKOUT_PAGE.md](./ANDROID_CHECKOUT_PAGE.md), [VAULTSPAY_CHECKOUT.md](./VAULTSPAY_CHECKOUT.md) |
| WhatsApp login | [FLUTTER_WHATSAPP_OTP_AUTH.md](./FLUTTER_WHATSAPP_OTP_AUTH.md) |
| Sign-in | [APP_AUTH.md](./APP_AUTH.md) |
| Auth security | [AUTH_SECURITY.md](./AUTH_SECURITY.md) |
| Docs index | [README.md](./README.md) |

Do not point the shopper app at seller, admin, warehouse, cron, or webhook routes.
