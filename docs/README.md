# HAMODY API Documentation

**Base URL:** `https://hamody.com`  
**API root:** `https://hamody.com/api/...`  
**Last updated:** 2026-07-23

This folder is the **full API documentation set** — from public storefront / mobile app through seller dashboard, platform admin, payments, webhooks, crons, warehouse, and integrations.

---

## Start here

| # | Document | Who it’s for | Coverage |
|---|----------|--------------|----------|
| **0a** | **[APP_DEVELOPER_API.md](./APP_DEVELOPER_API.md)** | **iOS / Android / Flutter** | **Entire shopper API: routes, checkout bodies, payments** |
| **0** | **[FLUTTER_ENTIRE_APP.md](./FLUTTER_ENTIRE_APP.md)** | **Flutter shopper app** | **Entire customer app: every website screen, API, and what not to build** |
| **0b** | [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md) | Flutter | Phone center circle only (part of the app doc) |
| **0g** | [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md) | Android | Website phone header and menu drawer: every API |
| **0g2** | [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md) | Android | App navbar the seller designs under Mobile: home bar and other-pages bar |
| **0g2b** | [ANDROID_APP_ICON.md](./ANDROID_APP_ICON.md) | Android / Flutter | App main icon from `mobileFeatures.appIcon.url`. Header logo stays `appNavbar.logoUrl` |
| **0g3** | [ANDROID_SPLASH_SCREENS.md](./ANDROID_SPLASH_SCREENS.md) | Android / Flutter | App splash screens: photo, GIF, and video from `GET /api/public/mobile-features` |
| **0g4** | [ANDROID_APP_BOTTOM_MENU.md](./ANDROID_APP_BOTTOM_MENU.md) | Android / Flutter | App bottom menu the seller designs under Mobile → Footer |
| **0h** | [ANDROID_BRAND_PAGE.md](./ANDROID_BRAND_PAGE.md) | Android | Brand page design and brand APIs |
| **0h2** | [APP_BRANDS_API.md](./APP_BRANDS_API.md) | Android / Flutter | Home brand logos `GET /api/public/brands`, brand products, and the brands on the store |
| **0h3** | [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md) | Android / Flutter | Camera and upload image search: `POST /api/search-by-image` and the results screen |
| **0h3b** | [ANDROID_PRODUCT_IMAGE_SCAN.md](./ANDROID_PRODUCT_IMAGE_SCAN.md) | Android | Product photo scan: closest products, related products, and the product fields |
| **0h3c** | [APP_SCANNER_AI.md](./APP_SCANNER_AI.md) | Android / iOS | Scanner uses server Gemini and ChatGPT. The phone sends the photo and does not check products |
| **0h4** | [APP_AUTH.md](./APP_AUTH.md) | Android / Flutter | Shopper login and register: email, Google, Facebook, email OTP, WhatsApp OTP, reset, MFA |
| **0h5** | [ANDROID_GOOGLE_SIGNIN.md](./ANDROID_GOOGLE_SIGNIN.md) | Android | Google sign-in from `GET /api/public/google-auth`, then Firebase and login-result |
| **0h6** | [APP_BLOGS_API.md](./APP_BLOGS_API.md) | Android / Flutter | Public blog list and article: `GET /api/public/blogs` |
| **0h7** | [APP_PUSH_NOTIFICATIONS.md](./APP_PUSH_NOTIFICATIONS.md) | Android / Flutter | App push: register the FCM token, the message payload, and the last 20 notifications |
| **0h8** | [APP_SUPPORT_TICKETS.md](./APP_SUPPORT_TICKETS.md) | Android / Flutter | Support tickets: list, create, reply, and close. `GET/POST /api/tickets` |
| **0h9** | [APP_ACCOUNT_PROFILE.md](./APP_ACCOUNT_PROFILE.md) | Android / Flutter | Profile, Account Settings, and guest orders placed from the app |
| **0i** | [ANDROID_BANNER_2.md](./ANDROID_BANNER_2.md) | Android | Website home Banner 2 slider: design and API |
| **0i1** | [ANDROID_APP_BANNER_1.md](./ANDROID_APP_BANNER_1.md) | Android / Flutter | App home Banner 1 and the navbar top background each slide paints |
| **0i2** | [ANDROID_APP_BANNERS_2_3_4.md](./ANDROID_APP_BANNERS_2_3_4.md) | Android / Flutter | App home Banner 2, Banner 3, and Banner 4 from `GET /api/public/mobile-features` |
| **0i3** | [ANDROID_APP_CATEGORY_SLIDERS.md](./ANDROID_APP_CATEGORY_SLIDERS.md) | Android / Flutter | App category chips from `mobileFeatures.categoryMobileSliders` |
| **0i4** | [ANDROID_APP_SHOP_BLOCKS.md](./ANDROID_APP_SHOP_BLOCKS.md) | Android / Flutter | App home budget card and promo from `mobileFeatures.shopBlocks`, including each image `path` |
| **0j** | [ANDROID_HOME_PAGE.md](./ANDROID_HOME_PAGE.md) | Android | Home page only: section order, design, and APIs |
| **0k** | [ANDROID_SHOP_PAGE.md](./ANDROID_SHOP_PAGE.md) | Android | Shop tab: category rail, banner size, spotlight |
| **0l** | [ANDROID_CATEGORY_BAR.md](./ANDROID_CATEGORY_BAR.md) | Android | Black category strip: settings API and category API |
| **0m** | **[APP_PRODUCT_PAGE.md](./APP_PRODUCT_PAGE.md)** | **Android / Flutter** | **Full product page: layout, APIs on open, prices, variants/bundles, cart, Notify Me, reviews, FBT, related** |
| **0m1** | [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md) | Android | Product page: every API in detail, including Notify Me, reviews, cart, wishlist |
| **0m4** | [APP_PRODUCT.md](./APP_PRODUCT.md) | Android / Flutter | Buy box depth: name, prices, app discount, images, badges, bundle, variant, add to cart |
| **0m3** | [APP_PRODUCT_SHARE.md](./APP_PRODUCT_SHARE.md) | Android / Flutter | Product share sheet: WhatsApp, Facebook, Gmail, copy link, and the system share sheet |
| **0m2** | [APP_PRODUCT_BADGES.md](./APP_PRODUCT_BADGES.md) | Android / Flutter | Product image badges, delivery-time badge, sale price, and app discount |
| **0n** | [ANDROID_CATEGORY_SLIDER.md](./ANDROID_CATEGORY_SLIDER.md) | Android | Home category slider: app image, ratio, and products |
| **0o** | [APP_CHECKOUT.md](./APP_CHECKOUT.md) | Android / Flutter | Checkout APIs: delivery, pickup, cash, Visa / Mastercard, Apple Pay, Google Pay, Tabby, Tamara |
| **0o3** | [APP_DELIVERY_ADDRESS.md](./APP_DELIVERY_ADDRESS.md) | Android / Flutter | Delivery address: name, phone, street, emirate, area, city, and country |
| **0o2** | [ANDROID_CHECKOUT_PAGE.md](./ANDROID_CHECKOUT_PAGE.md) | Android | Checkout screen layout: spacing, fields, and the sticky pay button |
| **0p** | [VAULTSPAY_CHECKOUT.md](./VAULTSPAY_CHECKOUT.md) | Android / Flutter | VaultsPay card, Google Pay, and Apple Pay at checkout |
| **0d** | [FLUTTER_HOME_HERO.md](./FLUTTER_HOME_HERO.md) | Flutter | Home hero banner: slides, arrows, dots, mobile image |
| **0e** | [FLUTTER_CATEGORY_APIS.md](./FLUTTER_CATEGORY_APIS.md) | Flutter | Category tree, category page, home icons, category sliders |
| **0f** | [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md) | Flutter | Product card APIs, fields, and the phone card layout |
| **0c** | **[HAMODY_FULL_API.md](./HAMODY_FULL_API.md)** | **Mobile + all teams** | **Master guide: home APIs, full shopper catalog, auth, links to every surface** |
| 1 | [API_OVERVIEW.md](./API_OVERVIEW.md) | Everyone | Architecture, auth modes, systems map |
| 2 | [MOBILE_APP_API.md](./MOBILE_APP_API.md) | Customer mobile / web shopper | Catalog, cart, checkout, COD/Stripe/Tabby/Tamara, wishlist, track (~90 routes) |
| 2b | [MOBILE_HOME_PAGE_APIS.md](./MOBILE_HOME_PAGE_APIS.md) | Mobile home screen | Same APIs as website homepage + mobile banners |
| 2c | [MOBILE_FEATURES_DOCUMENTATION.md](./MOBILE_FEATURES_DOCUMENTATION.md) | App home banners only | Four banner sections, dashboard, public GETs, Flutter checklist |
| 3 | [STORE_DASHBOARD_API.md](./STORE_DASHBOARD_API.md) | Seller `/store` dashboard | Products, orders, shipping, Mobile Features, marketing (~160+ routes) |
| 4 | [ADMIN_API.md](./ADMIN_API.md) | Platform admins | Store approval, home merchandising, coupons |
| 4b | **[STORE_LOGIN_AND_SUPER_ADMIN.md](./STORE_LOGIN_AND_SUPER_ADMIN.md)** | **Owner / IT / Super Admin** | **Full login & credentials doc: `/store/login`, Super Admin email list, team invites, PIN, password reset, `/admin`** |
| 5 | [WEBHOOKS_AND_CRONS.md](./WEBHOOKS_AND_CRONS.md) | Backend / DevOps | Stripe, Tabby, Tamara, Razorpay, Waslah, crons |
| 5b | **[ORDER_TRACKING_SHIPPING.md](./ORDER_TRACKING_SHIPPING.md)** | **Ops / warehouse / backend** | **Couriers: EMX direct (new), Waslah→EMX, C3Xpress, Delhivery + APIs / track / crons** |
| 6 | [ORDER_DETAILS.md](./ORDER_DETAILS.md) | All builders | Order document fields & statuses |
| 7 | [AUTH_SECURITY.md](./AUTH_SECURITY.md) | Auth / security | CAPTCHA, lockout, MFA, sessions |
| 8 | [PAYMENT_SECURITY.md](./PAYMENT_SECURITY.md) | Payments | PCI / fraud / refunds |
| 9 | [WHATSAPP_INTEGRATION_API.md](./WHATSAPP_INTEGRATION_API.md) | Messaging | WhatsApp abandoned cart & orders |
| 10 | [HAMODY_API_AND_ZOHO_CRM.md](./HAMODY_API_AND_ZOHO_CRM.md) | CRM | Zoho sync |
| 11 | **[WAREHOUSE_BARCODE_SCANNER.md](./WAREHOUSE_BARCODE_SCANNER.md)** | **Warehouse Flutter / ops** | **Full barcode scanner doc: what is inside the EMX `1000…` label, normalize, APIs, pack, return** |
| 11a | [warehouse-order-packing-api.md](./warehouse-order-packing-api.md) | Warehouse app | Packing |
| 11b | [warehouse-app-emx-tracking-pickup.md](./warehouse-app-emx-tracking-pickup.md) | Warehouse app | EMX tracking, pickup, labels, details |
| 11c | [warehouse-emx-label-scan.md](./warehouse-emx-label-scan.md) | Warehouse app | Door To Door barcode scan (short) |
| 11d | [warehouse-tracking-api.md](./warehouse-tracking-api.md) | Warehouse app | Tracking endpoint short reference |
| 11e | [warehouse-app-scan-handoff-reply.md](./warehouse-app-scan-handoff-reply.md) | Warehouse app | Backend reply: AWB lookup / prod deploy |
| 11f | [warehouse-return-scan-api.md](./warehouse-return-scan-api.md) | Warehouse Flutter | **Return scan API** — lookup + collect → RETURNED, product ids, stock |
| 11g | [warehouse-return-collect-api.md](./warehouse-return-collect-api.md) | Warehouse Flutter | Legacy collect endpoint (`/returns/collect`) |
| 12 | [warehouse-inventory-api.md](./warehouse-inventory-api.md) | Warehouse app | Inventory |
| 12b | **[ERP_INTEGRATION_API.md](./ERP_INTEGRATION_API.md)** | **ERP dashboard** | **Zoho Inventory–style API: attributes, request/response examples for all 6 ERP routes** |
| 12c | [ERP_API_LIST.json](./ERP_API_LIST.json) | ERP dashboard | Attribute schemas + endpoint list (JSON) |
| 13 | [warehouse-android-firebase-setup.md](./warehouse-android-firebase-setup.md) | Warehouse setup | Firebase |
| 14 | [GOOGLE_MERCHANT_CENTER_COMPLIANCE.md](./GOOGLE_MERCHANT_CENTER_COMPLIANCE.md) | Ads / Merchant Center | Compliance |

