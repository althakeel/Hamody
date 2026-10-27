# Store1920 app navbar — API and drawing spec

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page that edits this: `/store/mobile-features/navbar`

This document is the home header and the header used on every other screen. The seller designs both on that one page, plus Banner 1, the home banner that sits under the search. Each Banner 1 slide paints this header with its own top background. The share document for that pair is [ANDROID_APP_BANNER_1.md](./ANDROID_APP_BANNER_1.md).

This is not the website header. Do not read `GET /api/store/navbar-menu` or `GET /api/store/settings` for this bar.

---

## 1. API

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`.

Optional query: `?storeId=` a store id. Without it, the response is the public store.

Response headers: `Cache-Control: public, s-maxage=180, stale-while-revalidate=300`. Keep the last good payload on the device. If a refresh fails, keep that copy. A server error still returns HTTP 200 with `success: true` and the built-in defaults, so an empty body is not the failure signal. A failed network call is.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "appNavbar": {},
    "bannerSlider": {}
  }
}
```

Read only these two objects for this screen:

| Screen | Object |
|---|---|
| Home header | `mobileFeatures.appNavbar` |
| Home banner under the search | `mobileFeatures.bannerSlider` |
| Every screen except home | `mobileFeatures.appNavbar.pageNavbar` |

`appNavbar.enabled` false hides the home header. The banner and the other-pages header are separate flags.

A URL that starts with `/` is on this site. `http://` and `https://` are full URLs. Ignore `javascript:` and `data:`.

English is left to right. Arabic mirrors every row. Marquee text uses `textAr` when the app language is Arabic and that field is not empty. Home search uses `placeholderAr` the same way. The other-pages search has no Arabic placeholder.

---

## 2. Home, top to bottom

Full width. Pinned under the status bar. Square bottom. No colored strip under the banner.

```
┌─────────────────────────────────────┐
│  Cash On Delivery    tamara    …    │  marquee
│  📍 Deliver to                      │  address
│  Address line…                      │
│  ┌ Search              📷  [🔍] ┐   │  one search field
│  └──────────────────────────────┘   │
│████████████ banner, edge to edge ███│  bannerSlider
│              · ● ·                  │  dots on the image
└─────────────────────────────────────┘
```

The banner has no side inset and no corner radius. The dots sit on the bottom of the image, centered.

`appNavbar.heightPx` adds every band, including a band that is hidden. Do not use it as the drawn height. Draw:

1. Marquee, when `marquee.enabled` is true and `marquee.items` is not empty. When it is off, leave **12** px.
2. Deliver to, always. Height comes from `logoRow`.
3. Search, when `search.enabled` is true. When it is off, leave **12** px.
4. Banner, when `bannerSlider.enabled` is true.

When `logoUrl` is present, draw it at the start of the Deliver to row. Box **56 × 56**, radius **16**, image covering the box. A GIF keeps playing. A tap does nothing. This is the header mark, not the phone’s main app icon. That icon is `mobileFeatures.appIcon.url` in [ANDROID_APP_ICON.md](./ANDROID_APP_ICON.md). Do not draw a language switch. `languageColor` is still on `logoRow` and is unused here. Do not draw a menu button or a divider. `search.menuButtonColor`, `search.dividerColor`, and `search.menuIconUrl` are unused by this layout.

---

## 3. `appNavbar` fields

Numbers below are the values the API returns after clamping. The app does not need to clamp again.

### Root

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | `false` hides the home header |
| `heightPx` | sum of the three bands | Do not use this as the drawn height |
| `radius.topLeft` | `0` | Top start corner, 0–80 |
| `radius.topRight` | `0` | Top end corner, 0–80 |
| `radius.bottomLeft` | `0` | Always 0. Square bottom |
| `radius.bottomRight` | `0` | Always 0. Square bottom |
| `logoUrl` | omitted when empty | Header mark, 56×56, at the start of the Deliver to row. This is not the phone’s main app icon. That icon is `mobileFeatures.appIcon.url` in [ANDROID_APP_ICON.md](./ANDROID_APP_ICON.md) |

In Arabic, start is the right edge and end is the left edge.

### `background`

One fill behind the marquee, Deliver to, and search. A banner slide can replace this fill while that slide is on screen. See section 6.

| `background.mode` | Draw |
|---|---|
| `color` | `background.color`. Default `#d8f4f6` |
| `gradient` | `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)` |
| `media` | `background.mediaUrl` covers the header (`object-fit: cover`). `mediaKind` is `image` or `video`. JPEG, PNG, WebP, and GIF are images. A video is muted, looping, and has no controls. Keep `background.color` visible until the file loads |

