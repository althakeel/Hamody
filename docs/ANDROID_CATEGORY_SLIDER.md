# HAMODY category slider — Android API

Last updated: 13 October 2026  
Audience: Android app  
Website: home page category rows (`/store/category-slider` is the seller screen, not a public URL)  
API root: `https://www.hamody.com/api`  
Web source: `app/api/public/featured-sections/route.js`

One public call. No login. Do not send `Authorization`.

```http
GET https://www.hamody.com/api/public/featured-sections
Accept-Language: en
```

Send `Accept-Language: en` or `ar`. Arabic changes which title, subtitle, and app image you draw. Product names in `products` stay as stored. Use `nameAr` when the language is Arabic and that field is not empty.

Each object in `sections` is one slider. It includes the app image, the ratio, View all, and that slider’s page path. `products` is the only extra list.

Draw the sections in the order the array returns. That order is `sortOrder`, then oldest `createdAt`. Skip a section whose `products` list is empty.

The home page layout around this block is [ANDROID_HOME_PAGE.md](./ANDROID_HOME_PAGE.md). Product cards are [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

---

## 1. Response

```json
{
  "sections": [
    {
      "_id": "…",
      "title": "Kitchen",
      "titleAr": "",
      "subtitle": "",
      "subtitleAr": "",
      "mobileImage": "https://…/en-app.jpg",
      "mobileImageAr": "https://…/ar-app.jpg",
      "mobileImageRatio": "2:4",
      "mobileImageWidth": 2,
      "mobileImageHeight": 4,
      "backgroundColor": "#f3f0ff",
      "autoSlide": false,
      "autoSlideIntervalMs": 4000,
      "sortOrder": 0,
      "slug": "deals-under-99-aed",
      "pagePath": "/slider/deals-under-99-aed",
      "viewAllEnabled": true,
      "viewAllTarget": "default",
      "viewAllValue": "",
      "viewAllHref": "/slider/deals-under-99-aed",
      "products": []
    }
  ]
}
```

| Field | Use |
|---|---|
| `title` | English title |
| `titleAr` | Arabic title. Use it when the app language is Arabic and this is not empty |
| `subtitle`, `subtitleAr` | Same rule as the title. Hide the subtitle line when the chosen string is empty |
| `mobileImage` | App photo for English |
| `mobileImageAr` | App photo for Arabic. If empty, use `mobileImage` |
| `mobileImageRatio` | Frame for the app photo. One of `3:4`, `2:4`, `4:5`, `1:1`, `9:16`. Missing or unknown means `3:4` |
| `mobileImageWidth` | First number in the ratio. `2:4` sends `2` |
| `mobileImageHeight` | Second number in the ratio. `2:4` sends `4` |
| `backgroundColor` | Panel color behind the title and product row. Hex, such as `#f3f0ff` |
| `autoSlide` | Scroll the product row when this is true and there is more than one product |
| `autoSlideIntervalMs` | Time between scrolls, in milliseconds. Usual value is `4000` |
| `slug` | Page name for this slider, such as `deals-under-99-aed` |
| `pagePath` | This slider’s own page, `/slider/{slug}`. Title, subtitle, and `products` in a grid |
| `viewAllEnabled` | Show View all when this is true and `viewAllHref` is not empty |
| `viewAllTarget` | `default`, `category`, `landing`, `page`, or `custom`. The seller can change this |
| `viewAllValue` | The chosen category, landing page, existing page, or custom path. Empty when `viewAllTarget` is `default` |
| `viewAllHref` | The path View all opens. For `default` this matches `pagePath`. The seller can change the path |
| `products` | Cards for this row, already in seller order. In stock and published only |
| `sideImage`, `sideImageAr`, `sideImagePosition` | Website desktop only. Do not draw these on a phone |
| `cardsPerRow` | Website desktop only. On a phone show about **2.5** cards |

---

## 2. App image

This photo is only for the app. The website does not show it.

| Language | Image |
|---|---|
| English | `mobileImage`, then `mobileImageAr` |
| Arabic | `mobileImageAr`, then `mobileImage` |

Hide the image when both URLs are empty. The product row still shows.

Size the image box with the ratio, not a fixed 3:4.

```
width / height = mobileImageWidth / mobileImageHeight
```

| `mobileImageRatio` | Width | Height | Shape |
|---|---|---|---|
| `3:4` | 3 | 4 | Portrait. This is the default |
| `2:4` | 2 | 4 | Narrow portrait |
| `4:5` | 4 | 5 | Portrait |
| `1:1` | 1 | 1 | Square |
| `9:16` | 9 | 16 | Tall portrait |

Example: `mobileImageRatio` is `2:4`, so `mobileImageWidth` is `2` and `mobileImageHeight` is `4`. A box that is 80 px wide is 160 px tall.

Crop the photo to fill that box. Do not letterbox it. Do not use `sideImage` when `mobileImage` is empty.

---

## 3. Products in the row

Use `products` on the section. Do not call `POST /api/products/batch` for this row. The ids are already resolved.

Each product includes `name`, `nameAr`, `slug`, `price`, `AED`, `images`, `inStock`, `fastDelivery`, and `freeShippingEligible`. Open the product at `/product/{slug}`. Card layout is in the product-card doc.

| Piece | Phone |
|---|---|
| Space between sections | **16 px** |
| Panel | Radius **16 px**, padding **12 px**, background `backgroundColor` |
| Title | **20 px**, bold, `#111827` |
| Subtitle | **12 px**, `#6b7280`, only when it is not empty |
| Cards | Horizontal row, about **2.5** cards visible, **12 px** gap |
| Autoplay | Only when `autoSlide` is true and `products` has more than one item. Wait `autoSlideIntervalMs` |
| Arrows | Show them when autoplay is off |

---

## 4. View all

Show View all on the row only when `viewAllEnabled` is true and `viewAllHref` is not empty.

| `viewAllTarget` | `viewAllHref` |
|---|---|
| `default` | `pagePath`, such as `/slider/deals-under-99-aed`. The seller can change that path. The page shows the same title, subtitle, and `products` in a grid. On the app, open your own grid with this section’s title, subtitle, and `products` |
| `category` | `/category/…` |
| `landing` | `/c/…` |
| `page` | An existing site path, such as `/shop` |
| `custom` | A path starting with `/`, or an `https://` URL |

Open a path inside the app when you already have that screen. Open a full `https://` URL in the browser.

---

## 5. What not to call

| Path | Why |
|---|---|
| `GET /api/store/category-slider` | Seller dashboard. Needs a Firebase token |
| `POST` or `PUT /api/store/category-slider` | Seller save |
| `GET /api/public/category-sliders` | Older list. It has ids and the app image fields, but it does not include `products` |

Use `GET /api/public/featured-sections` for the home rows.
