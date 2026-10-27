# Store1920 app Banner 1 and the home navbar

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/navbar`

Banner 1 is the full-width slider under the home search. Each slide owns the navbar above it. While that slide is showing, its top background fills the marquee, Deliver to, and search bands, and its font color paints the ink on those bands.

The home navbar and Banner 1 come from one response. The header on every other screen does not follow Banner 1. That bar is `appNavbar.pageNavbar`, specified in [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md).

This is not the website header and not the website home slider. Do not read `GET /api/store/navbar-menu`, `GET /api/store/settings`, or `GET /api/public/shop-showcase`. Do not call `/api/store/mobile-features`. That route needs a store login.

Banner 2, Banner 3, and Banner 4 are separate objects. They do not paint the navbar. See [ANDROID_APP_BANNERS_2_3_4.md](./ANDROID_APP_BANNERS_2_3_4.md).

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

| On the home screen | Object |
|---|---|
| Navbar above the banner | `mobileFeatures.appNavbar` |
| Banner 1 | `mobileFeatures.bannerSlider` |

`appNavbar.enabled` false hides the home navbar. `bannerSlider.enabled` false hides Banner 1. The two flags are independent. A hidden banner does not hide the navbar, and a hidden navbar does not hide the banner.

A URL that starts with `/` is on this site. `http://` and `https://` are full URLs. Ignore `javascript:` and `data:`.

English is left to right. Arabic mirrors every row. Marquee text uses `textAr` when the app language is Arabic and that field is not empty. Home search uses `placeholderAr` the same way.

The pixel rules for the marquee, Deliver to, search, header mark, and the other-pages bar are in [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md). The phone’s main app icon is `mobileFeatures.appIcon.url` in [ANDROID_APP_ICON.md](./ANDROID_APP_ICON.md). This file is how Banner 1 and that navbar stay one piece.

---

## 2. How they sit

Pinned under the status bar. Square bottom. No colored strip between the navbar and the banner.

```
┌─────────────────────────────────────┐
│  Cash On Delivery    tamara    …    │  marquee          ┐
│  [icon] 📍 Deliver to               │  address         │ navbar
│  Address line…                      │                  │ fill comes from
│  ┌ Search              📷  [🔍] ┐   │  one search field│ the slide
│  └──────────────────────────────┘   │                  ┘
│████████████ Banner 1, edge to edge █│  bannerSlider
│              · ● ·                  │  dots on the image
└─────────────────────────────────────┘
```

Draw, top to bottom:

1. Marquee, when `appNavbar.marquee.enabled` is true and `marquee.items` is not empty. When it is off, leave **12** px.
2. Deliver to, always. When `appNavbar.logoUrl` is present, the 56×56 icon sits at the start of this row.
3. Search, when `appNavbar.search.enabled` is true. When it is off, leave **12** px.
4. Banner 1, when `bannerSlider.enabled` is true.

The slide’s top background covers bands 1–3 only. It stops at the top of the banner. It does not cover the banner image. It does not replace the search field fill. The search fill stays `appNavbar.search.backgroundColor`.

`appNavbar.heightPx` adds every band, including a band that is hidden. Do not use it as the drawn height.

---

## 3. `bannerSlider`

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
| `source` | | | See below |
| `slides` | | max 8 | Only enabled slides that have an image or a video |

The banner has no side inset and no corner radius. The image or video covers the box (`object-fit: cover`).

| Slide field | Use |
|---|---|
| `image` | Banner file when `mediaType` is `image`. JPEG, PNG, WebP, or GIF. A GIF plays |
| `video` | Banner file when `mediaType` is `video`. Muted, looping, no controls. Show `image` until the video plays |
| `mediaType` | `image` or `video`. `video` only when `video` is not empty |
| `path` | Tap target for the whole banner. Same value as `link`. Empty becomes `/shop`. A value without a scheme is forced to start with `/` |
| `topBackground` | Navbar fill while this slide is showing. See section 4 |
| `fontColor` | Navbar ink while this slide is showing. Omitted when the seller left it empty |

Title, subtitle, and the slide button are on the object because the banner shape is shared with Banner 2, Banner 3, and Banner 4. Banner 1 is a full-bleed image or video. Do not draw the title, subtitle, or button on top of it. Ignore `hoverAnimation`. The phone has no hover.

### `source`

| `source` | Slides | Navbar while they show |
|---|---|---|
| `mobile-features` | Seller slides from the navbar page. Each slide can include `topBackground` and `fontColor` | Use that slide’s top background and font color |
| `website-shop-showcase` | Copied from the website home slider. Fields are `image`, `link`, `path`, and `title` only | No `topBackground` and no `fontColor`. Keep `appNavbar.background` and the navbar text colors for every slide. `slideIntervalSeconds` may be **3**. `heightPx` may be **168** and can be 100–400 |
| `website-shop-showcase-mirror` | Same slide shape as `mobile-features`, including `topBackground` when the seller saved one | Same rules as `mobile-features` |

---

## 4. Top background paints the navbar

Each slide can own the navbar above it. Three slides means three navbar fills and three font colors. Change them with the slide. Do not keep the first slide’s fill after the banner moves on.

