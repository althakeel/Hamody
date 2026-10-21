# Store1920 brands — app API

Last updated: 19 October 2026  
Audience: Android and Flutter  
Website: `https://www.store1920.com/brand/{slug}`  
API root: `https://www.store1920.com/api`  
Screen layout: [ANDROID_BRAND_PAGE.md](./ANDROID_BRAND_PAGE.md)

Send this file to the app developer. The home logo row and each brand page load from the calls below. Do not type the brand names into the app.

A brand page is not a category. `/brand/nexso` is the brand. `/category/brands/nexso` is a category. Open the path that matches the link.

No login. Send `Accept-Language: en` or `ar`.

---

## 1. Home logo row

```http
GET /api/public/brands
```

```json
{
  "brands": [
    {
      "id": "…",
      "slug": "green-lion",
      "path": "/brand/green-lion",
      "name": "Green Lion",
      "nameAr": "",
      "description": "",
      "descriptionAr": "",
      "image": "https://…",
      "bannerEn": "",
      "bannerAr": "",
      "bannerTabletEn": "",
      "bannerTabletAr": "",
      "bannerMobileEn": "",
      "bannerMobileAr": "",
      "metaTitle": "",
      "metaDescription": ""
    }
  ]
}
```

`brands` is every brand page saved in the seller Brands screen, sorted by name. `image` is the logo URL.

| App | Rule |
|---|---|
| Home slider | Draw a logo for each row whose `image` is not empty. Use `name` in English and `nameAr` when the app is Arabic and `nameAr` is not empty |
| Tap | Open `path`. Load products with `slug` |
| New logo | The next call includes it. No app update |
| Empty `image` | Leave that brand out of the logo row |
| 500 `{ "error": "Failed to load brands" }` | Keep the logos already on screen |

Do not call `GET /api/store/brands` from the shopper app. That route is the seller dashboard.

---

## 2. Load one brand

```http
GET /api/public/brand-products?slug={slug}&page=1&limit=100
```

| Query | Rule |
|---|---|
| `slug` | Required. Lowercase. `NEXSO` and `nexso` both work |
| `page` | Default `1` |
| `limit` | Default `100`. The server never returns more than 100 |

```json
{
  "brand": {
    "id": "…",
    "slug": "nexso",
    "path": "/brand/nexso",
    "name": "NEXSO",
    "nameAr": "",
    "description": "",
    "descriptionAr": "",
    "image": "https://…",
    "bannerEn": "",
    "bannerAr": "",
    "bannerTabletEn": "",
    "bannerTabletAr": "",
    "bannerMobileEn": "",
    "bannerMobileAr": "",
    "metaTitle": "",
    "metaDescription": ""
  },
  "products": [],
  "total": 66,
  "page": 1,
  "limit": 100
}
```

`brand` is the saved page: logo, Arabic name, description, and banners. `image` is the logo. Banner fields follow the order in [ANDROID_BRAND_PAGE.md](./ANDROID_BRAND_PAGE.md). When the brand has products but no saved page, `brand.id` and `brand.image` are empty and `brand.name` is the product brand text.

`products` are published products for that brand, newest first. The same SKU is returned once. Each item is the normal product card: `_id`, `slug`, `name`, `nameAr`, `brand`, `images`, `price`, `mrp`, `AED`, `inStock`, `fastDelivery`.

Ask for the next page with the same `slug` and `page=2`. Stop when `products` is empty or `page * limit` is at least `total`.

| Status | Body | App |
|---|---|---|
| 200 | brand, products, total, page, limit | Draw the header and the grid |
| 404 | `{ "error": "Brand not found" }` | Not-found screen |
| 500 | `{ "error": "Failed to load products" }` | Keep products already on screen |

Do not call `GET /api/store/brands` from the shopper app. That route is the seller dashboard.

Use `brand.name` as the title. Use `brand.image` as the logo. The table in section 3 is a snapshot of names on 19 October 2026. The home row must use section 1, not that table.

