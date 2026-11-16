# HAMODY phone header — design and APIs

Last updated: 12 October 2026  
Audience: Android app  
Website: `https://www.hamody.com`  
API root: `https://www.hamody.com/api`  
Web source: `components/TopBar.jsx`, `components/Navbar.jsx`

The phone header is two bars, stacked, pinned to the top of every screen.

1. **Payment strip** — Tamara / Tabby line. Data from `GET /api/store/settings` → `bnplTopBar`.
2. **Navbar row** — menu, logo, search, phone, account, wishlist, cart. Data from `GET /api/store/navbar-menu` plus `navActionsVisibility` and `navbarPhone` on the same settings response.

The bottom-bar center circle is not this header. That spec is [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md).

Send `Accept-Language: en` or `ar`.  
Do **not** send `Authorization` on `GET /api/store/navbar-menu` or `GET /api/store/settings`. A seller token changes the navbar response to that account and can wipe the public logo.

`Cache-Control` on both GETs is `no-store`. Cache on the device anyway, and refresh when the app starts and when it returns to the foreground. If a refresh fails, keep the last good cache. Never replace a saved logo with an empty one.

---

## 1. Call order

Fire these two together before the first frame of the header. The other calls wait until the customer types or is signed in.

| When | Method | Path | Auth |
|---|---|---|---|
| App start | GET | `/api/store/settings` | No |
| App start | GET | `/api/store/navbar-menu` | No |
| Each key in search, after 220 ms | GET | `/api/search-products?keyword={text}&limit=3&includeOutOfStock=true` | No |
| Camera button | POST | `/api/search-by-image` | No |
| Signed-in cart badge | GET | `/api/cart` | `Authorization: Bearer {firebaseIdToken}` |
| Signed-in wishlist badge | GET | `/api/wishlist/count` | same bearer token |

`POST /api/store/navbar-menu` and `POST /api/store/settings` are seller saves. The app must not call them.

While the first two GETs are in flight, draw the skeleton in section 3. Do not flash the default logo over a cached custom logo.

---

## 2. Header stack

```
┌──────────────────────────────────────────────┐
│  [Tamara logo]  Pay in 4 with Tamara         │  payment strip
├──────────────────────────────────────────────┤
│  ≡   LOGO   [ search …… 📷 🔍 ]  ☎  ♡  🛒   │  navbar row
└──────────────────────────────────────────────┘
```

English is left to right. Arabic mirrors the navbar row and the payment line (`rtl`).

Z-order: payment strip above the navbar. Navbar stays above page content. Search suggestions float over the page, under nothing else.

---

## 3. Skeleton

Show this only before the first successful navbar response, and only when there is no cache.

| Block | Size | Color |
|---|---|---|
| Whole bar | full width, padding 8 px horizontal, 8 px vertical | background `#f1f5f9`, bottom border `#e2e8f0` |
| Menu circle | 32 × 32, fully round | `#e2e8f0` |
| Logo block | 72 × 28, radius 6 | `#cbd5e1` |
| Search | height 36, flex, fully round | `#e2e8f0` |
| One icon circle | 36 × 36 | `#e2e8f0` |

Pulse the blocks. Gap between them is 8 px.

---

## 4. Payment strip design

Source: `settings.bnplTopBar`. If `resolve` produces zero partners, draw nothing. The strip is not an error state.

| Property | Value |
|---|---|
| Background | `#ffffff` |
| Bottom border | 1 px `#e7e7e7` |
| Min height | `minHeight` from the API. Default 40. Clamp 28–72 |
| Font size | `fontSize`. Default 14. Clamp 10–24 |
| Horizontal padding | 12 px |
| Content | one partner, centered |
| Logo height | `fontSize + 6`, at least 18 |
| Gap logo to text | 8 px |
| Text | one line, truncated. Color `#374151`, weight 500 |
| Name fallback | if the logo fails to load, bold `#111827` partner name, no image |
| Flip | if more than one partner, change every **3500 ms**. Fade and drop in over **560 ms** |

Phone text is `mobileText`, not `desktopText`.

Default copy when the saved text is empty:

| Language | Mobile line |
|---|---|
| English | `Pay in {n} with {name}` |
| Arabic | `ادفع على {n} دفعات مع {name}` |

`n` is `tamaraPayments` or `tabbyPayments` (2–12, default 4).