---

## Recommended reading order (mobile)

1. **[APP_DEVELOPER_API.md](./APP_DEVELOPER_API.md)** — entire shopper API  
2. **[FLUTTER_ENTIRE_APP.md](./FLUTTER_ENTIRE_APP.md)** — every shopper screen  
3. [APP_CHECKOUT.md](./APP_CHECKOUT.md) when building checkout. Layout is [ANDROID_CHECKOUT_PAGE.md](./ANDROID_CHECKOUT_PAGE.md). Card return is [VAULTSPAY_CHECKOUT.md](./VAULTSPAY_CHECKOUT.md)  
4. [APP_AUTH.md](./APP_AUTH.md) when building sign-in  
5. [APP_ACCOUNT_PROFILE.md](./APP_ACCOUNT_PROFILE.md) when building the account profile screen  

---

## Route volume (approx.)

| Surface | Prefix | ~Count |
|---------|--------|--------|
| Shopper (mobile + public site) | `/api/*` (non-store/admin) | ~90 |
| Seller dashboard | `/api/store/*` | ~160 |
| Platform admin | `/api/admin/*` | ~19 |
| Crons | `/api/cron/*` | 6 |
| Webhooks / ops | Stripe, Tabby, Tamara, Waslah, warehouse, courier | ~30 |

