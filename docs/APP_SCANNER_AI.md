# HAMODY scanner — Gemini and ChatGPT through the backend

Last updated: 21 October 2026  
Audience: Android and iOS  
API root: `https://www.hamody.com/api`  
Camera bar: [ANDROID_PRODUCT_IMAGE_SCAN.md](./ANDROID_PRODUCT_IMAGE_SCAN.md)  
Results screen: [APP_IMAGE_SEARCH.md](./APP_IMAGE_SEARCH.md)

The phone searches. It does not check products.

The shopper takes a photo or picks one from the gallery. The app sends that file to Hamody. Gemini and ChatGPT already run on the server. The server reads the photo, then checks the catalog. The app draws whatever product list comes back.

Do not put a Gemini key or an OpenAI key in the Android or iOS app. Do not call `generativelanguage.googleapis.com` or `api.openai.com` from the phone. Those keys stay on the server.

---

## 1. What the phone does

1. Open the camera. The header is in [ANDROID_PRODUCT_IMAGE_SCAN.md](./ANDROID_PRODUCT_IMAGE_SCAN.md): fill `#261a4c`, title **Store 1920 VISION**, back chevron, flash bolt.
2. Take a photo, or open the gallery.
3. Shrink the image, then `POST` it.
4. Show the returned products. Do not rank them again. Do not drop a row because the app thinks it is the wrong product.

iOS uses the same request and the same header colors. Mirror the back chevron for Arabic. Keep the title centered.

---

## 2. The only call

```http
POST /api/search-by-image
Content-Type: multipart/form-data
```

No login. Do not send `Authorization`. Send `Accept-Language: en` or `ar`.

| Rule | Value |
|---|---|
| Field name | `image` |
| Types | JPEG, PNG, or WebP. A camera HEIC file is accepted |
| Size before send | Longest side **960 px**, JPEG quality about **0.72**, under **700 KB** |
| Camera file name | `photo.jpg` |
| Timeout | At least **60 seconds** |

```
POST https://www.hamody.com/api/search-by-image
```

There is no GET on this path.

| Status | Body | App |
|---|---|---|
| 200 | `products` and `relatedProducts` | Results screen |
| 400 | `{ "error": "No image uploaded" }` or `{ "error": "Image is empty" }` | Ask for a clearer product photo |
| 500 | `{ "error": "Image search failed" }` | Same failure line |

`200` shape:

```json
{
  "keyword": "electric plasma lighter",
  "keywords": ["electric plasma lighter"],
  "products": [],
  "relatedProducts": [],
  "recommendedProducts": [],
  "resultCount": 1,
  "searchMethod": "visual",
  "message": "Found 1 product"
}
```

| Field | App |
|---|---|
| `products` | Closest products. Draw these first. Up to 8 |
| `relatedProducts` | Related products. `recommendedProducts` is the same list. Up to 12 |
| `keyword` | What the photo was read as. Show it under the best match when it is not empty |
| `searchMethod` | Do not show this. It may be `visual`, a provider name, `related`, or `none` |

Skip a related row whose `_id` is already in `products`. Product card fields are in [ANDROID_PRODUCT_IMAGE_SCAN.md](./ANDROID_PRODUCT_IMAGE_SCAN.md).

---

## 3. AI on the server

Both models are already prepared. The app does not choose a model and does not send a prompt.

| Model | Where it runs | What it does |
|---|---|---|
| Gemini | Server | Names the object in the photo, and compares the photo with trained catalog photos |
| ChatGPT | Server | Names the same object from the same photo |

They run together. The server keeps the words both agree on, then checks published products. A close photo becomes `products`. A weaker lookalike becomes `relatedProducts`.

If one model is unavailable, the other still names the photo. If both are unavailable, the server can still match a trained catalog photo. The app treats every `200` the same way.

The shopper photo is not stored as a catalog image. The server does not send the photo back. Keep it on the device only so the results screen can show “Your photo”.

---

## 4. Do not build this on the phone

| Do not | Why |
|---|---|
| Call Gemini or ChatGPT from the app | The keys and the prompt are on the server |
| Match the photo to products in the app | The phone is searching. The server checks the catalog |
| Call `POST /api/store/image-search/index` | That is seller training, not the shopper scanner |
| Call `GET /api/search-products` with the photo | That route is typed words, not an image |
| Hide a product the app “disagrees” with | Draw `products`, then `relatedProducts`, in the order received |