`mediaUrl` and `mediaKind` are omitted when no file is saved.

| Field | Default | Range |
|---|---|---|
| `gradientFrom` | `#8b5cf6` | |
| `gradientTo` | `#5b21b6` | |
| `gradientAngle` | `180` | 0–360. `180` is top to bottom |
| `gradientPosition` | `100` | 1–100. Percent where the end color is reached |

### `marquee`

Skip the band when `enabled` is false or `items` is empty. The API already drops disabled lines and lines with no icon and no text. At most 12 items.

| Field | Default | Range |
|---|---|---|
| `heightPx` | `36` | 24–120 |
| `marginTopPx` | `8` | 0–80 |
| `marginBottomPx` | `0` | 0–80 |
| `paddingX` | `0` | 0–40 |
| `fontSizePx` | `13` | 10–22 |
| `iconSizePx` | `18` | 12–36 |
| `gapPx` | `28` | 8–80 |
| `textColor` | `#5b35d5` | |
| `speedSeconds` | `16` | 4–60 |

Each item:

| Field | Meaning |
|---|---|
| `id` | Stable id |
| `text` | English line, max 80 characters |
| `textAr` | Arabic line, omitted when empty |
| `iconUrl` | Omitted when empty. Box of `iconSizePx`, contained, not cropped. A GIF keeps playing |
| `color` | This line’s color. Already filled with `marquee.textColor` when the seller left it empty |

The icon sits **6** px before the text. Text is one line, semibold. Draw the item list twice in one row. Move that row by half its width over `speedSeconds`, linear, forever. It does not pause. Side padding is `paddingX`. The gap between items is `gapPx`.

### `logoRow` — Deliver to

Always drawn. This is the address line. When `logoUrl` is present, the 56×56 header mark sits at the start of this row, then the pin and the address. The phone’s main app icon is a different image.

| Field | Default | Range | Use |
|---|---|---|---|
| `heightPx` | `72` | 40–160 | Minimum height of the row |
| `marginTopPx` | `8` | 0–80 | |
| `marginBottomPx` | `0` | 0–80 | |
| `paddingX` | `16` | 0–40 | Side inset |
| `locationColor` | `#5b35d5` | | Pin, “Deliver to”, and the address |
| `languageColor` | `#5b35d5` | | Not drawn |

Pin is **18** px, at the start, aligned to the top of the two text lines. First line: “Deliver to”, **11** px, semibold. Second line: the customer’s saved address, **11** px, one line, truncated, about 90% opacity. The words “Deliver to” are fixed in the app. They are not a field on this object.

### `search`

Skip the band when `enabled` is false.

| Field | Default | Range | Use |
|---|---|---|---|
| `placeholder` | `Search` | 40 characters | English word |
| `placeholderAr` | `بحث` | 40 characters | Arabic word |
| `backgroundColor` | `#d8f4f6` | | Fill inside the field. A slide font color does not change this fill |
| `textColor` | `#6d35e8` | | The word |
| `borderColor` | `#6d35e8` | | Outline and the camera |
| `buttonColor` | `#6d35e8` | | Fill of the button inside the field |
| `menuButtonRadius` | `10` | 0–24 | Button corners. Draw `min(12, menuButtonRadius)` |
| `heightPx` | `48` | 36–80 | |
| `marginTopPx` | `8` | 0–80 | |
| `marginBottomPx` | `12` | 0–80 | |
| `paddingX` | `12` | 0–40 | Inset of the whole field from the screen edges |
| `radiusPx` | `14` | 0–40 | Field corners |
| `iconSizePx` | `18` | 12–28 | Camera and the icon inside the button |
| `cameraIconUrl` | omitted when empty | | Custom camera |
| `searchIconUrl` | omitted when empty | | Custom icon inside the button |
| `menuButtonColor` | `#6d35e8` | | Unused |
| `dividerColor` | `#c9caf6` | | Unused |
| `menuIconUrl` | omitted when empty | | Unused |

One rounded rectangle. The word, the camera, and the button are inside the same border. The button is not a separate box outside the field.