**Total:** ~305 `app/api/**/route.js` handlers.

---

## Auth at a glance

| Audience | Auth |
|----------|------|
| Guest shopper | No token; `isGuest` + `guestInfo` / `anonymousId` |
| Logged-in shopper | `Authorization: Bearer <Firebase ID token>` |
| Seller | Same Bearer + `authSeller(uid)` → `storeId` |
| Platform admin | Same Bearer + email allowlist (`ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_EMAIL`) |
| Crons | `Authorization: Bearer <CRON_SECRET>` |
| Payment webhooks | Provider signatures / secrets (never from mobile apps) |

---

## Recommended reading order

1. [API_OVERVIEW.md](./API_OVERVIEW.md) — mental model  
2. Pick your audience doc (Mobile / Store / Admin / Warehouse)  
3. [ORDER_DETAILS.md](./ORDER_DETAILS.md) when building checkout or order UIs  
4. [WEBHOOKS_AND_CRONS.md](./WEBHOOKS_AND_CRONS.md) when wiring payments or Ops

---

## Out of scope for client apps

Do **not** ship these secrets in mobile / seller apps:

- `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `TABBY_WEBHOOK_SECRET`, Tamara webhook secrets  
- `RAZORPAY_WEBHOOK_SECRET`, `WASLAH_WEBHOOK_SECRET`, Firebase **Admin** credentials  

Clients only use Firebase **client** config + public HTTPS APIs.
