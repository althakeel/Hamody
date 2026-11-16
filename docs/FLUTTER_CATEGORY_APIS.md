# HAMODY categories — mobile API

Last updated: 9 October 2026  
Audience: Flutter developers  
Website: `https://www.hamody.com`  
API root: `https://www.hamody.com/api`

This file is only **categories**: the category index, a category page, the home category icons, and the home category sliders. The rest of the app is in [FLUTTER_ENTIRE_APP.md](./FLUTTER_ENTIRE_APP.md). Product cards on these screens use [the product card in that file](./FLUTTER_ENTIRE_APP.md).

No login. Send `Accept-Language: en` or `ar`.

A category page is not a brand page. `/category/brands/porodo` is a category. `/brand/porodo` is a brand. Do not merge them.

---

## 1. Category tree

```http
GET /api/categories
```

```json
{
  "categories": [
    {
      "_id": "…",
      "name": "Electronics",
      "nameAr": "إلكترونيات",
      "slug": "electronics",
      "image": "https://…",
      "parentId": null,
      "description": "",
      "descriptionAr": "",
      "level": 0,
      "url": "/category/electronics",
      "sortOrder": 1,
      "children": []
    }
  ]
}
```

The array contains **every** active category, and each one also has its `children`. Draw a root list from items whose `parentId` is empty. Open a child from that item’s `children`, not by scanning the whole array again.

| Field | Use |
|---|---|
| `name` / `nameAr` | English, or Arabic when the language is Arabic. If `nameAr` is empty, show `name` |
| `slug` | Last piece of the public path |
| `image` | Category photo. Hide the image box when this is empty |
| `description` / `descriptionAr` | Text under the title. Same Arabic fallback |
| `level` | 0 is a root. 1, 2, 3 are deeper |
| `url` | Public path when the API sends one. Otherwise build `/category/{parentSlug}/{slug}` |
| `children` | Next level only |

Inactive categories are already removed.

---

## 2. Open `/category/…`

Example: `/category/brands/porodo`.

1. Split the path into slugs: `brands`, then `porodo`.
2. Find `brands` among the roots from section 1.
3. Find `porodo` inside that category’s `children`.
4. The last match is the page. Its `_id` is `categoryId`.
5. Breadcrumb is Home, then each slug you walked. The last crumb is not a link.
6. If a slug does not match, the page does not exist.

Child chips:

- Show `children` when `level` is 0 or 1.
- When `level` is 2 and there are children, show those names as filter chips above the products instead of a card grid.
- When `level` is 3, do not show another child row.

Phone child grid: **2 columns**, 12px gap. Each chip is the child name, white, border `#e5e7eb`, radius 8px, centered.

---

## 3. Products in a category

```http
GET /api/public/category-products?categoryId={id}&page=1&limit=100
```

`categoryId` is required. `page` starts at 1. `limit` cannot be higher than **100**.

```json
{
  "products": [],
  "total": 240,
  "page": 1,
  "limit": 100,
  "hasMore": true
}
```

Load the next page while `hasMore` is true. Products include this category **and its children**. The same product card as the shop grid: 2 columns, 12px gap.

`total` is the product count in the header. There is no separate stats API. If `products` is empty and `total` is 0, show an empty state.

---

## 4. Home category icons

```http
GET /api/store/home-menu-categories
```

This GET is public. Do not call the POST. That save is the seller dashboard.

```json
{
  "count": 6,
  "items": [
    {
      "name": "Kitchen",
      "image": "https://…",
      "url": "/category/kitchen",
      "categoryId": "…"
    }
  ]
}
```

Draw round icons in one row. `count` is how many the seller chose to show. `url` starting with `/` opens an in-app screen. If `url` is empty and `categoryId` is set, open that category from the tree in section 1.

---

## 5. Home category sliders

```http
GET /api/public/category-sliders
```

```json
{
  "sliders": [
    {
      "_id": "…",
      "title": "Kitchen",
      "subtitle": "",
      "productIds": ["…", "…"],
      "mobileImage": "https://…/en-app.jpg",
      "mobileImageAr": "",
      "mobileImageRatio": "3:4",
      "mobileImageWidth": 3,
      "mobileImageHeight": 4
    }
  ]
}
```

`mobileImage` and `mobileImageAr` are the app photos. They are not the website side image. English uses `mobileImage`, then `mobileImageAr`. Arabic uses `mobileImageAr`, then `mobileImage`. Hide the image when both are empty.

Draw the frame from `mobileImageRatio`. Allowed values are `3:4`, `2:4`, `4:5`, `1:1`, and `9:16`. `mobileImageWidth` and `mobileImageHeight` are those two numbers, so a `2:4` image is 2 wide and 4 tall. Do not draw `sideImage` on a phone.

The home page list with products already attached is `GET /api/public/featured-sections`. Each section there includes the same image and ratio fields.

One horizontal row per slider. Title, then the products. Load the products with:

```http
POST /api/products/batch
{ "productIds": ["…"] }
```

Skip a slider whose `productIds` list is empty.

---

## 6. What the app must not call

These are seller or admin writes. The shopper app does not use them.

`/api/store/categories`, `/api/store/category-slider`, `/api/store/category-menu`, `/api/admin/categories`
