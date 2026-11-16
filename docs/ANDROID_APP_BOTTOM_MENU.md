# HAMODY app bottom menu

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/footer`  
Web source: `lib/mobileAppFooter.js`, `components/store/MobileFooterEditor.jsx`

This is the bottom bar the seller designs for the **mobile app**. It is not shown on the website.

Do not build this bar from `GET /api/store/appearance/sections/public`. That response is the website phone bar (Home, Shop, center circle, Cart, Account). The center circle is [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md). The app header is [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md).

```http
GET https://www.hamody.com/api/public/mobile-features
```

No login. Do not send `Authorization`. The response is cached for about 3 minutes. Cache the last good `mobileFeatures.appFooter` on the device, including the icon files. If a refresh fails, keep that cache. If this is the first launch and the request fails, draw the default bar in section 4.

Read only `mobileFeatures.appFooter`. The rest of `mobileFeatures` is other app blocks.

Hide the bar when `enabled` is false, or when `items` is empty.

English is left to right, in the order of `items`. Arabic mirrors the row. A label uses `labelAr` when the language is Arabic and that field is not empty. Otherwise use `label`.

A path that starts with `/` is a screen in the app. `https://` opens in the in-app browser. Ignore `javascript:` and `data:`.

---

## 1. What the seller sets

There are five fixed slots. The seller cannot add a sixth slot and cannot change the order. A slot they turn off is omitted from `items`.

| `id` | Default label | Default Arabic | Default path | Built-in icon |
|---|---|---|---|---|
| `home` | Home | الرئيسية | `/` | House |
| `categories` | Categories | الفئات | `/categories` | Rounded square with four dots |
| `cart` | Cart | السلة | `/cart` | Shopping cart |
| `support` | Support | الدعم | `/support` | Message bubble |
| `account` | Account | الحساب | `/dashboard/profile` | Person |

Labels are at most 24 characters. The English label is never empty. The Arabic label may be empty.

Each slot can have two files: the normal icon and the selected icon. PNG, JPG, WEBP, or GIF. A GIF keeps playing. An empty icon means draw the built-in icon. Uploaded icons are drawn as the file. Do not tint them.

---

## 2. Sample

Empty icon fields are omitted. This sample is the default bar with a custom cart icon.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "appFooter": {
      "enabled": true,
      "placement": "fixed",
      "sideInsetPx": 16,
      "contentPaddingX": 8,
      "backgroundColor": "#f4f2ff",
      "inactiveColor": "#c5c2f6",
      "activeColor": "#5b35e6",
      "radiusPx": 40,
      "heightPx": 74,
      "iconWidthPx": 16,
      "iconHeightPx": 16,
      "labelWidthPx": 48,
      "labelHeightPx": 9,
      "bottomSpacePx": 12,
      "hideOnScroll": false,
      "clickAnimation": "scale",
      "shadowEnabled": true,
      "shadowColor": "#5b35e6",
      "shadowOpacity": 18,
      "shadowBlurPx": 24,
      "shadowYPx": 10,
      "borderEnabled": false,
      "borderColor": "#ddd8ff",
      "borderWidthPx": 1,
      "items": [
        { "id": "home", "label": "Home", "labelAr": "الرئيسية", "path": "/" },
        { "id": "categories", "label": "Categories", "labelAr": "الفئات", "path": "/categories" },
        {
          "id": "cart",
          "label": "Cart",
          "labelAr": "السلة",
          "path": "/cart",
          "iconUrl": "https://…/cart.png",
          "activeIconUrl": "https://…/cart-on.png"
        },
        { "id": "support", "label": "Support", "labelAr": "الدعم", "path": "/support" },
        { "id": "account", "label": "Account", "labelAr": "الحساب", "path": "/dashboard/profile" }
      ]
    }
  }
}
```

---

## 3. Bar layout

`placement` is always `fixed`. Pin the bar to the bottom of the screen, over the page. Do not put it in the page flow, and do not stretch it to the screen edges.

| Piece | Value |
|---|---|
| Side inset | `sideInsetPx` from the left and the right. Always 16 |
| Gap above the safe area | `bottomSpacePx` (0–80, default 12) |
| Height | `heightPx` (56–120, default 74) |
| Corner radius | `radiusPx` (0–48, default 40). This is one radius for every corner |
| Fill | `backgroundColor` |
| Inner padding | `contentPaddingX` on the left and the right. Always 8 |
| Item | Equal width. Icon above the label, 4 px between them |

The icon box is `iconWidthPx` by `iconHeightPx` (10–40, default 16). The picture fills that box, contained and centered. A built-in icon uses the smaller of those two sizes. Stroke is 2.4 when that item is selected, and 1.8 when it is not.

The label is one line, medium weight, truncated. Its width is `labelWidthPx` (24–96, default 48). Its height is `labelHeightPx` (8–16, default 9), used as the font size.

| State | Icon and label color |
|---|---|
| Selected | `activeColor` |
| Other items | `inactiveColor` |

The selected picture is `activeIconUrl` when that field is present. Otherwise it is `iconUrl`. A slot with neither field uses the built-in icon. An item that is not selected never uses `activeIconUrl`.

### Shadow

When `shadowEnabled` is true:

```text
0  {shadowYPx}px  {shadowBlurPx}px  shadowColor at shadowOpacity percent
```

`shadowOpacity` is 0–100. `18` means 18% opacity. Default shadow is 10 px down, 24 px blur, `#5b35e6` at 18%.