| Piece | Draw | Tap |
|---|---|---|
| Field | Height `heightPx`, radius `radiusPx`, fill `backgroundColor`, border `borderColor` at **1.5** px. Padding **16** px on the start and **4** px on the end. **10** px between the pieces | |
| Word | One line, medium, `max(14, iconSizePx - 1)` px, color `textColor`, at the start | Opens search |
| Camera | `cameraIconUrl` when present, otherwise a camera outline in `borderColor`, size `iconSizePx`. Sits just before the button | Image search. See [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md) |
| Button | Square of `max(32, heightPx - 10)`. Radius `min(12, menuButtonRadius)`. Fill `buttonColor`. Icon is `searchIconUrl` when present, otherwise a white magnifying glass at `iconSizePx` | Opens search |

---

## 4. Sample `appNavbar`

Empty icon URLs are omitted. `marquee.items[].color` is filled even when the seller did not pick a per-line color.

```json
{
  "enabled": true,
  "heightPx": 192,
  "radius": { "topLeft": 0, "topRight": 0, "bottomLeft": 0, "bottomRight": 0 },
  "background": {
    "mode": "color",
    "color": "#d8f4f6",
    "gradientFrom": "#8b5cf6",
    "gradientTo": "#5b21b6",
    "gradientPosition": 100,
    "gradientAngle": 180
  },
  "logoRow": {
    "heightPx": 72,
    "marginTopPx": 8,
    "marginBottomPx": 0,
    "paddingX": 16,
    "locationColor": "#5b35d5",
    "languageColor": "#5b35d5"
  },
  "search": {
    "enabled": true,
    "placeholder": "Search",
    "placeholderAr": "بحث",
    "backgroundColor": "#d8f4f6",
    "textColor": "#6d35e8",
    "borderColor": "#6d35e8",
    "buttonColor": "#6d35e8",
    "menuButtonColor": "#6d35e8",
    "menuButtonRadius": 10,
    "dividerColor": "#c9caf6",
    "heightPx": 48,
    "marginTopPx": 8,
    "marginBottomPx": 12,
    "paddingX": 12,
    "radiusPx": 14,
    "iconSizePx": 18
  },
  "pageNavbar": {},
  "marquee": {
    "enabled": true,
    "heightPx": 36,
    "marginTopPx": 8,
    "marginBottomPx": 0,
    "paddingX": 0,
    "speedSeconds": 16,
    "textColor": "#5b35d5",
    "gapPx": 28,
    "iconSizePx": 18,
    "fontSizePx": 13,
    "items": [
      {
        "id": "nav-line-1",
        "text": "Cash On Delivery",
        "textAr": "الدفع عند الاستلام",
        "color": "#5b35d5"
      },
      { "id": "nav-line-2", "text": "tamara", "textAr": "تمارا", "color": "#5b35d5" },
      {
        "id": "nav-line-3",
        "text": "Deliver within 48 Hours",
        "textAr": "التوصيل خلال 48 ساعة",
        "color": "#5b35d5"
      }
    ]
  }
}
```

`pageNavbar` is the full object in section 7. It is nested here so one response carries both headers.

---

## 5. `bannerSlider` — Banner 1

Same response, `mobileFeatures.bannerSlider`. The seller edits it on the navbar page, including the top background that paints this header. It is the banner directly under the search, full width, square corners. The share document is [ANDROID_APP_BANNER_1.md](./ANDROID_APP_BANNER_1.md).

```json
{
  "enabled": true,
  "slideIntervalSeconds": 4,
  "heightPx": 156,
  "source": "mobile-features",
  "slides": [
    {
      "image": "https://…/banner.jpg",
      "link": "/shop",
      "path": "/shop",
      "title": "",
      "video": "",
      "mediaType": "image",
      "subtitle": "",
      "contentPosition": "left",
      "contentVertical": "center",
      "textAlign": "left",
      "titleColor": "#ffffff",
      "subtitleColor": "#e2e8f0",
      "titleSizePx": 32,
      "subtitleSizePx": 15,
      "fontFamily": "inherit",
      "buttonEnabled": false,
      "buttonText": "Shop now",
      "buttonPath": "/shop",
      "buttonAlign": "left",
      "buttonColor": "#f97316",
      "buttonTextColor": "#ffffff",
      "buttonRadiusPx": 8,
      "hoverAnimation": "none",
      "topBackground": {
        "mode": "color",
        "color": "#ff0000",
        "gradientFrom": "#8b5cf6",
        "gradientTo": "#5b21b6",
        "gradientAngle": 180,
        "gradientPosition": 100
      },
      "fontColor": "#ffffff"
    }
  ]
}
```

