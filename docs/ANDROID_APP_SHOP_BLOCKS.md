# HAMODY app shop blocks

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/shop-blocks`

One home block with two equal columns. The left column is the budget card: a title and up to four images in a 2 by 2 grid. The right column is a promo image. A second promo image makes that side slide.

This is the app home block. It is not the shop tab, and it is not Banner 2, Banner 3, or Banner 4.

---

## 1. API

```http
GET https://www.hamody.com/api/public/mobile-features
```

No login. Do not send `Authorization`. Do not call `/api/store/mobile-features`.

Optional query: `?storeId=` a store id. Without it, the response is the public store.

Read `mobileFeatures.shopBlocks`. The response is cached for about 3 minutes. Keep the last good payload on the device. If a refresh fails, keep that copy.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "shopBlocks": {
      "enabled": true
    }
  }
}
```

`enabled` false means draw nothing. In that case the object is only `{ "enabled": false }`.

Every budget image and every promo image has a `path`. That is the only tap target. There is no separate `link` field. See section 4.

---

## 2. Sample

```json
{
  "enabled": true,
  "gridTitle": "Shop by Budget",
  "gridTitleColor": "#5c3b16",
  "gridTitleFont": "inherit",
  "gridTitleWeight": "bold",
  "gridTitleAlign": "center",
  "gridBackground": "#f6c445",
  "tiles": [
    {
      "id": "tile-1",
      "image": "https://…/under-50.jpg",
      "path": "/shop?max=50"
    },
    {
      "id": "tile-2",
      "image": "https://…/under-100.jpg",
      "path": "/shop?max=100"
    },
    {
      "id": "tile-3",
      "image": "https://…/under-200.jpg",
      "path": "/shop?max=200"
    },
    {
      "id": "tile-4",
      "image": "https://…/under-500.jpg",
      "path": "/shop?max=500"
    }
  ],
  "slideIntervalSeconds": 4,
  "slides": [
    {
      "id": "slide-1",
      "image": "https://…/promo-a.jpg",
      "path": "/shop"
    },
    {
      "id": "slide-2",
      "image": "https://…/promo-b.jpg",
      "path": "/category/offers"
    }
  ]
}
```

A hidden block:

```json
{ "enabled": false }
```

---

## 3. Fields

| Field | Meaning |
|---|---|
| `enabled` | `false` hides the whole block |
| `gridTitle` | Title on the budget card. Max 40 characters. Default `Shop by Budget` |
| `gridTitleColor` | Title color, `#rrggbb`. Default `#5c3b16` |
| `gridTitleFont` | `inherit`, `poppins`, `montserrat`, `arial`, or `georgia`. Default `inherit` |
| `gridTitleWeight` | `bold` or `regular`. Default `bold` |
| `gridTitleAlign` | `left`, `center`, or `right`. Default `center` |
| `gridBackground` | Budget card fill, `#rrggbb`. Default `#f6c445` |
| `tiles` | Budget images that have a picture, in slot order. Max 4 |
| `slideIntervalSeconds` | Seconds between promo images. Integer from 2 to 30. Default 4 |
| `slides` | Promo images that have a picture, in order. Max 8 |

`id` is only a key for the list. It is not a product id or a category id.

A tile or slide with no image is left out. The ones that remain keep their saved order. A tile or slide with an image and no saved path is sent as `/shop`.

### Font

| `gridTitleFont` | Typeface |
|---|---|
| `inherit` | The app’s default |
| `poppins` | Poppins |
| `montserrat` | Montserrat |
| `arial` | Arial |
| `georgia` | Georgia |

`bold` is a heavy weight. `regular` is a medium weight.

---

## 4. Path

`path` is a string on each tile and each slide. Open it when that image is tapped. Do not call another API to find the destination.

| `path` | Open |
|---|---|
| Starts with `/` | A screen in the app |
| Starts with `http://` or `https://` | That full URL |
| Missing | The API already replaced it with `/shop` |

`javascript:` and `data:` are removed before the response is sent. A value with no scheme is forced to start with `/`. A query string stays on the path, so `/shop?max=50` is the shop screen with those parameters.

Paths the seller can save:

| Kind | Shape | Example |
|---|---|---|
| Home | `/` | `/` |
| Shop | `/shop` | `/shop` |
| Category | `/category/{slug}` | `/category/phone-accessories` |
| Nested category | `/category/{parent}/{child}` | `/category/electronics/earphones` |
| Brand | `/brand/{slug}` | `/brand/porodo` |
| Product | `/product/{slug}` | `/product/game-stick-lite-4k` |
| Landing page | `/c/{slug}` | `/c/summer-sale` |
| Cart | `/cart` | `/cart` |
| Offers | `/offers` | `/offers` |
| New arrivals | `/new-arrivals` | `/new-arrivals` |
| Best sellers | `/best-sellers` | `/best-sellers` |
| Categories list | `/categories` | `/categories` |
| Other site page | `/{page}` | `/about-us`, `/contact-us`, `/faq`, `/return-policy` |
| Custom | any `/…` or full URL | `/shop?max=50`, `https://example.com/sale` |

The slug is the public slug, not the database id. `id` on the tile or slide is not the path.

---

## 5. How to draw it

One row, two equal columns, about 8 px apart. Corner radius about 16 on both columns. The promo column is the same height as the budget card.

### Budget card

| Piece | Draw |
|---|---|
| Card | Fill `gridBackground`. Padding about 8 px |
| Title | `gridTitle`, using the color, font, weight, and align above. About 11 px |
| Grid | 2 columns and 2 rows under the title. Gap about 6 px |
| Image | Square, white behind it, corner radius about 12, image covers the box |
| Tap | Opens that tile’s `path` |

Place `tiles` in order: first top left, second top right, third bottom left, fourth bottom right. If a slot had no image it is already missing, so the next image moves forward.

### Promo image

| Piece | Draw |
|---|---|
| Image | Covers the column. Tap opens that slide’s `path` |
| Dots | Only when `slides` has more than one image. Centered on the bottom. Active dot white, the others white at about half opacity |
| Timer | Advance to the next image every `slideIntervalSeconds`. After the last image, return to the first |

One image means a still picture and no dots. An empty `slides` array leaves the promo column blank. The budget card still shows.

---

## 6. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Read `mobileFeatures.shopBlocks`.
- Hide the block when `enabled` is false.
- Draw the budget card and the promo side by side, equal width and equal height.
- Title, card color, font, weight, and align come from the fields above.
- Draw only `tiles` and `slides` that are in the response. Empty images are already removed.
- A tap on a budget image opens that tile’s `path`. A tap on the promo image opens the current slide’s `path`.
- Treat `/category/…`, `/brand/…`, `/product/…`, `/c/…`, and the other shapes in section 4 as in-app screens. A path that starts with `http://` or `https://` is a full URL.
- When there are two or more slides, auto-advance using `slideIntervalSeconds` and show the dots.
