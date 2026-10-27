# Store1920 app category sliders

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/category-sliders`

One horizontal row of category chips on the app home. The seller saves at least 3 choices and can save up to 12. Each choice is either a parent category or one category set by hand.

The app does not build this row from `GET /api/categories`. The children are already expanded in the response below.

---

## 1. API

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`.

Optional query: `?storeId=` a store id. Without it, the response is the public store.

Read `mobileFeatures.categoryMobileSliders`. The response is cached for about 3 minutes. Keep the last good payload on the device. If a refresh fails, keep that copy.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "categoryMobileSliders": {
      "enabled": true,
      "items": []
    }
  }
}
```

`enabled` false, or `items` empty, means draw nothing.

A path that starts with `/` is a screen on this site. `http://` and `https://` open as a full URL. Ignore `javascript:` and `data:`.

English is left to right, in the order of `items`. Arabic mirrors the row. The label is `titleAr` when the app language is Arabic and that field is present. Otherwise use `title`.

---

## 2. Sample

```json
{
  "enabled": true,
  "items": [
    {
      "categoryId": "665f0b1a2c3d4e5f60718293",
      "title": "Beds",
      "titleAr": "أسرّة",
      "image": "https://…/beds.jpg",
      "path": "/category/furniture/beds",
      "source": "parent"
    },
    {
      "categoryId": "665f0b1a2c3d4e5f60718294",
      "title": "Sofas",
      "titleAr": "أرائك",
      "image": "https://…/sofas.jpg",
      "path": "/category/furniture/sofas",
      "source": "parent"
    },
    {
      "categoryId": "665f0b1a2c3d4e5f60718295",
      "title": "Offers",
      "image": "https://…/offers.jpg",
      "path": "/shop",
      "source": "manual"
    }
  ]
}
```

A hidden row:

```json
{ "enabled": false, "items": [] }
```

---

## 3. Fields

| Field | Meaning |
|---|---|
| `enabled` | `false` hides the row |
| `items` | The chips to draw, already in order |
| `categoryId` | Category id. Omitted when a manual chip is not tied to a category |
| `title` | English label, max 80 characters |
| `titleAr` | Arabic label. Omitted when empty |
| `image` | Chip image. Omitted when the category has no image |
| `path` | Tap target. Empty becomes `/shop` |
| `source` | `parent` or `manual`. The app draws both the same way |

`source` tells where the chip came from. It does not change the layout.

### Parent category

When the seller picks a parent, this array contains that parent’s **direct** children, not the parent itself and not grandchildren. Order is the category sort order, then name. At most 40 children from one parent. A child with no title and no image is left out.

Each child chip has that child’s image, English name as `title`, Arabic name as `titleAr` when it exists, and a path such as `/category/furniture/beds`.

### Manual category

One saved choice is one chip. `title`, `titleAr`, `image`, and `path` are what the seller set. If they left a field empty, it is filled from the category they picked. A manual chip with no title and no image is left out.

---

## 4. How to draw it

One sideways row. Do not wrap it into a grid.

| Piece | Draw |
|---|---|
| Image | On top. Square, about 64 px, corner radius about 16, cover the box. No image means an empty box |
| Title | Under the image, one line, truncated, about 11 px |
| Tap | Opens `path` |
| Gap | About 12 px between chips |

The seller’s 3 to 12 choices are not the chip count. One parent with 8 children is 8 chips, then any manual chips after them, in the order they were saved.

---

## 5. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Read `mobileFeatures.categoryMobileSliders`.
- Hide the row when `enabled` is false or `items` is empty.
- Draw `items` in order. Do not call `GET /api/categories` to find children.
- A parent choice is already expanded into child chips.
- A manual choice is one chip with the saved image, title, and path.
- Use `titleAr` when the language is Arabic and the field is present.
- A tap opens `path`.