| Field | Default | Range | Use |
|---|---|---|---|
| `enabled` | | | `false`, or no slides, means draw no banner |
| `slideIntervalSeconds` | `4` | 2–30 | How long each slide stays before the next |
| `heightPx` | `156` | 100–520 | Banner height. Design frame is about 393 × 150 |
| `source` | | | `mobile-features` or `website-shop-showcase`. See below |
| `slides` | | max 8 | Only enabled slides that have an image or a video |

Each slide the navbar page uses:

| Field | Use |
|---|---|
| `image` | Banner file when `mediaType` is `image`. GIF plays |
| `video` | Banner file when `mediaType` is `video`. Muted, looping, no controls |
| `mediaType` | `image` or `video` |
| `path` | Tap target. Same value as `link`. Empty becomes `/shop`. A value without a scheme is forced to start with `/` |
| `topBackground` | Header fill while this slide is showing. Omitted on website-showcase slides |
| `fontColor` | Header ink while this slide is showing. Omitted when the seller left it empty |

Title, subtitle, and the slide button are stored because this object is shared with other home banners. The navbar banner is a full-bleed image or video. Do not draw the title, subtitle, or button on top of it.

`source: "website-shop-showcase"` means the slides were copied from the website home slider. Those slides have `image`, `link`, `path`, and `title` only. They have no `topBackground` and no `fontColor`. Use the navbar colors for the whole time those slides are showing. `slideIntervalSeconds` may be **3** and `heightPx` may be **168** for that source.

Dots, only when there are two or more slides: centered, **8** px above the bottom of the image. Inactive dot **6 × 6**, white, opacity **0.7**. Active dot **14 × 6**, color `fontColor` when the slide has one, otherwise `logoRow.locationColor`. Gap between dots **6** px.

---

## 6. While a slide is on screen

Each slide can own the header above it. Three slides means three top backgrounds and three font colors.

### Top background

`topBackground.mode`:

| Mode | Draw behind the marquee, Deliver to, and search |
|---|---|
| `color` | `topBackground.color`. If `color` is missing, keep `appNavbar.background` |
| `gradient` | `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)` |
| `media` | `topBackground.mediaUrl` covers that header area. `mediaKind` is `image` (JPEG, PNG, WebP, GIF) or `video` (muted, looping). `mediaUrl` is omitted when no file is saved. Until it loads, show `topBackground.color` if present, otherwise `appNavbar.background` |

This fill stops at the top of the banner. It does not cover the banner image. It does not replace the search field fill. The search fill stays `search.backgroundColor`.

### Font color

When `fontColor` is present, use it for:

- every marquee line
- the Deliver to pin and both address lines
- the search word
- the camera, when no custom camera image is set
- the search outline
- the search button fill
- the active banner dot

The white magnifying glass stays white. Custom uploaded icons keep their own pixels.

When `fontColor` is absent, use `marquee` colors, `logoRow.locationColor`, `search.textColor`, `search.borderColor`, and `search.buttonColor`.

### Motion

Change slides on `slideIntervalSeconds`. Do not cut.

- Crossfade the banner image or video over **700** ms.
- Ease the header background, the colors listed above, and the active dot over **600** ms.
- Stack the slides and fade opacity. A gradient or a video background fades the same way.

---

## 7. Other pages — `appNavbar.pageNavbar`

Every screen except home. `enabled` false hides this bar. The home header is unchanged.

```
┌─────────────────────────────────────┐
│  ←    [ Search           📷  🔍 ]  ♡ │
└─────────────────────────────────────┘
```

English is back, search, heart. Arabic mirrors that row. One row, full width, pinned under the status bar.

### Sample

```json
{
  "enabled": true,
  "backgroundMode": "color",
  "backgroundColor": "#d8f4f6",
  "iconColor": "#6d35e8",
  "backEnabled": true,
  "heartEnabled": true,
  "searchEnabled": true,
  "placeholder": "Search",
  "searchBackground": "#d8f4f6",
  "searchBorderColor": "#6d35e8",
  "searchTextColor": "#6d35e8",
  "searchButtonColor": "#6d35e8",
  "gradientFrom": "#8b5cf6",
  "gradientTo": "#5b21b6",
  "gradientPosition": 100,
  "gradientAngle": 180,
  "backgroundMediaUrl": "",
  "backgroundMediaKind": "image",
  "heightPx": 56,
  "paddingX": 12,
  "searchRadiusPx": 14,
  "iconSizePx": 18,
  "backIconUrl": "",
  "searchIconUrl": "",
  "cameraIconUrl": "",
  "heartIconUrl": ""
}
```

