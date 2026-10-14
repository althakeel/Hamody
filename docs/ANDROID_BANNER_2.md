# Store1920 Banner 2 — Android API

Last updated: 12 October 2026  
Audience: Android app  
Website: `https://www.store1920.com`  
Seller editor: `https://www.store1920.com/store/preferences?tab=banner2`  
API root: `https://www.store1920.com/api`  
Web source: `components/BannerSlider2.jsx`, `components/BannerSlider.jsx`

Banner 2 is the second home slider. It is not the large hero and not the first “Banner section” slider. The customer app reads it from the public shop showcase. No login.

```http
GET https://www.store1920.com/api/public/shop-showcase
```

Read `config.secondaryBannerSlider*`. Ignore the rest of `config` for this block.

The seller save is `PUT /api/store/preferences/shop-showcase`. The customer app must not call it.

---

## 1. When to draw it

Draw Banner 2 only when all of these are true:

1. `config.secondaryBannerSliderEnabled` is not `false`.
2. At least one item in `config.secondaryBannerSliderItems` has an image.

If either check fails, leave the block out. Do not show an empty gray box.

Slides with no image are dropped. Maximum **6** slides.

---

## 2. Where it sits on the home screen

`config.secondaryBannerSliderPlacement` chooses the slot. Unknown values mean `above_top_deals`.

| Value | Place on the home scroll |
|---|---|
| `below_small_banners` | After the small showcase banners, before the category row |
| `above_top_deals` | After latest products, before Top deals. This is the API default |
| `below_top_deals` | After Top deals |

The preferences screen currently saves `below_top_deals`. Still honor whichever value the API returns.

Home order around this slider:

1. Hero
2. Small showcase banners
3. Banner 2, only when placement is `below_small_banners`
4. Category row
5. Latest products
6. Banner 2, only when placement is `above_top_deals`
7. Top deals
8. Banner 2, only when placement is `below_top_deals`

---

## 3. Phone design

The slider is full width. No side inset. Direction stays left to right even when the app is Arabic. Arabic changes which image file is used, not the swipe direction.

| Property | Value |
|---|---|
| Height | `secondaryBannerSliderMobileHeight`. Default **120**. Clamp **80–600** |
| Autoplay | `secondaryBannerSliderMobileInterval` milliseconds. Default **3000**. Minimum **1500** |
| Slide motion | 900 ms, easing `cubic-bezier(0.65, 0, 0.35, 1)` |
| Image | Fill the height, crop from the center (`object-cover`) |
| One slide | No dots. No autoplay |
| Two or more | Autoplay, loop, swipe. A drag under 36 px is a tap |
| Dots | Centered, 12 px above the bottom edge. Gap 8 px |
| Idle dot | 10 × 10 circle, white at 50% |
| Active dot | 28 × 10 pill, solid white |
| Loading | Same height, fill `#f1f5f9`, pulse. Hide it if the block will not be shown |

Pause autoplay while the finger is down. After a swipe, ignore the click for 180 ms so the slide does not open.

Recommended upload size for the phone image is **750 × 420**. The drawn height is still `secondaryBannerSliderMobileHeight`, not 420.

Desktop-only fields, do not use them on the phone:

| Field | Website default |
|---|---|
| `secondaryBannerSliderDesktopInterval` | 4000 ms |
| `secondaryBannerSliderDesktopHeight` | 220 px, clamp 80–600 |

---

## 4. Public response

```http
GET /api/public/shop-showcase
```

No auth. Cache about 60 seconds. On failure the server may still answer `200` with defaults.

```json
{
  "config": {
    "secondaryBannerSliderEnabled": true,
    "secondaryBannerSliderMobileInterval": 3000,
    "secondaryBannerSliderMobileHeight": 120,
    "secondaryBannerSliderDesktopInterval": 4000,
    "secondaryBannerSliderDesktopHeight": 220,
    "secondaryBannerSliderPlacement": "below_top_deals",
    "secondaryBannerSliderItems": [
      {
        "id": "banner-2-slide-1",
        "image": "https://…/en-desktop.jpg",
        "tabletImage": "https://…/en-tablet.jpg",
        "mobileImage": "https://…/en-phone.jpg",
        "imageAr": "",
        "tabletImageAr": "",
        "mobileImageAr": "https://…/ar-phone.jpg",
        "wideImage": "",
        "wideImageAr": "",
        "link": "/brand/nexso",
        "linkType": "custom",
        "targetBlank": false,
        "alt": "Banner 2 Slide 1"
      }
    ]
  }
}
```

