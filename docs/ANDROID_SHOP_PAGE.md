# Store1920 shop screen — Android

Last updated: 12 October 2026  
Audience: Android app  
Website: `https://www.store1920.com/shop`  
API root: `https://www.store1920.com/api`  
Web source: `app/(public)/shop/page.jsx`, `GET /api/categories`

This file is only the **Shop** tab: the left category rail and the panel on the right. The top bar is [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md). The bottom bar is [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md). A category’s product grid, after the customer opens one, is [FLUTTER_CATEGORY_APIS.md](./FLUTTER_CATEGORY_APIS.md).

No login. Send `Accept-Language: en` or `ar`.

```http
GET /api/categories
```

Use categories whose `parentId` is empty for the left rail. Use that category’s `children` for the right panel. Do not scan the whole list again to find children.

---

## 1. Why the banner overflows

`BOTTOM OVERFLOWED BY 8.0 PIXELS` means the banner’s child is 8 px taller than the box. That happens when the title is a second row under the photo inside a height that was only meant for the photo.

Draw **one** clipped card. The photo fills the card. The category name is painted **on** the photo, inside the same card. Do not add a text row under the photo. Do not let the image use its own height.

---

## 2. Screen

The body under the navbar is a row. The rail does not scroll with the right panel. Each side scrolls on its own. The bottom bar stays fixed.

| Piece | Size |
|---|---|
| Left rail | **76** px wide. White. Full height between the navbar and the bottom bar |
| Right panel | The rest of the width. White. **12** px padding on the start, end, and top |
| Gap between blocks in the right panel | **16** px |

Arabic mirrors the row: the rail moves to the end edge. Text inside the right panel is RTL. The rail list order stays the API order.

---

## 3. Left rail

One item per root category.

| Piece | Size |
|---|---|
| Icon | **44 × 44**, radius **10**, image cropped to fill. Background `#f3f4f6` when `image` is empty |
| Label | **10** px, centered, **2** lines, then ellipsis. Color `#334155` |
| Item padding | **8** px top and bottom, **6** px on the sides |
| Selected item | Background `#eef2ff`. A **3** px bar on the start edge, color `#2563eb`, full item height |
| Selected label | `#0f172a`, semibold |

The first root is selected when the screen opens. Tapping another root only changes the right panel. It does not open the category page.

---

## 4. Banner

One card at the top of the right panel. Hide it when the selected category has no `image`.

| Piece | Size |
|---|---|
| Width | The right panel, inside the **12** px padding |
| Height | Width × **280 / 768**. Do not use the photo’s pixel height |
| Radius | **12** |
| Clip | Yes. Children cannot paint outside the card |
| Photo | `image`, cropped from the center (`BoxFit.cover`) |
| Name | On the photo, **12** px from the start and from the vertical center. **16** px, bold, `#0f172a`, max **2** lines, ellipsis |

`nameAr` when the language is Arabic and that field is not empty. Otherwise `name`.

Tapping the card opens `/category/{slug}`.

---

## 5. In the Spotlight

Show this block when the selected category has `children`.

| Piece | Size |
|---|---|
| Title | **In the Spotlight**. **16** px, bold, `#0f172a` |
| Row | Horizontal. **12** px gap. About **3** cards visible |
| Photo | **72 × 72**, radius **12**, cropped to fill. Background `#f3f4f6` when `image` is empty |
| Label | **12** px, `#0f172a`, centered, **2** lines, **6** px under the photo |

The cards are the selected category’s `children`, in API order. Tapping one opens that child’s `/category/…` path (`url` from the API, or `/category/{parentSlug}/{slug}`).

---

## 6. Child sections

Under the spotlight, draw one section for each child that itself has `children`. Skip a child that has none.

| Piece | Size |
|---|---|
| Section title | That child’s name. **16** px, bold, `#0f172a`. **16** px above the row |
| Row | Horizontal. **12** px gap |
| Tile | **104** px wide |
| Art | **104 × 88**, radius **16**, cropped to fill |
| Empty image | Background `#eef2ff`, a simple centered glyph in `#2563eb`. Do not leave a broken image |
| Label | **12** px, `#0f172a`, centered, **2** lines, **6** px under the art |

Those tiles are the grandchild categories. Tapping one opens that grandchild’s category page.

---

## 7. Empty states

| Case | What to draw |
|---|---|
| Categories request failed | Rail empty, right panel text **Could not load categories.** **14** px, `#64748b`, centered |
| A root has no children | Banner only. No spotlight. No sections |
| A root has children, and none of those have children | Banner and spotlight only |

---

## 8. Checklist

- Rail width is **76**. The right panel is everything else.
- Banner height is `width × 280 / 768`, clipped, photo cropped, name on the photo.
- The name is not a row under the photo.
- Spotlight and sections come from `children`, not a second category request.
- Tapping the rail changes the panel. Tapping a card on the right opens that category.