When `shadowEnabled` is false, draw no shadow.

### Border

When `borderEnabled` is true, stroke the bar with `borderColor` at `borderWidthPx` (0–8). The default border is off. When it is off, draw no border.

### Hide while scrolling

`hideOnScroll` false means the bar stays put.

`hideOnScroll` true means the bar slides down off the screen while the page is moving, and slides back when scrolling stops. The move is 300 ms, ease-out. Leave the bar visible on a screen that does not scroll.

---

## 4. Defaults

Use these when the field is missing, and when the first request fails with no cache.

| Field | Default |
|---|---|
| `enabled` | `true` |
| `backgroundColor` | `#f4f2ff` |
| `inactiveColor` | `#c5c2f6` |
| `activeColor` | `#5b35e6` |
| `radiusPx` | `40` |
| `heightPx` | `74` |
| `iconWidthPx` | `16` |
| `iconHeightPx` | `16` |
| `labelWidthPx` | `48` |
| `labelHeightPx` | `9` |
| `bottomSpacePx` | `12` |
| `hideOnScroll` | `false` |
| `clickAnimation` | `scale` |
| `shadowEnabled` | `true` |
| `shadowColor` | `#5b35e6` |
| `shadowOpacity` | `18` |
| `shadowBlurPx` | `24` |
| `shadowYPx` | `10` |
| `borderEnabled` | `false` |
| `borderColor` | `#ddd8ff` |
| `borderWidthPx` | `1` |

An unknown `clickAnimation` is `scale`.

---

## 5. Which item is selected

Compare the current screen with each item’s `path`. The first match in `items` is selected.

`/` is selected only on the home screen. Any other path is selected when the screen equals that path, or the screen is under it. `/shop/foo` selects an item whose path is `/shop`. An `https://` link is never selected.

---

## 6. Where a tap goes

| Path prefix | Screen |
|---|---|
| `/` | Home |
| `/shop` | Shop |
| `/categories` | Categories |
| `/new-arrivals` | New arrivals |
| `/best-sellers` | Best sellers |
| `/offers` | Offers |
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
| `/dashboard/profile` | Account |
| `/category/{slug}` | Category page. The slug may contain slashes |
| `/brand/{slug}` | Brand page |
| `/product/{slug}` or `/products/{slug}` | Product detail |
| `/c/{slug}` | Campaign landing page |
| `/cart` | Cart |
| anything else starting with `/` | The matching in-app route, or the website page in a web view |
| `https://...` | External link |

An empty or invalid path uses that slot’s default path from section 1.

---

## 7. Tap animation

The animation plays on the **icon only**, once, when that item is tapped. `none` means the icon stays still.

| Value | Duration | Motion |
|---|---|---|
| `none` | | Still |
| `scale` | 0.42 s | scale 1 → 1.16 at 45% → 1 |
| `lift` | 0.42 s | y 0 → −8 px at 45% → 0 |
| `pop` | 0.42 s | scale 0.86 → 1.12 at 55% → 1 |
| `fade` | 0.42 s | opacity 1 → 0.35 at 40% → 1 |
| `bounce` | 0.50 s | y 0 → −10 px at 35% → +3 px at 60% → 0 |

---

## 8. Checklist

- Read `appFooter` from `GET /api/public/mobile-features`.
- Hide the bar when `enabled` is false or `items` is empty.
- Draw the five slots that are present, in that order. Mirror the row in Arabic.
- Use `labelAr` only when it is not empty.
- Use the uploaded icon when the field is present. Otherwise draw the built-in icon in the state color.
- Pin the bar with `placement: fixed`. Inset it by `sideInsetPx` on each side, and by `bottomSpacePx` above the safe area.
- Apply height, radius, fill, shadow, and border from the payload.
- Draw each icon at `iconWidthPx` by `iconHeightPx`. Draw each label at `labelWidthPx` wide and `labelHeightPx` as the font size.
- Mark the matching path as selected. Home `/` is selected only on home.
- Play `clickAnimation` on the tapped icon.
- Slide the bar away while scrolling only when `hideOnScroll` is true.
- Open `path` with the table in section 6.