Partner order: enabled Tamara, then enabled Tabby, then custom items. If both partner flags are off and there is no custom item, show Tamara alone. If `enabled` is false, show nothing.

Logos when `tamaraLogoUrl` / `tabbyLogoUrl` are empty:

- Tamara: `/payments/tamara.png` on the website origin
- Tabby: `/payments/tabby.png`

---

## 5. Navbar row design

The row is one horizontal line. It does not wrap.

| Property | Value |
|---|---|
| Position | sticky top, under the payment strip |
| Padding | 8 px horizontal, 8 px vertical |
| Gap | `mobileItemGap` from navbar-menu. Default 4. Clamp 0–24 |
| Bottom border | 1 px `rgba(15, 23, 42, 0.12)` |
| Shadow | `0 1px 3px rgba(15, 23, 42, 0.06)` |

### Bar color

| Screen | Fill | Icons and menu button |
|---|---|---|
| Home, and `backgroundColor` is a hex color | that hex | white at 95% opacity. Pressed state: white at 15% |
| Every other screen, or empty `backgroundColor` | `#ffffff` | `#111827`. Pressed state: `#f3f4f6` |

`backgroundColor` must match `#rgb` or `#rrggbb`. Anything else is empty, so the bar stays white.

### Slots, left to right

| Slot | Size | Draw | Tap |
|---|---|---|---|
| Menu | 36 × 36 circle | Hamburger 20 px. X 20 px while the drawer is open | Open or close the drawer |
| Logo | max height 32, max width 72 | `logoUrl`, contain, no crop. Empty URL uses the bundled HAMODY mark | Home |
| Search | height 36, takes the remaining width | Section 6 | — |
| Phone | height 36, width hugs the label | Handset 16 px. Optional 8 px label under it | `tel:{number}` |
| Account | 36 × 36 circle | Person icon 20 px. **Hidden on home** | Sign-in if logged out, otherwise account |
| Wishlist | 36 × 36 circle | Heart 20 px, stroke 1.5. Hidden when `wishlist` visibility is false | Wishlist |
| Cart | 36 × 36 circle | Bag 20 px, stroke 1.5. **Hidden on home.** Hidden when `cart` visibility is false | Cart, or empty-cart toast when the count is 0 |

Icon cluster gap is 2 px. Phone, wishlist, and cart sit in that cluster after the search field. Account is omitted on `/` only.

### Badge

Only wishlist and cart. Hide the badge at 0.

| Property | Value |
|---|---|
| Position | top-right of the icon, offset 4 px out |
| Min size | 16 × 16 |
| Padding | 4 px horizontal |
| Radius | fully round |
| Fill | `#ef4444` |
| Text | white, 10 px, bold |
| Cap | `99+` |

Guest counts stay on the device. Signed-in counts come from section 9.

### Phone slot

From `settings.navbarPhone`.

| Field | Rule |
|---|---|
| `number` | Digits only. Default `8007861920` |
| Dial | `tel:` + `number` |
| `label` | English caption under the icon. Default `Toll-free` |
| `labelAr` | Arabic caption. Default `مجاني` |
| `shortText` | Desktop short label, max 16 characters. The phone icon does not need it |

Hide the whole slot when `navActionsVisibility.phone` is false.

---

## 6. Search box design

Height **36**. The box uses `searchStyle` from navbar-menu, drawn like this:

| Style field | On the box |
|---|---|
| `backgroundColor` | Fill. Default `#ffffff` |
| `backgroundTransparent` | If true, fill is transparent |
| `borderWidth` | 0–8. Default 1. Zero means no border |
| `borderColor` | Default `#ffffff` |
| `borderRadius` | Default 16 |
| `fontFamily` | See the font table below |
| `fontSize` | Stored 8–28. **On the phone, draw 75% of it, at least 8.** Default stored 14 becomes **11** |
| `fontWeight` | `300` `400` `500` `600` `700` `800` |
| `fontColor` | Input text. Default `#1e293b` |
| `fontColorAuto` | If true, text is `#111827` on a light fill and `#ffffff` on a dark fill (YIQ ≥ 160 is dark text) |

Box shadow, always: `0 2px 10px rgba(15, 23, 42, 0.12)`.

Inside the box, left to right:

