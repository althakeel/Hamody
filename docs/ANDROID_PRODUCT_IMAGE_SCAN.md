# Store1920 product image scan

Last updated: 21 October 2026  
Audience: Android app  
Website: camera button in the navbar, then the search-results screen  
Sheet copy and layout: [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md)  
Gemini and ChatGPT stay on the server: [APP_SCANNER_AI.md](./APP_SCANNER_AI.md)  
Product card: [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md)

The shopper photographs a product. The server compares that photo with catalog photos and returns products. The app does not scan the catalog itself.

The camera screen header matches this bar. Fill **#261a4c**. The status bar uses the same fill. The header sits under it, full width, with the bottom corners rounded **24**. The top corners stay square so the status bar and the header read as one block.

| Piece | Place | Draw |
|---|---|---|
| Back | Start, vertically centered | White chevron, **24**. Tap closes the camera |
| Title | Center | **Store 1920 VISION**. White, bold, **18**, one line |
| Flash | End, vertically centered | White lightning bolt, **22**. Tap turns the camera flash on or off |

Side padding **16**. The title does not shift when the flash state changes. Arabic keeps the title in the center and mirrors the back chevron to the start edge. The flash stays on the end edge.

No login. Send `Accept-Language: en` or `ar`. Do not send `Authorization`.

```http
POST https://www.store1920.com/api/search-by-image
Content-Type: multipart/form-data
```

One field, named `image`. JPEG, PNG, or WebP. A camera HEIC file is accepted. Before send, shrink the longest side to **960 px**, JPEG quality about **0.72**, under **700 KB**. Name a camera shot `photo.jpg`. Timeout at least **60 seconds**.

Do not call `GET /api/search-by-image`. Do not call `POST /api/store/image-search/index`. That second call is seller training.

---

## 1. What the photo is compared with

Each published product can be trained on its first **3** `https` photos. Videos are skipped. A product with no photo cannot match.

The server keeps a fingerprint of those photos. The shopper’s photo is compared with that set. A close photo becomes a product in `products`. A weaker lookalike becomes a related product.

Only published products are returned. Out-of-stock products can still appear. Draw them at the end of each list.

The response does not include the match score. Use the two lists as sent.

---

## 2. Response

`200`:

```json
{
  "keyword": "jump starter",
  "keywords": ["jump starter", "air compressor"],
  "products": [],
  "relatedProducts": [],
  "recommendedProducts": [],
  "resultCount": 1,
  "searchMethod": "visual",
  "message": "Found 1 product"
}
```

| Field | Use |
|---|---|
| `products` | Closest products. Draw these first. Up to 8. `resultCount` is this length |
| `relatedProducts` | Related products. Up to 12. `recommendedProducts` is the same list |
| `keyword` | What the photo was read as. Show it under the best match when it is not empty |
| `searchMethod` | Do not show this |

Skip a related row whose `_id` is already in `products`.

| Status | Body | App |
|---|---|---|
| 200 | The object above | Results screen |
| 400 | `{ "error": "No image uploaded" }` or `{ "error": "Image is empty" }` | Ask for a clearer product photo |
| 500 | `{ "error": "Image search failed" }` | Same failure line |

---

## 3. Product object

Each row in `products` and `relatedProducts` is the same shape.

| Field | Use |
|---|---|
| `_id` | Product id |
| `slug` | Open `/product/{slug}` |
| `name`, `nameAr` | Title. Arabic title when the language is Arabic and `nameAr` is not empty |
| `brand` | Brand label |
| `sku` | SKU. Do not make this the card title |
| `image` | Card photo. If empty, use the first of `images` |
| `images` | Extra photos |
| `price` | Sale price. Do not print the letters AED |
| `mrp` | Regular price, struck through when it is higher than `price` |
| `inStock` | `false` means out of stock. Keep the card, show it unavailable, and sort it last |
| `imageBadgeIds` | Badges already used on other product cards |

This response does not include `fastDelivery`. Do not invent a delivery badge from it.

Draw the card from [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md).

---

## 4. Results screen

Keep the photo the shopper sent. The server does not send it back.

1. Preview. The shopper’s photo, and the first product image when `products` is not empty. **View product** opens `/product/{slug}` of `products[0]`.
2. `products` in a **2** column grid, **12 px** gap. Badge the first card **Best match** when the sort is the server order.
3. When `products` is empty and `relatedProducts` is not, show “No exact match. Showing related products.” then the related grid.
4. When `relatedProducts` is not empty, heading **Recommended products**, then that grid.
5. When both lists are empty, “No matching products for this photo.” No grid.

Sort chips: Best match (server order), Price: low to high, Price: high to low. Out-of-stock cards stay at the end after each sort.

English and Arabic copy, the disclaimer, and the Terms and Privacy links are in [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md).