`topBackground` is omitted on `website-shop-showcase` slides. When it is omitted, or when `mode` is `color` and `color` is missing, keep `appNavbar.background` for that slide.

| `topBackground.mode` | Draw behind the marquee, Deliver to, and search |
|---|---|
| `color` | `topBackground.color`. If `color` is missing, keep `appNavbar.background` |
| `gradient` | `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)` |
| `media` | `topBackground.mediaUrl` covers that navbar area (`object-fit: cover`). `mediaKind` is `image` (JPEG, PNG, WebP, GIF) or `video` (muted, looping, no controls). `mediaUrl` is omitted when no file is saved. Until it loads, show `topBackground.color` if present, otherwise `appNavbar.background` |

`gradientFrom` default `#8b5cf6`. `gradientTo` default `#5b21b6`. `gradientAngle` is 0–360, default `180` (top to bottom). `gradientPosition` is 1–100, default `100`, the percent where the end color is reached.

This fill does not cover Banner 1. It does not change `search.backgroundColor`.

### `appNavbar.background` — the fallback

Use this when the current slide has no top background of its own.

| `background.mode` | Draw |
|---|---|
| `color` | `background.color`. Default `#d8f4f6` |
| `gradient` | `linear-gradient({gradientAngle}deg, gradientFrom 0%, gradientTo gradientPosition%)` |
| `media` | `background.mediaUrl` covers the navbar. `mediaKind` is `image` or `video`. Keep `background.color` visible until the file loads |

`mediaUrl` and `mediaKind` are omitted when no file is saved. Gradient defaults match the slide: `gradientFrom` `#8b5cf6`, `gradientTo` `#5b21b6`, `gradientAngle` `180`, `gradientPosition` `100`.

---

## 5. Font color paints the navbar ink

When the slide has `fontColor`, use it for:

- every marquee line
- the Deliver to pin and both address lines
- the search word
- the camera, when no custom camera image is set
- the search outline
- the search button fill
- the active banner dot

The white magnifying glass stays white. Custom uploaded icons keep their own pixels. The search field fill stays `search.backgroundColor`.

When `fontColor` is absent, use the navbar’s own colors: `marquee` colors, `logoRow.locationColor`, `search.textColor`, `search.borderColor`, and `search.buttonColor`.

---

## 6. Navbar fields this screen still reads

The slide replaces the navbar fill and the ink listed above. It does not replace the layout. Read these from `appNavbar`. Full tables, samples, and the other-pages bar are in [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md).

| Piece | Fields | Notes |
|---|---|---|
| Show the home navbar | `enabled` | Default `true`. `false` hides the home navbar only |
| Corners | `radius` | Bottom corners are always 0. Top corners are 0–80 |
| Header mark | `logoUrl` | Omitted when empty. 56×56, radius 16, at the start of Deliver to. A GIF plays. A tap does nothing. The phone’s main app icon is `mobileFeatures.appIcon.url` |
| Marquee | `marquee` | Skip when `enabled` is false or `items` is empty. At most 12 lines |
| Deliver to | `logoRow` | Always drawn. Pin and address use `locationColor` unless the slide has `fontColor`. `languageColor` is unused |
| Search | `search` | One field. The button sits inside the border. `backgroundColor` is the field fill and does not follow the slide |

Do not draw a language switch, a menu button, or a divider. `search.menuButtonColor`, `search.dividerColor`, and `search.menuIconUrl` are unused on this layout.

`pageNavbar` is nested on `appNavbar` for every screen except home. Banner 1 does not change it. Slide colors apply only on the home navbar.

---

## 7. Dots and motion

Dots, only when there are two or more slides: centered, **8** px above the bottom of the image. Inactive dot **6 × 6**, white, opacity **0.7**. Active dot **14 × 6**, color `fontColor` when the slide has one, otherwise `logoRow.locationColor`. Gap between dots **6** px.

Change slides on `slideIntervalSeconds`. Do not cut.

- Crossfade the banner image or video over **700** ms.
- Ease the navbar background, the ink listed in section 5, and the active dot over **600** ms.
- Stack the slides and fade opacity. A gradient or a video background fades the same way.

---

## 8. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Banner 1 is `mobileFeatures.bannerSlider`. The navbar it paints is `mobileFeatures.appNavbar`.
- The slide’s `topBackground` fills the marquee, Deliver to, and search. It stops at the top of the banner.
- The slide’s `fontColor` paints the marquee, Deliver to, search word, camera, outline, button, and the active dot.
- The search fill stays `search.backgroundColor`.
- A slide with no `topBackground` or no `fontColor` keeps the navbar colors. `source: "website-shop-showcase"` slides are in that group.
- Banner 1 is full width, square corners, image or video only. Do not draw its title, subtitle, or button.
- Crossfade the banner over 700 ms. Ease the navbar fill and ink over 600 ms.
- Other screens use `appNavbar.pageNavbar`. They do not follow Banner 1.
- Draw the marquee, Deliver to, search, and header mark from [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md). The phone’s main app icon is [ANDROID_APP_ICON.md](./ANDROID_APP_ICON.md).
