# Store1920 app navbar

Last updated: 22 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/navbar`  
Web source: `lib/mobileAppNavbar.js`, `components/store/MobileNavbarEditor.jsx`

This is the navbar the seller designs for the **mobile app**. It is not the website header.

Do not read this bar from `GET /api/store/navbar-menu` or `GET /api/store/settings`. Those are the website logo, search, and phone row. That spec is [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md). The black category strip under the website header is [ANDROID_CATEGORY_BAR.md](./ANDROID_CATEGORY_BAR.md).

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`. The response is cached for about 3 minutes. Cache the last good `mobileFeatures.appNavbar` on the device. If a refresh fails, keep that cache. Never replace a saved logo or icon with an empty one.

Read only `mobileFeatures.appNavbar`. The rest of `mobileFeatures` is other home blocks.

`appNavbar.enabled` false hides the home bar. Inner pages still use `appNavbar.pageNavbar`.

English is left to right. Arabic mirrors every row. Marquee text uses `textAr` when the language is Arabic and that field is not empty. Search uses `placeholderAr` the same way. A link or image URL that starts with `/` is on this site. `https://` is a full URL. Ignore `javascript:` and `data:`.

---

## 1. Two bars

| Screen | Object | What it is |
|---|---|---|
| Home | `appNavbar` | Marquee, logo row, search. One colored block with rounded bottom corners |
| Every other screen | `appNavbar.pageNavbar` | Back, search, heart |

```
Home
┌─────────────────────────────────────┐
│  Cash On Delivery    tamara    …    │  marquee
│  [logo]              location  EN   │  logo row
│  [≡]  Search              |  📷     │  search
└─────────────────────────────────────┘

Other screens
┌─────────────────────────────────────┐
│  ←     [  🔍  Search            ]  ♡ │
└─────────────────────────────────────┘
```

The location line and the language word are the app’s own copy. Draw them on the end side of the logo row. Paint the location words and the pin with `logoRow.locationColor`. Paint the language word with `logoRow.languageColor`. Both default to `#ffffff`.

---

## 2. Sample `appNavbar`

Fields that are empty are omitted. `marquee.items` only includes lines the seller left on, and only lines that have an icon or text.

```json
{
  "enabled": true,
  "heightPx": 176,
  "radius": { "topLeft": 0, "topRight": 0, "bottomLeft": 28, "bottomRight": 28 },
  "background": {
    "mode": "color",
    "color": "#6d35e8",
    "gradientFrom": "#8b5cf6",
    "gradientTo": "#5b21b6",
    "gradientPosition": 100,
    "gradientAngle": 180
  },
  "logoUrl": "https://…/logo.png",
  "logoRow": {
    "heightPx": 72,
    "marginTopPx": 8,
    "marginBottomPx": 0,
    "paddingX": 16,
    "locationColor": "#ffffff",
    "languageColor": "#ffffff"
  },
  "search": {
    "enabled": true,
    "placeholder": "Search",
    "placeholderAr": "بحث",
    "backgroundColor": "#ffffff",
    "textColor": "#b7b6f2",
    "menuButtonColor": "#eceefe",
    "menuButtonRadius": 16,
    "dividerColor": "#c9caf6",
    "heightPx": 48,
    "marginTopPx": 8,
    "marginBottomPx": 12,
    "paddingX": 12,
    "radiusPx": 32,
    "iconSizePx": 18
  },
  "marquee": {
    "enabled": true,
    "heightPx": 36,
    "marginTopPx": 8,
    "marginBottomPx": 0,
    "paddingX": 0,
    "speedSeconds": 16,
    "textColor": "#ffffff",
    "gapPx": 28,
    "iconSizePx": 18,
    "fontSizePx": 13,
    "items": [
      { "id": "nav-line-1", "text": "Cash On Delivery", "textAr": "الدفع عند الاستلام", "color": "#ffffff" }
    ]
  },
  "pageNavbar": {
    "enabled": true,
    "backgroundMode": "color",
    "backgroundColor": "#f6f5fb",
    "iconColor": "#6b4ce6",
    "backEnabled": true,
    "heartEnabled": true,
    "searchEnabled": true,
    "placeholder": "Search",
    "searchBackground": "#ffffff",
    "searchBorderColor": "#ddd6fe",
    "searchTextColor": "#6b4ce6",
    "gradientFrom": "#8b5cf6",
    "gradientTo": "#5b21b6",
    "gradientPosition": 100,
    "gradientAngle": 180,
    "backgroundMediaUrl": "",
    "backgroundMediaKind": "image",
    "heightPx": 56,
    "paddingX": 12,
    "searchRadiusPx": 22,
    "iconSizePx": 22,
    "backIconUrl": "",
    "searchIconUrl": "",
    "heartIconUrl": ""
  }
}
```

