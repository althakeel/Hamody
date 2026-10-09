# Store1920 home hero — mobile API

Last updated: 9 October 2026  
Audience: Flutter developers  
Website: `https://www.store1920.com`  
API root: `https://www.store1920.com/api`

This file is only the **top home banner** (the large photo with the title, Shop button, round arrows, and dots). The rest of the app is in [FLUTTER_ENTIRE_APP.md](./FLUTTER_ENTIRE_APP.md).

Match the **phone website**. One call loads this whole section.

```http
GET /api/public/shop-showcase
```

No login. Read `config`.

---

## 1. Which list is the hero

The seller can turn on more than one banner. Draw them in this order. Skip a block when its switch is off or it has no image.

| Order | What you see | Switch | Slides | Auto-slide |
|---|---|---|---|---|
| 1 | Full-bleed hero. This is the camping banner in the screenshot when it is on. The shorter hero below is hidden. | `fullWidthBannerEnabled` | `fullWidthBannerSliderItems` | `fullWidthBannerSliderInterval` milliseconds. Default **4000**. Range **2000–15000** |
| 2 | Shorter hero, only when the full-bleed hero is off | `mainBannerEnabled` | one image: `mainBannerImage` | **5000** ms |
| 3 | Top banner | `topBannerEnabled` and full-bleed is off | `topBannerSliderItems` | `topBannerSliderInterval` |
| 4 | Bottom banner | `bottomBannerEnabled` and full-bleed is off | `bottomBannerSliderItems` | `bottomBannerSliderInterval` |
| 5 | Second full-width strip under the first | `lowerFullWidthBannerEnabled` | `lowerFullWidthBannerSliderItems` | `lowerFullWidthBannerSliderInterval` |
| 6 | Mid-page slider | `bannerSliderEnabled` is not false | `bannerSliderItems` | `bannerSliderMobileInterval` on a phone |
| 7 | Extra slider. Seller picks where it sits | `secondaryBannerSliderEnabled` | `secondaryBannerSliderItems` | `secondaryBannerSliderMobileInterval` |

`secondaryBannerSliderPlacement` is `below_small_banners`, `above_top_deals` (default), or `below_top_deals`.

Each slider holds at most **8** images. A slide with no image is already removed by the API.

If `fullWidthBannerSliderEnabled` is false and there is more than one slide, show only the first slide and hide the arrows and dots.

---

## 2. One slide

```json
{
  "id": "full-width-large-banner-1",
  "image": "https://...",
  "wideImage": "",
  "tabletImage": "",
  "mobileImage": "https://...",
  "imageAr": "",
  "wideImageAr": "",
  "tabletImageAr": "",
  "mobileImageAr": "",
  "link": "/shop",
  "linkType": "page",
  "targetBlank": false,
  "alt": "Banner 1"
}
```

On a phone, pick the image in this order:

1. Arabic: `mobileImageAr`, then `mobileImage`, then `tabletImageAr`, then `tabletImage`, then `imageAr`, then `image`
2. English: `mobileImage`, then `tabletImage`, then `image`

Use the URL as returned. Do not rebuild the path. `object-cover`, centered. If the image fails, skip that slide.

`link` starting with `/` opens an in-app screen. `http` opens the in-app browser. Empty link becomes `/shop`. `linkType` `none` means the slide is not tappable.

The title **Your Outdoor Essentials on every trip**, the **SHOP NOW** pill, and the row of small photos along the bottom of that picture are **inside the uploaded image**. Do not draw a second title or a second thumbnail row on top of it.

---

## 3. Text on top of the image

Only the full-bleed hero and the shorter hero can add text in the app. Draw a line only when its switch is true **and** the text is not empty. If the words are already in the picture, those switches are false. Leave them off.

| Line | Full-bleed fields | Shorter hero fields |
|---|---|---|
| Title | `fullWidthBannerTitle`, `fullWidthBannerTitleEnabled` | `mainBannerTitle`, `mainBannerTitleEnabled` |
| Subtitle | `fullWidthBannerSubtitle`, `fullWidthBannerSubtitleEnabled` | `mainBannerSubtitle`, `mainBannerSubtitleEnabled` |
| Button | `fullWidthBannerCtaText`, `fullWidthBannerCtaEnabled`, `fullWidthBannerCtaBgColor`, `fullWidthBannerCtaTextColor` | `mainBannerCtaText`, `mainBannerCtaEnabled`, `mainBannerCtaBgColor`, `mainBannerCtaTextColor` |
| Tap when the image itself has no link | `fullWidthBannerLink` | `mainBannerLink` |

Same pattern for the top banner (`topBannerTitle`, `topBannerSubtitle`, `topBannerCtaText`) and the bottom banner (`bottomBannerTitle`, `bottomBannerSubtitle`, `bottomBannerCtaText`).

Title on the full-bleed hero: white, about **22px**, extra bold. Button: the seller’s background and text colors, about **13px**.

Arabic copies, when the API sends them, use the `Ar` suffix (`fullWidthBannerTitleAr`, and the same pattern on the other banners). If the Arabic field is empty, show the English field.

---

## 4. Arrows and dots

Show arrows and dots only when the slider is enabled and there are **2 or more** slides. One slide is a still image.

Arrows sit on the left and right, vertically centered, **12px** in from the edge. Defaults:

| Field | Default |
|---|---|
| `bannerArrowStyle` | `circle` (also `rounded`, `square`, `pill`, `outline`, `plain`) |
| `bannerArrowSize` | `md` → **36×36**, icon 18px. `sm` is 28×28. `lg` is 44×44 |
| `bannerArrowColor` | `#0f172a` |
| `bannerArrowBgColor` | `#ffffff` |
| `bannerArrowHover` | `grow`. Also `none`, `slide`, `lift`, `bounce` |

Dots sit **12px** above the bottom, centered. The active dot is a white pill **28×10**. The others are **10×10** circles at about 45% white. Tapping a dot jumps to that slide.

Auto-advance uses the interval above. Pause is not required on a phone. Swipe left and right moves the slide. The arrows do the same.

---

## 5. Height

| Banner | Phone height |
|---|---|
| Full-bleed hero | Height comes from the image. Do not crop it to a fixed box. Seller desktop height is `fullWidthBannerDesktopHeight` (about **350–500**, default **400**) and is for the website desktop art, which is uploaded at **2746 × 572** |
| Shorter hero | `mainBannerMobileHeight`, default **100**, allowed **80–700** |
| Top / bottom | Fill the banner box. Corners **12px** unless it is the full-bleed hero, which is square to the screen edge |
| Mid-page slider | `bannerSliderMobileHeight`, default **120** |

---

## 6. App-only copy of the same hero

If the home layout uses the app large hero instead of this website block, call:

```http
GET /api/public/mobile-features
```

Read `mobileFeatures.bannerSlider`.

When the seller turns on **Use website home banners**, `bannerSlider.source` is `website-shop-showcase`. Those slides are the same images as `fullWidthBannerSliderItems` / the website hero. Draw them with `heightPx` (default **168**) and `slideIntervalSeconds` (default **4**). You do not need a second request.

Hide that block when `enabled` is false or `slides` is empty.

---

## 7. Seller page

The seller edits this on **Banner section**: `/store/preferences` (carousel slider). The app only reads the public GET. A save on the website shows up on the next app refresh. Do not call `/api/store` write routes from the app.
