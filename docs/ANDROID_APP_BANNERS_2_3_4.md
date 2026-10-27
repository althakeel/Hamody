# Store1920 app Banner 2, Banner 3, and Banner 4

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller pages:

| Name | Seller page | API object |
|---|---|---|
| Banner 2 | `/store/mobile-features/small-banners` | `mobileFeatures.smallBanners` |
| Banner 3 | `/store/mobile-features/promo-cards` | `mobileFeatures.promoCards` |
| Banner 4 | `/store/mobile-features/fourth-banners` | `mobileFeatures.fourthBanners` |

Banner 1 is the banner under the home search. It is `mobileFeatures.bannerSlider`. Each of its slides paints the home navbar with `topBackground`. That pair is specified in [ANDROID_APP_BANNER_1.md](./ANDROID_APP_BANNER_1.md). This file is only Banner 2, Banner 3, and Banner 4.

These are not the website home sliders. Do not read `GET /api/public/shop-showcase` for them. Do not call `/api/store/mobile-small-banners`, `/api/store/mobile-promo-cards`, or `/api/store/mobile-fourth-banners`. Those seller routes need a store login.

---

## 1. API

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`.

Optional query: `?storeId=` a store id. Without it, the response is the public store.

The response is cached for about 3 minutes. Keep the last good payload on the device. If a refresh fails, keep that copy. A server error still returns HTTP 200 with `success: true` and built-in defaults.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "smallBanners": {},
    "promoCards": {},
    "fourthBanners": {}
  }
}
```

A URL that starts with `/` is on this site. `http://` and `https://` are full URLs. Ignore `javascript:` and `data:`.

English is left to right. Arabic mirrors the row: left becomes the end edge, right becomes the start edge. Title and subtitle strings are not translated by this API. There is no `titleAr`.

---

## 2. Where they sit

On the app home, after Banner 1:

1. Banner 2
2. Banner 3
3. Banner 4

Leave a gap between them. Hide a banner when its `enabled` is false or its `slides` array is empty. The API already removes disabled slides and slides with no image and no video.

Each banner is its own slider. One slide stays still. Two or more slides advance on that banner’s `slideIntervalSeconds`.

---

## 3. How the three differ

| | Banner 2 | Banner 3 | Banner 4 |
|---|---|---|---|
| Object | `smallBanners` | `promoCards` | `fourthBanners` |
| Design frame | 376 × 110 | 376 × 110 | 376 × 110 |
| Default height | 110 | 110 | 110 |
| Height range | 40–200 | 80–300 | 40–200 |
| Max slides | 12 | 8 | 8 |
| Default speed | 4 seconds | 4 seconds | 4 seconds |
| Speed range | 2–30 | 2–30 | 2–30 |
| Ad badge | no | yes, when `showAdBadge` is true | no |

Draw each banner centered. Width is **376 / 392** of the screen (about 96%). Height follows the frame ratio **376 : 110** unless you use `heightPx` as a fixed height. Corner radius **8**. The image or video covers the box (`object-fit: cover`). No side bleed to the screen edge. This is different from Banner 1, which is full width and square.

`heightPx` is the seller’s height in px for a 376-wide frame. On a phone, scale it with the width: drawn height = `heightPx * (drawn width / 376)`.

---

## 4. Section object

The same shape for all three. Banner 3 slides also include `showAdBadge`.

```json
{
  "enabled": true,
  "slideIntervalSeconds": 4,
  "heightPx": 110,
  "slides": []
}
```

| Field | Meaning |
|---|---|
| `enabled` | `false` hides the whole banner |
| `slideIntervalSeconds` | Seconds each slide stays before the next. Used only when there are 2 or more slides |
| `heightPx` | Banner height at a frame width of 376 |
| `slides` | Visible slides, in seller order |

---

## 5. One slide

```json
{
  "image": "https://…/banner.jpg",
  "link": "/shop",
  "path": "/shop",
  "title": "Summer sale",
  "video": "",
  "mediaType": "image",
  "subtitle": "Up to 40% off",
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
  "buttonPath": "",
  "buttonAlign": "left",
  "buttonColor": "#f97316",
  "buttonTextColor": "#ffffff",
  "buttonRadiusPx": 8,
  "hoverAnimation": "none"
}
```

Banner 3 adds `"showAdBadge": false`.

| Field | Default | Limit | Draw |
|---|---|---|---|
| `image` | | | Photo, PNG, WebP, or GIF. Also the poster behind a video |
| `video` | empty | | Used when `mediaType` is `video` |
| `mediaType` | `image` | `image` or `video` | |
| `path` | `/shop` | | Tap target for the whole slide. Same value as `link` |
| `title` | empty | 120 characters | Bold. Hide when empty |
| `subtitle` | empty | 180 characters | Hide when empty |
| `contentPosition` | `left` | `left`, `center`, `right` | Horizontal place of the text block |
| `contentVertical` | `center` | `top`, `center`, `bottom` | Vertical place of the text block |
| `textAlign` | `left` | `left`, `center`, `right` | Alignment of the letters inside the block |
| `titleColor` | `#ffffff` | | |
| `subtitleColor` | `#e2e8f0` | | |
| `titleSizePx` | `32` | 16–64 | Size on the 376-wide frame. Scale with the banner width |
| `subtitleSizePx` | `15` | 10–32 | Same scaling |
| `fontFamily` | `inherit` | see below | |
| `buttonEnabled` | `false` | | Draw the button only when this is true and `buttonText` is not empty |
| `buttonText` | `Shop now` | 32 characters | |
| `buttonPath` | empty | | Button tap. When empty, use `path` |
| `buttonAlign` | `left` | `left` or `right` | Button sits on that side of the banner, under the text |
| `buttonColor` | `#f97316` | | Button fill |
| `buttonTextColor` | `#ffffff` | | |
| `buttonRadiusPx` | `8` | 0–40 | |
| `hoverAnimation` | `none` | | Seller preview only. The phone has no hover. Ignore this field |
| `showAdBadge` | `false` | Banner 3 only | Draw a small **Ad** label at the top end |