| Control | Size | Color |
|---|---|---|
| Text field | flex, transparent background | placeholder at 50% opacity |
| Clear | 24 × 24, only when text is not empty | `#94a3b8` |
| Camera | 28 × 28 circle | `#64748b` |
| Submit | 28 × 28 circle | white icon. Fill is `backgroundColor` from navbar-menu, or `#0f172a` when that color is empty |

Placeholder: `searchPlaceholderAr` when the app is Arabic and that string is not empty, otherwise `searchPlaceholder`. If both are empty, use `Search products`.

### Font ids

`inherit` is the app font. Named ids:

| `fontFamily` | Face |
|---|---|
| `poppins` | Poppins |
| `montserrat` | Montserrat |
| `arial` | Arial |
| `helvetica` | Helvetica |
| `georgia` | Georgia |
| `times` | Times New Roman |
| `verdana` | Verdana |
| `trebuchet` | Trebuchet MS |
| `tahoma` | Tahoma |
| `garamond` | Garamond |
| `system` | system UI |

If `unifyNavbarText` is true, ignore the search font family and size and use `unifiedTextFontFamily` plus `unifiedTextFontSize` (8–22, default 13), still multiplied by 0.75 on the phone.

### Suggestions

Open the list only while the field is focused and the text is not empty.

| Property | Value |
|---|---|
| Position | directly under the search box, 8 px gap, same width |
| Surface | white, radius 16, border `#e2e8f0`, shadow |
| Max height | 320 |
| Row | 36 × 36 image, radius 8, then one-line title. Padding 16 × 10. Title `#1e293b` 14 px |
| Empty | `No products` in `#6b7280`, padding 16 × 12 |
| Loading | `Searching…` in the same style |
| More | if `total` > 3, a full-width row `Show more` under a `#f1f5f9` divider |

Title is `nameAr` in Arabic when that field is not empty, otherwise `name`. Tap a row to open the product. Submit, or Show more, opens shop search: `/shop?search={keyword}`.

Camera posts the image and then opens shop search with the returned `keyword` and `products`.

---

## 7. `GET /api/store/navbar-menu`

Public storefront bar. No auth header.

### Success `200`

```json
{
  "enabled": true,
  "logoUrl": "https://store1920-images.s3.ap-south-1.amazonaws.com/...",
  "logoWidth": 120,
  "logoHeight": 40,
  "backgroundColor": "#7c3aed",
  "items": [
    { "label": "Shop", "url": "/shop", "categoryId": null }
  ],
  "extraButtons": [],
  "searchMaxWidth": 600,
  "searchAlign": "left",
  "searchPlaceholder": "",
  "searchPlaceholderAr": "",
  "searchStyle": {
    "fontFamily": "inherit",
    "fontSize": 14,
    "fontWeight": "400",
    "fontColor": "#1e293b",
    "fontColorAuto": false,
    "borderWidth": 1,
    "borderColor": "#ffffff",
    "borderRadius": 16,
    "width": 0,
    "backgroundTransparent": false,
    "backgroundColor": "#ffffff",
    "animation": "none"
  },
  "navbarMaxWidth": 1400,
  "itemGap": 12,
  "logoGap": 16,
  "mobileItemGap": 4,
  "stickyHeader": false,
  "showCategoriesButton": true,
  "categoriesButtonLabel": "Categories",
  "categoriesButtonLabelAr": "",
  "categoriesButtonStyle": {},
  "itemOrder": ["logo", "deals", "categories", "search", "account", "orders", "wishlist", "cart", "phone", "language"],
  "itemAlign": {},
  "unifyNavbarText": false,
  "unifiedTextFontFamily": "inherit",
  "unifiedTextFontSize": 13,
  "layoutUpdatedAt": "2026-10-12T08:00:00.000Z",
  "footerLogoSameAsNavbar": true,
  "footerLogoUrl": "",
  "footerLogoWidth": 160,
  "footerLogoHeight": 40,
  "resolvedFooterLogoUrl": "",
  "updatedAt": "2026-10-12T08:00:00.000Z"
}
```

### Fields the phone header must read

