# Store1920 phone bottom button — Flutter integration

Last updated: 9 October 2026  
Audience: Flutter / mobile app developers  
Web reference: `components/MobileBottomNav.jsx`, `app/store/customize/bottom-button/page.jsx`, `lib/offersPageSettings.js`, `lib/bottomNavLinkChoices.js`

This file is only the center circle on the phone bar. The rest of the customer app (home, shop, product, cart, checkout, account) is in [FLUTTER_ENTIRE_APP.md](./FLUTTER_ENTIRE_APP.md).

The website phone bar has a raised circle in the center. Sellers edit that circle in the dashboard. The Flutter app must render the **same circle from the same saved settings**. Do not hardcode the percent icon, the words, the color, or the destination.

The seller editor stays on the website (`/store/customize/bottom-button`). The app only reads the public settings and draws the button.

---

## 1. Where the data comes from

```http
GET https://www.store1920.com/api/store/appearance/sections/public
```

No auth header. Response is JSON. Read `offersPage`.

Example:

```json
{
  "offersPage": {
    "bottomNavMode": "text",
    "bottomNavImageUrl": "",
    "bottomNavCircleText": "10:10",
    "bottomNavBelowText": "SALE",
    "bottomNavBelowTextAr": "تخفيض",
    "bottomNavHref": "/new-arrivals",
    "bottomNavBackgroundColor": "#ea580c",
    "bottomNavAnimation": "pulse",
    "navGifUrl": ""
  }
}
```

Cache the object and refresh it when the app starts and when it returns to the foreground. While the first response is still loading, show a **gray skeleton circle**. Do not show a percent icon during that wait.

| Field | Type | Limit | Default when missing |
|---|---|---|---|
| `bottomNavMode` | `icon` \| `image` \| `text` | | `icon` |
| `bottomNavImageUrl` | URL string | 500 chars, must start with `http://`, `https://`, or `/` | empty |
| `bottomNavCircleText` | string | 12 characters | empty |
| `bottomNavBelowText` | string | 24 characters | empty |
| `bottomNavBelowTextAr` | string | 24 characters | empty |
| `bottomNavHref` | path or `http(s)` URL | path 300 chars, URL 500 chars | `/offers` |
| `bottomNavBackgroundColor` | `#rrggbb` | | `#ea580c` |
| `bottomNavAnimation` | see section 5 | | `none` |
| `navGifUrl` | URL string | same rules as the image URL | empty |

Ignore `javascript:` and `data:` links. Treat them as `/offers`.

---

## 2. Bar layout

Five slots, left to right in English. In Arabic, mirror the row (`Directionality` RTL).

| Slot | Label (EN) | Label (AR, website key) | Opens |
|---|---|---|---|
| 1 | Home | `common.home` | `/` |
| 2 | Shop | `navbar.shopOptions` | `/shop` |
| 3 | Center circle | text from settings, or nothing | `bottomNavHref` |
| 4 | Cart | `navbar.cart` | `/cart` |
| 5 | Account | `navbar.account` | Orders if signed in, otherwise sign-in |

Bar height: **58 px**, plus the device safe-area inset at the bottom.  
Background: white at 95% opacity. Top border: `#e2e8f0`.  
Shadow: `0 -8px 24px rgba(15, 23, 42, 0.06)`.

Side icons are **18 px**. Inactive color `#94a3b8`. Active color is the store navbar background color from `GET /api/store/navbar-menu` field `backgroundColor`. If that color is empty, keep inactive gray.  
Side labels are **9 px**, one line, truncated.  
Cart shows a badge when the count is greater than 0. Cap the badge text at `99+`. Badge background is the same navbar color, text is white.

The center slot is raised **16 px** above the bar (`-mt-4` on the web).

On the website the whole bar is hidden on a product detail page. Match that: hide this bar while a product detail screen is open.

---

## 3. Center circle

Size: **46 × 46 px**. Fully round. White ring **3 px**.  
Shadow: `0 4px 14px` using the background color at **35% opacity**.

### What is drawn inside the circle

Use the first rule that matches:

1. **Image.** `bottomNavMode` is `image` and `bottomNavImageUrl` is not empty.  
   Fill the circle with the image, cropped (`BoxFit.cover`). No percent icon on top of the image.
2. **Text inside.** `bottomNavMode` is `text` and `bottomNavCircleText` is not empty.  
   White, extra bold, **11 px**, centered, single line, max width about 40 px, ellipsis.  
   Example: `10:10` or `SALE`.
3. **GIF.** `navGifUrl` is not empty, and rules 1 and 2 did not match.  
   Show the GIF at **28 × 28 px**, contained, centered, on the colored circle.
4. **Percent icon.** Everything else, including `bottomNavMode` `icon`.  
   White percent mark, about **21 px**, stroke width 2.5.

Typing text inside the circle on the website switches the mode to `text`. Clearing that text switches the mode back to `icon`, which is the percent mark. An uploaded round image uses mode `image`.

### Color

`bottomNavBackgroundColor` is the circle fill.

- Build a darker shade by subtracting **32** from each RGB channel (clamp 0–255).
- Circle fill is a linear gradient at **145 degrees**, from the saved color to that darker shade.
- When an image fills the circle, the image covers the gradient. The saved color is only the fallback behind the image.
- The words **under** the circle use the saved color. When this destination is the current screen, use the darker shade.