Empty icon strings mean the default icon. They are present on this object.

### Fields

| On the screen | Field | Default | Range |
|---|---|---|---|
| Show this header | `enabled` | `true` | |
| Back | `backEnabled` | `true` | |
| Search | `searchEnabled` | `true` | |
| Heart | `heartEnabled` | `true` | |
| Search word | `placeholder` | `Search` | 40 characters. No Arabic field |
| Fill | `backgroundMode` | `color` | `color`, `gradient`, or `media` |
| Flat color | `backgroundColor` | `#d8f4f6` | Fill when mode is `color`, and the color behind a file until it loads |
| Start color | `gradientFrom` | `#8b5cf6` | Used when mode is `gradient` |
| End color | `gradientTo` | `#5b21b6` | Used when mode is `gradient` |
| Angle | `gradientAngle` | `180` | 0–360 |
| Spread | `gradientPosition` | `100` | 1–100 |
| Back and heart | `iconColor` | `#6d35e8` | Default icons |
| Search fill | `searchBackground` | `#d8f4f6` | Inside the field |
| Search outline, word, camera | `searchBorderColor` | `#6d35e8` | |
| Search word, stored | `searchTextColor` | `#6d35e8` | Present on the object. Draw the word with `searchBorderColor` |
| Search button | `searchButtonColor` | `#6d35e8` | |
| Row height | `heightPx` | `56` | 44–96 |
| Side space | `paddingX` | `12` | 0–32 |
| Search corners | `searchRadiusPx` | `14` | 0–40 |
| Icon size | `iconSizePx` | `18` | 14–32 |
| Back icon | `backIconUrl` | empty | PNG, JPG, WEBP, or GIF |
| Camera icon | `cameraIconUrl` | empty | PNG, JPG, WEBP, or GIF |
| Button icon | `searchIconUrl` | empty | PNG, JPG, WEBP, or GIF |
| Heart icon | `heartIconUrl` | empty | PNG, JPG, WEBP, or GIF |

Background uses the same three modes as the home header: flat `backgroundColor`, `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)`, or `backgroundMediaUrl` covering the row. A video is muted, looping, and has no controls.

### How to draw the row

Side padding is `paddingX`. The gap between back, search, and heart is **12** px. A custom icon is contained in a box of `iconSizePx`, not cropped. A GIF keeps playing. When back or heart is off, keep an empty gap the size of the icon so the search does not jump.

| Piece | Draw | Tap |
|---|---|---|
| Back | `backIconUrl` when it is not empty, otherwise a chevron in `iconColor` at `iconSizePx` | Previous screen |
| Search | Same idea as home: one field, button inside the border. Height `max(40, heightPx - 12)`. Radius `searchRadiusPx`. Border **1.5** px `searchBorderColor`. Fill `searchBackground`. Padding **14** px on the start and **4** px on the end. **8** px between the pieces. The word is one line, **14** px, medium, color `searchBorderColor`. The camera is `cameraIconUrl` or a camera in `searchBorderColor` at `iconSizePx`. The button is a square of `max(32, heightPx - 20)`, radius **10**, fill `searchButtonColor`. Its icon is `searchIconUrl` or a white magnifying glass at about `iconSizePx * 0.9` | The field opens search. The camera opens image search |
| Heart | `heartIconUrl` when it is not empty, otherwise a heart outline in `iconColor` | Saved items |

This bar does not follow banner slide colors. Slide colors apply only on the home header.

---

## 8. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Home header is `mobileFeatures.appNavbar`. The banner under it is `mobileFeatures.bannerSlider`. Other screens use `appNavbar.pageNavbar`.
- When `logoUrl` is present, draw the 56×56 header mark at the start of Deliver to. The phone’s main app icon is `mobileFeatures.appIcon.url`. Do not draw a language switch, a menu button, or a divider.
- Home bottom corners are square. The banner is full width, with the dots on the image.
- The search button sits inside the search border on both headers.
- A slide’s `topBackground` paints only the home header above that banner. `fontColor` paints the marquee, Deliver to, search word, camera, outline, button, and the active dot. The search fill stays `search.backgroundColor`.
- Crossfade the banner over 700 ms. Ease those header colors over 600 ms.
- A slide with no `topBackground` or no `fontColor` keeps the navbar colors. Website-showcase slides are in that group.
- The search camera opens image search.