`sectionProducts`, `products`, and `categories` on this response belong to other home blocks. Banner 2 does not use them.

### Slider fields

| Field | Type | Rule |
|---|---|---|
| `secondaryBannerSliderEnabled` | boolean | `false` hides the slider. Missing means shown |
| `secondaryBannerSliderMobileInterval` | number | Milliseconds. Minimum 1500. Default 3000 |
| `secondaryBannerSliderMobileHeight` | number | Pixels. 80–600. Default 120 |
| `secondaryBannerSliderPlacement` | string | `below_small_banners`, `above_top_deals`, or `below_top_deals` |
| `secondaryBannerSliderItems` | array | Max 6. Empty images are removed |

### One slide

| Field | Rule |
|---|---|
| `id` | Stable id. Use it as the list key |
| `mobileImage` | Phone image for English |
| `mobileImageAr` | Phone image for Arabic |
| `tabletImage`, `tabletImageAr` | Used on the phone only when the phone image is empty |
| `image`, `imageAr` | Desktop image. Last fallback on a phone |
| `wideImage`, `wideImageAr` | Not used by this slider |
| `alt` | Accessibility label. Default `Lower Banner {n}` |
| `link` | Path or `https://` URL. Empty means the slide does not navigate |
| `linkType` | `none`, `category`, `product`, or `custom` |
| `targetBlank` | Website opens a new tab. In the app, open `https://` links in the browser |

### Which image to show

English phone, first URL that is not empty:

`mobileImage`, then `mobileImageAr`, then `tabletImage`, then `tabletImageAr`, then `image`, then `imageAr`.

Arabic phone, first URL that is not empty:

`mobileImageAr`, then `mobileImage`, then `tabletImageAr`, then `tabletImage`, then `image`, then `imageAr`.

### Where a tap goes

| `linkType` | `link` | Open |
|---|---|---|
| `none` | empty | Nowhere |
| `category` | `/category/{slug}` | That category. A nested slug is allowed, for example `/category/brands/nexso` |
| `product` | `/product/{slug}` | That product |
| `custom` | `/brand/nexso`, `/shop`, `/offers`, or another site path | The matching in-app screen |
| `custom` | `https://…` | Browser |
| missing | `/shop` | Shop. The server fills this when `linkType` is not `none` and `link` is empty |

Ignore `javascript:` and `data:` links.

---

## 5. Seller save — not for the app

The preferences screen loads and saves with a seller token.

```http
GET /api/store/preferences/shop-showcase
Authorization: Bearer {sellerFirebaseIdToken}
```

```http
PUT /api/store/preferences/shop-showcase
Authorization: Bearer {sellerFirebaseIdToken}
```

The save body is the whole `shopShowcase` object, with these Banner 2 keys replaced:

| Key | Editor value |
|---|---|
| `secondaryBannerSliderEnabled` | Show section toggle |
| `secondaryBannerSliderDesktopInterval` | Desktop timer. Default 4000 |
| `secondaryBannerSliderMobileInterval` | Phone timer. Default 3000 |
| `secondaryBannerSliderDesktopHeight` | Desktop height. Default 220 |
| `secondaryBannerSliderMobileHeight` | Phone height. Default 120 |
| `secondaryBannerSliderPlacement` | Saved as `below_top_deals` |
| `secondaryBannerSliderItems` | The slides, max 6 |

Each saved slide:

```json
{
  "id": "banner-2-slide-1",
  "image": "",
  "tabletImage": "",
  "mobileImage": "",
  "imageAr": "",
  "tabletImageAr": "",
  "mobileImageAr": "",
  "wideImage": "",
  "wideImageAr": "",
  "link": "/shop",
  "linkType": "custom",
  "targetBlank": false,
  "alt": "Banner 2 Slide 1"
}
```

Image upload from that screen is a seller action. The public URL is already absolute when the app reads `GET /api/public/shop-showcase`.

---

## 6. Checklist

- One request: `GET /api/public/shop-showcase`.
- Read only `config.secondaryBannerSliderEnabled`, `MobileInterval`, `MobileHeight`, `Placement`, and `Items`.
- Hide the block when it is disabled or every slide has no image.
- Phone height default is 120 px, full width, image cropped to fill.
- Autoplay default is 3 seconds. Dots only when there is more than one slide.
- Arabic swaps the image file. The row still moves left to right.
- Do not call the seller preferences API from the customer app.