Default color `#ea580c`. Darker shade of that default is about `#ca3e00`.

### Words under the circle

These are **not** the navbar “UNDER 99” label. They come only from:

- English app language: `bottomNavBelowText`
- Arabic app language: `bottomNavBelowTextAr`, and if that is empty, `bottomNavBelowText`

If the chosen string is empty, draw **nothing** under the circle. Do not invent “UNDER 99” or “Today's Deals”.

If the string has spaces, put every word except the last on line 1, and the last word on line 2.

| Saved text | Line 1 | Line 2 |
|---|---|---|
| `SALE` | SALE | (none) |
| `10:10` | 10:10 | (none) |
| `UNDER 99` | UNDER | 99 |

Text is **8 px**, semibold, centered, color from the section above. Tight line height.

---

## 4. Where the tap goes

`bottomNavHref` is a website path or a full `http` / `https` URL. Map paths to in-app screens. Open a full `https://` URL in the in-app browser or external browser, same as a normal link.

| Path prefix | Screen |
|---|---|
| `/` | Home |
| `/shop` | Shop |
| `/categories` | Categories |
| `/new-arrivals` | New arrivals |
| `/best-sellers` | Best sellers |
| `/offers` | Offers / Today's Deals (default) |
| `/about-us` | About us |
| `/contact-us` | Contact |
| `/faq` | FAQ |
| `/support` | Support |
| `/help` | Help |
| `/privacy-policy` | Privacy policy |
| `/terms-and-conditions` | Terms |
| `/shipping-policy` | Shipping policy |
| `/return-policy` | Return policy |
| `/cookie-policy` | Cookie policy |
| `/warranty-policy` | Warranty policy |
| `/category/{slug}` | Category page. `slug` may contain slashes, for example `/category/brands/porodo` |
| `/brand/{slug}` | Brand page, for example `/brand/nexso` |
| `/product/{slug}` or `/products/{slug}` | Product detail. The value is the product slug |
| `/c/{slug}` | Campaign landing page |
| `/cart` | Cart |
| anything else starting with `/` | The matching in-app route, or the website page in a web view |
| `https://...` | External link |

The current item is active when the path equals the screen, or the screen is under that path (`/shop/foo` is active for `/shop`). Home `/` is active only on the home screen. External links are never marked active.

Empty or invalid `bottomNavHref` means `/offers`.

---

## 5. Animation

`bottomNavAnimation` repeats forever, ease-in-out, on the **circle only** (not the words under it). `none` means no motion. Respect the system “reduce motion” setting and then play none.

| Value | Duration | Motion |
|---|---|---|
| `none` | | Still |
| `popup` | 1.35 s | scale 1 → 1.16 at 35% → 0.94 at 55% → 1.06 at 75% → 1 |
| `pulse` | 1.5 s | scale 1 and opacity 1 → scale 1.08 and opacity 0.82 at 50% → back |
| `bounce` | 1.2 s | y 0 → -6 px at 40% → +2 px at 60% → 0 |
| `shake` | 0.7 s | x/rotate: 0 → -3 px / -4° at 20% → +3 px / +4° at 40% → -2 px / -2° at 60% → +2 px / +2° at 80% → 0 |
| `glow` | 1.6 s | no shadow at the ends; at 50% a white drop shadow, blur 8 px, alpha 0.85 |
| `float` | 2 s | y 0 → -4 px at 50% → 0 |

Unknown values are `none`.

---

## 6. What the seller can change (website only)

The app does not need these screens. They explain why the JSON changes.

Dashboard page: `/store/customize/bottom-button`  
Also linked from Customize and the sidebar as **Mobile bottom button**.

| Control | What it writes |
|---|---|
| Percent icon | `bottomNavMode = icon`. Circle shows % |
| Round image | Upload, then `bottomNavMode = image` and `bottomNavImageUrl`. Square art is cropped to a circle. Max 2 MB |
| Circle text | `bottomNavMode = text` and `bottomNavCircleText` (max 12). Blank text returns to the percent icon |
| Text below the circle (English) | `bottomNavBelowText` (max 24). Blank means no words under the circle |
| Text below the circle (Arabic) | `bottomNavBelowTextAr`. **Translate** fills this from the English field. The app does not call translate |
| Background color | `bottomNavBackgroundColor` |
| Animation | `bottomNavAnimation` |
| Link | `bottomNavHref`, chosen as a page, category, brand, product, landing page (`/c/{slug}`), or a custom URL |

Saving writes the whole `offersPage` object through the seller API. The public GET above is what the app should trust after the seller taps Save.

---

## 7. Flutter checklist

- Read `offersPage` from `/api/store/appearance/sections/public`.
- Skeleton circle while the first load is in flight. No percent icon yet.
- Draw image, inside text, GIF, or percent using the rules in section 3.
- Draw below-text only when that language’s field is non-empty.
- Use Arabic text when the app language is Arabic.
- Apply color, darker active color, gradient, ring, and shadow.
- Run the named animation on the circle.
- Route `bottomNavHref` with the table in section 4.
- Hide the bar on product detail, same as the website.
- Do not keep a local copy of the label, color, or link that ignores this API.
