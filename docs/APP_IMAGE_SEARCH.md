# HAMODY image search — app API

Last updated: 19 October 2026  
Audience: Android and Flutter  
Website: camera button in the phone navbar, then `/search-results?source=image`  
API root: `https://www.hamody.com/api`  
Product card: [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md)

Send this file to the app developer. Camera and upload use the same call. The server returns the closest products and a related list.

No login. Send `Accept-Language: en` or `ar`.

---

## 1. Sheet

The website opens this from the camera icon in the navbar.

| Piece | English | Arabic |
|---|---|---|
| Title | Search by image | البحث بالصورة |
| Hint | Find matching products by uploading a photo. | اعثر على المنتجات المشابهة برفع صورة. |
| Upload button | Upload a photo | رفع صورة |
| Camera button | Take a photo | التقاط صورة |
| While waiting | Searching similar products… | جارٍ البحث عن منتجات مشابهة… |
| Failure | Could not search this image. Try a clearer product photo. | تعذر البحث بهذه الصورة. جرّب صورة أوضح للمنتج. |

Upload opens the gallery. Take a photo opens the rear camera. Both send the file to section 2. Paste is desktop only. Do not add it on the phone.

Upload button: filled `#e62e04`, white text, pill. Camera button: white, border `#e2e8f0`, text `#334155`, pill. Show a spinner in the sheet until the call returns. The call can take up to **60 seconds**. Set the client timeout to at least 60 seconds.

---

## 2. Search

```http
POST /api/search-by-image
Content-Type: multipart/form-data
```

One file field. The field name is `image`.

| Rule | Value |
|---|---|
| Auth | None |
| Camera and upload | Same request. Only the file source changes |
| Types | JPEG, PNG, or WebP. HEIC from the camera is accepted; the server converts it |
| Size before send | Longest side **960 px**, JPEG quality about **0.72**, under **700 KB** |
| File name | Keep the gallery file name. Name a camera shot `photo.jpg` |
| Body | `image` = the file bytes. Do not send JSON or a base64 string |

```
POST https://www.hamody.com/api/search-by-image
```

| Status | Body | App |
|---|---|---|
| 200 | products and related products | Results screen in section 3 |
| 400 | `{ "error": "No image uploaded" }` or `{ "error": "Image is empty" }` | Failure line in section 1 |
| 500 | `{ "error": "Image search failed" }` | Failure line in section 1 |

There is no GET on this path.

### Success `200`

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
| `products` | Closest matches. Draw these first. Up to 8 |
| `relatedProducts` | Related products. `recommendedProducts` is the same list. Up to 12 |
| `resultCount` | Length of `products` |
| `keyword` | What the photo was read as. Show it under the best match when it is not empty |
| `message` | Server sentence. Prefer the copy in section 3 |
| `searchMethod` | `visual`, a provider name, `related`, or `none`. Do not show this to the shopper |

Skip a related row whose `_id` is already in `products`.

Each product is a search card:

| Field | Use |
|---|---|
| `_id` | Product id |
| `slug` | Open `/product/{slug}` |
| `name`, `nameAr` | Card title |
| `brand` | Brand label |
| `image` | Card photo. If empty, use the first of `images` |
| `images` | Extra photos |
| `price`, `mrp`, `AED` | Card price. Do not print the letters AED |
| `inStock` | Stock state |
| `sku` | SKU |

Draw the card from [FLUTTER_PRODUCT_CARDS.md](./FLUTTER_PRODUCT_CARDS.md). This response does not include `fastDelivery` or karat rows.

---

## 3. Results

After `200`, close the sheet and open the results screen. Keep the photo the shopper sent so the left preview can show it. The website does not send that photo back.

| Piece | English | Arabic |
|---|---|---|
| Screen title | Search results | نتائج البحث |
| Preview label | Choose your item | اختر منتجك |
| Shopper’s photo | Your photo | صورتك |
| First product | Best match | أفضل تطابق |
| Button on the best match | View product | عرض المنتج |
| Related heading | Recommended products | منتجات موصى بها |
| No closest match | No exact match. Showing related products. | لا يوجد تطابق دقيق. عرض منتجات ذات صلة. |
| Both lists empty | No matching products for this photo. | لا توجد منتجات مطابقة لهذه الصورة. |

Order:

1. Preview. Two thumbs when both exist: the shopper’s photo, and the first product image. The selected thumb has a `#e62e04` ring. The large image under the thumbs follows the selected thumb. **View product** opens `/product/{slug}` of `products[0]`.
2. `products`, as the normal product grid. On the default sort, badge the first card **Best match**.
3. When `products` is empty and `relatedProducts` is not, show the no-exact line, then the related grid.
4. When `relatedProducts` is not empty, heading **Recommended products**, then that grid.
5. When both lists are empty, the empty line. No grid.

Sort chips, same as shop: Best match (the order the server sent), Price: low to high, Price: high to low. Out-of-stock cards stay at the end of each list.

Phone grid: **2 columns**, **12 px** gap. Page background `#f5f5f5`.

Under the preview, show this disclaimer. Terms link `https://www.hamody.com/terms-and-conditions`. Privacy link `https://www.hamody.com/privacy-policy`.

English:

> By continuing to use image search services and/or submitting images on HAMODY, you agree to the HAMODY Terms of Use, and you agree to let HAMODY process images related to your use of image search services, your submitted images, and other related information, in order to improve your shopping experience. Rest assured we will handle your personal information in accordance with the HAMODY Privacy Policy to keep it safe.

Arabic:

> بمتابعتك استخدام خدمات البحث بالصورة و/أو رفع الصور على HAMODY، فإنك توافق على شروط استخدام HAMODY، وتوافق على أن تعالج HAMODY الصور المتعلقة باستخدامك لخدمات البحث بالصورة، والصور التي ترفعها، والمعلومات المرتبطة بها، لتحسين تجربة التسوق. ونطمئنك بأن معلوماتك الشخصية تُعالَج وفق سياسة خصوصية HAMODY للحفاظ على سلامتها.

---

## 4. What not to call

| Call | Why |
|---|---|
| `GET /api/search-by-image` | This route is POST only |
| `GET /api/search-products` for a photo | That call is typed keywords, not a camera image |
| `POST /api/store/image-search/index` | Seller training. Not the shopper app |