| Field | Type | Header use |
|---|---|---|
| `logoUrl` | string | Logo image. Trim. Empty means the bundled mark |
| `logoWidth` | number | Saved width, 20–400, default 120. Phone still caps the drawn logo at 32 px tall and 72 px wide |
| `logoHeight` | number | Saved height, 10–200, default 40. Same cap |
| `backgroundColor` | string | Home bar fill and search-button fill. Empty means white bar and `#0f172a` search button |
| `searchPlaceholder` | string | English hint |
| `searchPlaceholderAr` | string | Arabic hint |
| `searchStyle` | object | Section 6 |
| `mobileItemGap` | number | Gap between header slots, 0–24, default 4 |
| `unifyNavbarText` | boolean | When true, force one font on the search text |
| `unifiedTextFontFamily` | string | Font id from section 6 |
| `unifiedTextFontSize` | number | 8–22, default 13, then × 0.75 on the phone |
| `updatedAt` | ISO string or null | Cache token |

### Fields the phone header does not draw

These are in the same JSON for the desktop bar, footer, and seller editor. Ignore them on the phone header.

| Field | Why it is not on the phone row |
|---|---|
| `enabled` | Desktop category bar. The phone row still renders |
| `items` | Desktop menu links: `{ label, url, categoryId }` |
| `extraButtons` | Desktop text buttons. Shape is below if you add them later |
| `searchMaxWidth` | Desktop search width, 320–900, default 600 |
| `searchAlign` | `left` or `right` on desktop |
| `navbarMaxWidth` | Desktop content width, 1100–1400 |
| `itemGap`, `logoGap` | Desktop spacing |
| `stickyHeader` | Desktop pin flag. The phone row is always pinned |
| `showCategoriesButton` | Desktop categories button |
| `categoriesButtonLabel`, `categoriesButtonLabelAr`, `categoriesButtonStyle` | Desktop categories button |
| `itemOrder`, `itemAlign` | Desktop slot order. The phone order is fixed in section 5 |
| `footerLogoSameAsNavbar`, `footerLogoUrl`, `footerLogoWidth`, `footerLogoHeight`, `resolvedFooterLogoUrl` | Footer only |
| `layoutUpdatedAt` | Same moment as `updatedAt` for the layout block |

`extraButtons[]`, if you ever show them, each item is:

| Field | Rule |
|---|---|
| `id` | string |
| `label`, `labelAr` | button text. Arabic falls back to English |
| `link` | path or `https` URL. Default `/offers` |
| `kind` | `link` or `dropdown` |
| `items` | dropdown rows with `label`, `labelAr`, `link` |
| `enabled` | `false` hides it |
| `style` | same keys as `searchStyle` |

Drop `javascript:` and `data:` links.

### Failure

The route still answers `200` with defaults if the database fails: empty logo, `logoWidth` 120, `logoHeight` 40, empty `backgroundColor`, `mobileItemGap` 4, empty placeholders. Draw the white bar and the bundled logo.

`401` happens only when you sent a bearer token and it was invalid. Do not send a token.

---

## 8. `GET /api/store/settings`

Public storefront settings. No auth header. Same cache rule as the navbar GET.

### Success `200`

The body is larger than the header needs. Read only these objects.

```json
{
  "navActionsVisibility": {
    "store": true,
    "orders": true,
    "wishlist": true,
    "cart": true,
    "phone": true,
    "language": true
  },
  "navbarPhone": {
    "number": "8007861920",
    "shortText": "",
    "label": "Toll-free",
    "labelAr": "مجاني"
  },
  "navbarLanguage": {
    "flagCode": "auto",
    "iconUrl": ""
  },
  "bnplTopBar": {
    "enabled": true,
    "tamaraEnabled": true,
    "tabbyEnabled": false,
    "tamaraPayments": 4,
    "tabbyPayments": 4,
    "tamaraText": "",
    "tamaraTextAr": "",
    "tabbyText": "",
    "tabbyTextAr": "",
    "fontSize": 14,
    "minHeight": 40,
    "tamaraLogoUrl": "",
    "tabbyLogoUrl": "",
    "customItems": []
  },
  "updatedAt": "2026-10-12T08:00:00.000Z"
}
```

### `navActionsVisibility`

Missing object means every flag is true.

| Key | Phone header |
|---|---|
| `phone` | Show or hide the handset |
| `wishlist` | Show or hide the heart |
| `cart` | Show or hide the bag (still hidden on home) |
| `orders` | Drawer and account subtitle only. Not an icon on the phone row |
| `language` | Desktop language control. Not an icon on the phone row |
| `store` | Seller shortcut. Not on the phone row |

### `navbarPhone`

| Field | Clamp / default |
|---|---|
| `number` | digits. Default `8007861920` |
| `shortText` | max 16. Default empty |
| `label` | English caption. Default `Toll-free` when nothing was saved |
| `labelAr` | Arabic caption. Default `مجاني` when nothing was saved |