`menuIconUrl`, `searchIconUrl`, and `cameraIconUrl` appear on `search` only when the seller uploaded that icon. `iconUrl` appears on a marquee item only when that line has an icon. `background.mediaUrl` and `background.mediaKind` appear only when a background file is saved.

---

## 3. Home bar

Full width. Pinned under the status bar. Three bands, top to bottom.

`heightPx` on the root object adds every band, including a band that is hidden. Do not use it when the marquee or the search is off. The drawn height is:

- Marquee on: `marquee.marginTopPx + marquee.heightPx + marquee.marginBottomPx`. Marquee off: **12**.
- Logo row, always: `logoRow.marginTopPx + logoRow.heightPx + logoRow.marginBottomPx`.
- Search on: `search.marginTopPx + search.heightPx + search.marginBottomPx`. Search off: **12**.

### Background

One fill behind all three bands.

| `background.mode` | Fill |
|---|---|
| `color` | `background.color`. Default `#6d35e8` |
| `gradient` | `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)`. Angle default **180** (top to bottom). Colors default `#8b5cf6` to `#5b21b6`. Position default **100** |
| `media` | `background.mediaUrl` covers the bar (`object-fit: cover`). `background.mediaKind` is `image` (JPEG, PNG, WebP, GIF) or `video` (muted, looped, no sound). Keep `background.color` visible until the file loads |

Corners are in `radius`, in px. Default top **0**, bottom **28**. Clamp 0–80.

| Field | Corner |
|---|---|
| `radius.topLeft` | Top start |
| `radius.topRight` | Top end |
| `radius.bottomLeft` | Bottom start |
| `radius.bottomRight` | Bottom end |

In Arabic, start is the right edge and end is the left edge.

### Marquee

Skip this band when `marquee.enabled` is false or `marquee.items` is empty. At most **12** items.

| Field | Default | Range |
|---|---|---|
| `heightPx` | 36 | 24–120 |
| `marginTopPx` | 8 | 0–80 |
| `marginBottomPx` | 0 | 0–80 |
| `paddingX` | 0 | 0–40 |
| `fontSizePx` | 13 | 10–22 |
| `iconSizePx` | 18 | 12–36 |
| `gapPx` | 28 | 8–80 |
| `textColor` | `#ffffff` | |
| `speedSeconds` | 16 | 4–60 |

Each item has `id`, `text`, `textAr`, optional `iconUrl`, and `color`. An empty `color` is already replaced with `marquee.textColor` before the app sees it. The icon is `iconSizePx`, **6** px before the text. Text is one line, semibold.

Draw the item list twice, in one row. Move that row by half its width over `speedSeconds`, linear, forever. The row does not pause. Side padding is `paddingX`. The gap between items is `gapPx` (`paddingInline` of `gapPx / 2` on each item).

### Logo row

Always drawn.

| Field | Default | Range |
|---|---|---|
| `logoRow.heightPx` | 72 | 40–160 |
| `logoRow.marginTopPx` | 8 | 0–80 |
| `logoRow.marginBottomPx` | 0 | 0–80 |
| `logoRow.paddingX` | 16 | 0–40 |
| `logoRow.locationColor` | `#ffffff` | Deliver-to line and the pin |
| `logoRow.languageColor` | `#ffffff` | Language word |

The logo box is **56 × 56**, radius **16**, on the start side, vertically centered. `logoUrl` fills the box, cropped. The file may be a PNG, JPG, WEBP, or an animated GIF. Play a GIF inside the box. When `logoUrl` is missing, the box is white at 20% opacity and the words `store` and `1920` are white, about **9** px, bold. The seller sets this file at `/store/mobile-features/app-icon`.