Slug rule: lowercase, `&` becomes `and`, other symbols are dropped, spaces become hyphens. `LéPRESSO` is `lpresso` because the accent is removed.

---

## 3. Brands on the store

Counted on 19 October 2026 from published products. `Products` is the number of published rows, before duplicate SKUs are collapsed, so `total` from the API can be lower.

**Saved** means a brand page exists in the seller Brands screen, with a logo.

| Name | Slug | Path | Products | Saved |
|---|---|---:|---:|---|
| Apple | `apple` | `/brand/apple` | 2 | |
| BSON | `bson` | `/brand/bson` | 28 | |
| Coolcold | `coolcold` | `/brand/coolcold` | 1 | |
| ERD | `erd` | `/brand/erd` | 5 | |
| FEIXIONGEAGLE | `feixiongeagle` | `/brand/feixiongeagle` | 1 | |
| Generic | `generic` | `/brand/generic` | 1 | |
| GoodDay | `goodday` | `/brand/goodday` | 1 | |
| Green Glow | `green-glow` | `/brand/green-glow` | 1 | |
| Green Lion | `green-lion` | `/brand/green-lion` | 664 | Yes |
| Grillmaster | `grillmaster` | `/brand/grillmaster` | 1 | |
| Happy Home | `happy-home` | `/brand/happy-home` | 1 | |
| HP | `hp` | `/brand/hp` | 1 | |
| HW-BAT LIGHT | `hw-bat-light` | `/brand/hw-bat-light` | 1 | |
| Intex | `intex` | `/brand/intex` | 2 | |
| LéPRESSO | `lpresso` | `/brand/lpresso` | 102 | Yes |
| Lighter | `lighter` | `/brand/lighter` | 1 | |
| M18 Pro | `m18-pro` | `/brand/m18-pro` | 1 | |
| MANSORY | `mansory` | `/brand/mansory` | 1 | |
| Minicole | `minicole` | `/brand/minicole` | 1 | |
| N/A | `na` | `/brand/na` | 1 | |
| NEXSO | `nexso` | `/brand/nexso` | 66 | Yes |
| Nodizz | `nodizz` | `/brand/nodizz` | 1 | |
| Orico | `orico` | `/brand/orico` | 1 | |
| Party Time | `party-time` | `/brand/party-time` | 1 | |
| Porodo | `porodo` | `/brand/porodo` | 1399 | Yes |
| potooBlue | `potooblue` | `/brand/potooblue` | 1 | |
| Powerology | `powerology` | `/brand/powerology` | 1 | |
| Redragon | `redragon` | `/brand/redragon` | 1 | |
| Soundtec | `soundtec` | `/brand/soundtec` | 1 | |
| ST1920 | `st1920` | `/brand/st1920` | 72 | |
| SYNK | `synk` | `/brand/synk` | 1 | |
| TEKNUM | `teknum` | `/brand/teknum` | 33 | Yes |
| Thunder | `thunder` | `/brand/thunder` | 1 | |
| Toby's | `tobys` | `/brand/tobys` | 45 | Yes |
| Tomtoc | `tomtoc` | `/brand/tomtoc` | 1 | |
| Unknown | `unknown` | `/brand/unknown` | 6 | |
| Warriors | `warriors` | `/brand/warriors` | 3 | |
| WISU | `wisu` | `/brand/wisu` | 1 | |
| Wiwu | `wiwu` | `/brand/wiwu` | 364 | Yes |
| WTC | `wtc` | `/brand/wtc` | 1 | |
| WWF | `wwf` | `/brand/wwf` | 1 | |

The seven saved brand pages are Green Lion, LéPRESSO, NEXSO, Porodo, TEKNUM, Toby's, and Wiwu.

`Generic`, `N/A`, and `Unknown` are labels on a few products. They still resolve as brand pages because the product `brand` field is set.

Example:

```http
GET https://www.store1920.com/api/public/brand-products?slug=porodo&page=1&limit=100
```

Open `https://www.store1920.com/brand/porodo`.