### `navbarLanguage`

Not drawn on the phone row. Included so the account/market control can match the website later.

| Field | Values |
|---|---|
| `flagCode` | `auto`, or `AE` `SA` `KW` `QA` `BH` `OM` |
| `iconUrl` | optional image. Empty means the market flag |

### `bnplTopBar`

| Field | Rule |
|---|---|
| `enabled` | `false` hides the strip |
| `tamaraEnabled` | default true |
| `tabbyEnabled` | default false |
| `tamaraPayments`, `tabbyPayments` | integer 2–12, default 4 |
| `tamaraText`, `tabbyText` | English override, max is the saved string. Empty uses the default sentence |
| `tamaraTextAr`, `tabbyTextAr` | Arabic override |
| `fontSize` | 10–24, default 14 |
| `minHeight` | 28–72, default 40 |
| `tamaraLogoUrl`, `tabbyLogoUrl` | optional. Empty uses `/payments/tamara.png` and `/payments/tabby.png` |
| `customItems` | max 8 |

`customItems[]`:

| Field | Rule |
|---|---|
| `id` | string |
| `enabled` | `false` skips the slide |
| `name` | max 40. Fallback label if the image fails |
| `imageUrl` | logo |
| `text` | English line, max 160 |
| `textAr` | Arabic line, max 160 |

A custom slide needs at least one of `imageUrl`, `text`, `textAr`, or `name`.

### Other keys on this response

`navMenuEnabled`, `navMenuItems`, `navMenuStyle`, `navMenuUseParentCategories`, and `navMenuHoverDropdown` are the black category strip under the header. Phone layout and fields are in [ANDROID_CATEGORY_BAR.md](./ANDROID_CATEGORY_BAR.md). They do not change the logo, search, or icon row above that strip.

### Failure

On a thrown error the server may answer `200` with the in-memory public defaults (Tamara strip on, all icons visible, toll-free phone). Treat a non-200 as “keep cache”.

---

## 9. Badge and search APIs

### `GET /api/search-products`

Query: `keyword` (required, trimmed), `limit=3`, `includeOutOfStock=true`.

```json
{
  "products": [
    {
      "_id": "…",
      "slug": "nexso-toaster",
      "name": "NEXSO 2-Slice Bread Toaster",
      "nameAr": "",
      "image": "https://…",
      "images": [],
      "price": 79.99,
      "mrp": 99,
      "inStock": true
    }
  ],
  "total": 12
}
```

The suggestion row uses `_id` or `slug`, `name` / `nameAr`, and `image` (else the first of `images`). Open the product with the same path the website uses for that slug.

`total` greater than 3 shows the Show more row.

### `POST /api/search-by-image`

Camera and gallery upload. Full request, related products, and the results screen: [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md).

`multipart/form-data`, field name `image`. No GET.

| Status | Body |
|---|---|
| 200 | `products` (closest), `relatedProducts` (same as `recommendedProducts`), `keyword` |
| 400 | `{ "error": "No image uploaded" }` or `{ "error": "Image is empty" }` |

### `GET /api/cart`

Header: `Authorization: Bearer {firebaseIdToken}`.

```json
{ "cart": { "6ac5f53aa3785519be65a756": { "quantity": 2 } } }
```

Badge = sum of `quantity`. Missing token or a bad token returns `{ "cart": {} }` with status 200. Add the on-device guest cart on top of that.

### `GET /api/wishlist/count`

Same bearer header.

```json
{ "count": 3 }
```

`401` means signed out: use the on-device guest wishlist length. Any other failure shows badge `0`.

Empty cart tap does not open the cart screen. Show a short toast: the cart is empty. Duration 3 seconds.

---

## 10. Build checklist

- Payment strip and navbar row are two separate bars.
- Home uses `backgroundColor` and white icons. Other screens use a white bar and `#111827` icons.
- Phone logo is capped at 32 × 72 even when `logoWidth` / `logoHeight` are larger.
- Search font size on the phone is 75% of `searchStyle.fontSize`.
- Search button color is `backgroundColor`, or `#0f172a`.
- Wishlist and cart badges are `#ef4444`, not the navbar color.
- Cart and account icons are hidden on the home screen.
- No `Authorization` header on the two settings GETs.
- Failed refresh keeps the previous logo and colors.