### Search

Skip this band when `search.enabled` is false.

| Field | Default | Range |
|---|---|---|
| `heightPx` | 48 | 36–80 |
| `marginTopPx` | 8 | 0–80 |
| `marginBottomPx` | 12 | 0–80 |
| `paddingX` | 12 | 0–40 |
| `radiusPx` | 32 | 0–40 |
| `iconSizePx` | 18 | 12–28 |
| `backgroundColor` | `#ffffff` | |
| `textColor` | `#b7b6f2` | placeholder and the default icons |
| `menuButtonColor` | `#eceefe` | |
| `menuButtonRadius` | 16 | 0–24 |
| `dividerColor` | `#c9caf6` | |
| `placeholder` / `placeholderAr` | Search / بحث | 40 characters |

The pill is inset by `paddingX`. Inside the pill: **4** px start padding, **14** px end padding, **8** px between pieces.

| Piece | Size | Tap |
|---|---|---|
| Menu button | 78% of the pill height, square, radius `menuButtonRadius`, fill `menuButtonColor` | Opens the app category menu |
| Menu icon | `iconSizePx`. `menuIconUrl` when set, otherwise three horizontal lines in `textColor` | |
| Search icon | `iconSizePx`. `searchIconUrl` when set, otherwise a magnifying glass in `textColor` | Focuses search |
| Placeholder | `max(13, iconSizePx - 2)` px, medium, `textColor`, one line | Opens search |
| Divider | 1 px wide, 42% of the pill height, `dividerColor` | |
| Camera | `iconSizePx`. `cameraIconUrl` when set, otherwise a camera in `textColor` | Image search. See [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md) |

An empty icon URL means the default icon.

---

## 4. Other pages

`pageNavbar.enabled` false hides this bar. The home bar is unchanged.

One row. Full width. Background uses the same three modes as the home bar: `backgroundMode` `color`, `gradient`, or `media`. Flat color is `backgroundColor`. Gradient uses `gradientFrom`, `gradientTo`, `gradientPosition`, and `gradientAngle`. A file uses `backgroundMediaUrl` and `backgroundMediaKind` (`image` or `video`, muted and looped).

| Field | Default | Range |
|---|---|---|
| `backgroundColor` | `#f6f5fb` | Used when `backgroundMode` is `color` |
| `iconColor` | `#6b4ce6` | Back and heart when no custom icon is set |
| `heightPx` | 56 | 44–96 |
| `paddingX` | 12 | 0–32 |
| `iconSizePx` | 22 | 14–32 |
| `searchRadiusPx` | 22 | 0–40 |
| `searchBackground` | `#ffffff` | |
| `searchBorderColor` | `#ddd6fe` | |
| `searchTextColor` | `#6b4ce6` | |
| `placeholder` | Search | 40 characters. There is no Arabic placeholder on this bar |
| `backEnabled` | true | |
| `searchEnabled` | true | |
| `heartEnabled` | true | |

| Piece | Draw | Tap |
|---|---|---|
| Back | `backIconUrl`, or a chevron in `iconColor` at `iconSizePx`. Hidden when `backEnabled` is false. Keep a gap the size of the icon | Previous screen |
| Search | Centered, flex. Height is 68% of `heightPx`. Radius `searchRadiusPx`. Border 1 px `searchBorderColor`. Icon is 80% of `iconSizePx` (`searchIconUrl` or a magnifying glass). Placeholder is **14** px, medium, `searchTextColor` | Search |
| Heart | `heartIconUrl`, or a heart outline in `iconColor`. Hidden when `heartEnabled` is false. Keep a gap the size of the icon | Wishlist |

Gap between the three pieces is **12** px. Custom icons are contained in the icon box, not cropped.

---

## 5. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Home uses `mobileFeatures.appNavbar`. Other screens use `appNavbar.pageNavbar`.
- Do not use `GET /api/store/navbar-menu` for this bar.
- Draw a band only when it is enabled. Do not trust root `heightPx` while a band is hidden.
- Marquee text loops and does not pause.
- The search camera opens image search.
- Logo, menu, search, camera, back, and heart use the uploaded URL when that field is present.
