# Store1920 app navbar — design from the seller dashboard

Last updated: 20 October 2026  
Audience: Android app  
Seller page: `/store/mobile-features/navbar`  
Web source: `components/store/MobileNavbarEditor.jsx`

This is the **app** navbar the seller designs under Mobile. It is not the website header.

Do not read this bar from `GET /api/store/navbar-menu` or `GET /api/store/settings`. Those are the website logo, search, and phone row. That spec is [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md).

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`.

Read `mobileFeatures.appNavbar`. Cache the last good response. If a refresh fails, keep that cache. Never replace a saved logo with an empty one.

`appNavbar.enabled` false hides the home bar. Inner pages still use `appNavbar.pageNavbar`.

---

## 1. Two bars

| Screen | Object | What it is |
|---|---|---|
| Home | `appNavbar` | Marquee, logo, search. Colored or gradient block with rounded bottom corners |
| Every other screen | `appNavbar.pageNavbar` | Back, search, heart |

English is left to right. Arabic mirrors the row. Marquee and search text use `textAr` / `placeholderAr` when the language is Arabic and that field is not empty.

---

## 2. Home bar

Three bands, top to bottom. Full width. Pinned under the status bar.

```
┌─────────────────────────────────────┐
│  Cash On Delivery    tamara    …    │  marquee
│  [logo]              location  EN   │  logo row
│  [≡]  Search              |  📷     │  search
└─────────────────────────────────────┘
```

The location label and the language switch are the app’s own words. Draw them on the end side of the logo row. Paint the location words and pin with `logoRow.locationColor`. Paint the language word with `logoRow.languageColor`. Both default to `#ffffff`.

`heightPx` on `appNavbar` is the sum of the three bands, including their margins. Use the band fields below. Do not invent a second height.

### Background

| `background.mode` | Fill |
|---|---|
| `color` | `background.color`. Default `#6d35e8` |
| `gradient` | `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)`. Angle default **180** (top to bottom). Colors default `#8b5cf6` → `#5b21b6`, position **100** |
| `media` | `background.mediaUrl` covers the bar. `background.mediaKind` is `image` (JPEG, PNG, WebP, GIF) or `video` (muted, loop). Keep `background.color` behind it until the file loads |

`pageNavbar` uses the same `backgroundMode`, `gradientFrom`, `gradientTo`, `gradientPosition`, `gradientAngle`, `backgroundMediaUrl`, and `backgroundMediaKind`. `backgroundColor` stays the flat color.

Corners, in px. Default top **0**, bottom **28**. Clamp 0–80.

| Field | Corner |
|---|---|
| `radius.topLeft` | Top start |
| `radius.topRight` | Top end |
| `radius.bottomLeft` | Bottom start |
| `radius.bottomRight` | Bottom end |

### Marquee

Skip the band when `marquee.enabled` is false or `marquee.items` is empty.

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

Each item: `text`, `textAr`, optional `iconUrl`, `color`. `color` empty means `marquee.textColor`. Icon sits **6** px before the text. Text is one line, semibold.

Draw the items twice, in one row, and move that row by half its width over `speedSeconds`, linear, forever. The row does not pause.

### Logo row

| Field | Default | Range |
|---|---|---|
| `logoRow.heightPx` | 72 | 40–160 |
| `logoRow.marginTopPx` | 8 | 0–80 |
| `logoRow.marginBottomPx` | 0 | 0–80 |
| `logoRow.paddingX` | 16 | 0–40 |
| `logoRow.locationColor` | `#ffffff` | Deliver to, city, and the pin |
| `logoRow.languageColor` | `#ffffff` | Language word |

Logo is **56 × 56**, radius **16**, on the start side, vertically centered. `logoUrl` fills the box, cropped. When `logoUrl` is missing, draw the word store1920 in white on white at 20% opacity.

### Search

Skip the band when `search.enabled` is false.

| Field | Default | Range |
|---|---|---|
| `heightPx` | 48 | 36–80 |
| `marginTopPx` | 8 | 0–80 |
| `marginBottomPx` | 12 | 0–80 |
| `paddingX` | 12 | 0–40 |
| `radiusPx` | 32 | 0–40 |
| `iconSizePx` | 18 | 12–28 |
| `backgroundColor` | `#ffffff` | |
| `textColor` | `#b7b6f2` | placeholder and default icons |
| `menuButtonColor` | `#eceefe` | |
| `menuButtonRadius` | 16 | 0–24 |
| `dividerColor` | `#c9caf6` | |
| `placeholder` / `placeholderAr` | Search / بحث | 40 characters |

The pill is inset by `paddingX`. Inside the pill: **4** px start padding, **14** px end padding, **8** px between pieces.

| Piece | Size | Tap |
|---|---|---|
| Menu button | 78% of the pill height, square, radius `menuButtonRadius`, fill `menuButtonColor` | Opens the category menu |
| Menu icon | `iconSizePx`. `menuIconUrl` when set, otherwise three horizontal lines in `textColor` | |
| Search icon | `iconSizePx`. `searchIconUrl` when set, otherwise a magnifying glass in `textColor` | Focuses search |
| Placeholder | `max(13, iconSizePx - 2)`, medium, `textColor`, one line | Opens search |
| Divider | 1 px wide, 42% of the pill height, `dividerColor` | |
| Camera | `iconSizePx`. `cameraIconUrl` when set, otherwise a camera in `textColor` | Image search. See [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md) |

A `menuIconUrl`, `searchIconUrl`, or `cameraIconUrl` that is empty means the default icon. Ignore `javascript:` and `data:` URLs.

---

## 3. Other pages

`pageNavbar.enabled` false hides this bar. Home is unchanged.

One row. Full width.

| Field | Default | Range |
|---|---|---|
| `backgroundColor` | `#f6f5fb` | flat color when `backgroundMode` is `color` |
| `backgroundMode` | `color` | `color`, `gradient`, or `media`. Same fill rules as the home bar |
| `backgroundMediaUrl` | empty | image, WebP, GIF, or video. Present when a file is saved |
| `backgroundMediaKind` | `image` | `video` plays muted and looped |
| `iconColor` | `#6b4ce6` | back and heart when no custom icon |
| `heightPx` | 56 | 44–96 |
| `paddingX` | 12 | 0–32 |
| `iconSizePx` | 22 | 14–32 |
| `searchRadiusPx` | 22 | 0–40 |
| `searchBackground` | `#ffffff` | |
| `searchBorderColor` | `#ddd6fe` | |
| `searchTextColor` | `#6b4ce6` | |
| `placeholder` | Search | 40 characters |
| `backEnabled` | true | |
| `searchEnabled` | true | |
| `heartEnabled` | true | |

| Piece | Draw | Tap |
|---|---|---|
| Back | `backIconUrl`, or a chevron in `iconColor` at `iconSizePx`. Hidden when `backEnabled` is false. Keep the gap | Previous screen |
| Search | Centered, flex. Height is 68% of the bar. Radius `searchRadiusPx`. Border 1 px. Icon is 80% of `iconSizePx` (`searchIconUrl` or a magnifying glass). Placeholder is 14 px, medium | Search |
| Heart | `heartIconUrl`, or a heart outline in `iconColor`. Hidden when `heartEnabled` is false. Keep the gap | Wishlist |

---

## 4. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Home uses `mobileFeatures.appNavbar`. Other screens use `appNavbar.pageNavbar`.
- Do not use `GET /api/store/navbar-menu` for this bar.
- Marquee text loops. Search camera opens image search.
- Logo, menu, search, camera, back, and heart use the uploaded URL when that field is not empty.