### Font

| `fontFamily` | Typeface |
|---|---|
| `inherit` | The app’s normal font |
| `poppins` | Poppins |
| `montserrat` | Montserrat |
| `arial` | Arial |
| `georgia` | Georgia |

### Text block

Pad the overlay about **16** px from the banner edges. The text block is at most **78%** of the banner width.

| `contentVertical` | Text block |
|---|---|
| `top` | Against the top padding |
| `center` | Vertically centered |
| `bottom` | Against the bottom padding |

| `contentPosition` | Text block |
|---|---|
| `left` | Start side |
| `center` | Horizontally centered |
| `right` | End side |

Title is bold, tight line height. Subtitle sits about **6** px under the title. Give both a light dark shadow so they stay readable on a photo. When a title, subtitle, or button is showing, paint a left-to-right dark wash over the image: about 45% black at the start, fading to clear at the end.

On a 376-wide frame the title is `titleSizePx`. On a narrower phone, scale it: `titleSizePx * (drawn width / 376)`, then keep it between **16** and **22**. Scale the subtitle the same way and keep it between **10** and **13**.

The button is bold, padding about **12 × 6**, and sits about **10** px under the text. `buttonAlign: right` pins it to the end edge. `left` pins it to the start edge.

### Media

| `mediaType` | Draw |
|---|---|
| `image` | `image`, covering the box. A GIF keeps playing |
| `video` | `video`, muted, looping, no controls, covering the box. Show `image` as the poster until the video plays |

### Dots

Draw dots only when that banner has two or more slides. Centered, **8** px above the bottom of the banner, **6** px apart. Each dot is **6 × 6**. The active dot is white. The others are white at about **45%** opacity. One slide has no dots.

Advance on `slideIntervalSeconds`. Crossfade to the next slide over **700** ms. Do not cut.

### Tap

| Target | Opens |
|---|---|
| The banner image or video | `path` |
| The button | `buttonPath` when it is not empty, otherwise `path` |

### Ad badge

Banner 3 only, and only when `showAdBadge` is true. Top end corner, about **8** px inset. Small label, text **Ad**, white, on black at about **70%** opacity, slight corner radius. Banner 2 and Banner 4 never have this field.

---

## 6. Sample

Three banners in one `mobileFeatures` object. Empty slides are omitted by the API. This sample shows one slide each so the fields are visible.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "smallBanners": {
      "enabled": true,
      "slideIntervalSeconds": 4,
      "heightPx": 110,
      "slides": [
        {
          "image": "https://www.store1920.com/banner-2.jpg",
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
          "buttonPath": "",
          "buttonAlign": "left",
          "buttonColor": "#f97316",
          "buttonTextColor": "#ffffff",
          "buttonRadiusPx": 8,
          "hoverAnimation": "none"
        }
      ]
    },
    "promoCards": {
      "enabled": true,
      "slideIntervalSeconds": 4,
      "heightPx": 110,
      "slides": [
        {
          "image": "https://www.store1920.com/banner-3.jpg",
          "link": "/shop",
          "path": "/shop",
          "title": "Today only",
          "video": "",
          "mediaType": "image",
          "subtitle": "Free delivery",
          "contentPosition": "left",
          "contentVertical": "center",
          "textAlign": "left",
          "titleColor": "#ffffff",
          "subtitleColor": "#e2e8f0",
          "titleSizePx": 32,
          "subtitleSizePx": 15,
          "fontFamily": "inherit",
          "buttonEnabled": true,
          "buttonText": "Shop now",
          "buttonPath": "/shop",
          "buttonAlign": "left",
          "buttonColor": "#f97316",
          "buttonTextColor": "#ffffff",
          "buttonRadiusPx": 8,
          "hoverAnimation": "none",
          "showAdBadge": true
        }
      ]
    },
    "fourthBanners": {
      "enabled": true,
      "slideIntervalSeconds": 4,
      "heightPx": 110,
      "slides": [
        {
          "image": "https://www.store1920.com/banner-4.jpg",
          "link": "/category/beds",
          "path": "/category/beds",
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
          "buttonPath": "",
          "buttonAlign": "left",
          "buttonColor": "#f97316",
          "buttonTextColor": "#ffffff",
          "buttonRadiusPx": 8,
          "hoverAnimation": "none"
        }
      ]
    }
  }
}
```

A hidden banner looks like this. Draw nothing.

```json
{ "enabled": false, "slideIntervalSeconds": 4, "heightPx": 110, "slides": [] }
```

---

## 7. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Banner 2 is `smallBanners`. Banner 3 is `promoCards`. Banner 4 is `fourthBanners`.
- Draw them in that order under Banner 1. Hide one when it is disabled or has no slides.
- Size is the 376 × 110 frame, scaled to about 96% of the screen width, corners 8.
- One slide stays still. Two or more crossfade every `slideIntervalSeconds`.
- The image tap uses `path`. The button uses `buttonPath`, or `path` when that is empty.
- The **Ad** label exists only on Banner 3.
- Ignore `hoverAnimation`.
- Do not use the website showcase, and do not use the seller banner routes.
