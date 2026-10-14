# Store1920 category bar — Android API

Last updated: 12 October 2026  
Audience: Android app  
Website: the black strip under the header (`BABY, KIDS & MATERNITY | BAGS & LUGGAGE | …`)  
Web source: `components/NavbarMenuBar.jsx`

This is not `GET /api/store/navbar-menu`. That route is the logo, search, and phone header. This strip is two public calls. No login. Do not send `Authorization`.

```http
GET https://www.store1920.com/api/store/settings
GET https://www.store1920.com/api/categories
```

Call both together. Hide the strip when `navMenuEnabled` is false, or when the list built below is empty.

---

## 1. Which names to draw

Read `navMenuUseParentCategories` on the settings response.

| Value | List |
|---|---|
| `true` | Ignore `navMenuItems`. Build the bar from `GET /api/categories` |
| `false` | Use `navMenuItems` in that order. Fill each item’s children from the category tree |

### Parent mode (`navMenuUseParentCategories` is true)

From `categories`, keep a category when all of these are true:

1. `parentId` is empty, or it points at an id that is not in the list.
2. The name is a real label. Drop empty names, names shorter than 2 characters, names that are only digits, and 24-character ids.
3. It has at least one child. A child is an item whose `parentId` equals this category’s `_id`, or an entry already nested in `children`.

Order is the order `GET /api/categories` returns. Every item in this mode has a dropdown.

For each parent:

| Field | Value |
|---|---|
| `name` | `nameAr` when the language is Arabic and that field is not empty. Otherwise `name` |
| `link` | `url` when the API sent one. Otherwise `/category/{slug}` |
| `hasDropdown` | `true` |
| Dropdown rows | That parent’s direct children. Same name rule. Same link rule |
| Nested rows | Each child’s own children, same rule |

### Saved mode (`navMenuUseParentCategories` is false)

Draw `navMenuItems` from settings. Drop an item whose `name` is empty.

```json
{
  "name": "ELECTRONICS",
  "link": "/category/electronics",
  "icon": "",
  "hasDropdown": true,
  "categoryId": "…",
  "megaMenu": {
    "linkColumns": 2,
    "manualLinks": false,
    "links": [
      {
        "name": "Mobiles",
        "link": "/category/electronics/mobiles",
        "categoryId": "…",
        "slug": "mobiles",
        "children": [
          { "name": "Cases", "link": "/category/electronics/mobiles/cases", "categoryId": "", "slug": "cases" }
        ]
      }
    ],
    "images": [
      { "url": "https://…", "label": "Sale", "link": "/category/electronics" }
    ]
  }
}
```

When `megaMenu.manualLinks` is false and `megaMenu.links` is empty, fill `links` from the category tree: find the category by `categoryId`, then `slug`, then the last piece of `link`, then the English name. Use that category’s children. If it has no children, `hasDropdown` is false and there is no chevron.

When `manualLinks` is true, use the saved `links` only. Still localize each name from the category tree when the id or slug matches.

A `link` that starts with `/` opens an in-app screen. `https://` opens the browser. Ignore `javascript:` and `data:`.

---

## 2. Settings fields the bar uses

`GET /api/store/settings` returns more than this strip. Read only these.

| Field | Rule |
|---|---|
| `navMenuEnabled` | `false` hides the strip |
| `navMenuUseParentCategories` | `true` uses the live parent list from section 1 |
| `navMenuHoverDropdown` | `false` hides every chevron and every dropdown. The name is still tappable |
| `navMenuItems` | Used only when parent mode is off |
| `navMenuStyle.categoryBarBackgroundColor` | Bar fill. Default `#000000`. Also accept `barBackgroundColor` when the category color is empty |
| `navMenuStyle.dropdownBackgroundColor` | Dropdown fill. Default `#ffffff` |
| `navMenuStyle.dropdownTextColor` | Dropdown text. Default `#334155` |
| `navMenuStyle.dropdownMutedTextColor` | Nested-panel caption. Default `#64748b` |
| `navMenuStyle.dropdownBorderColor` | Dropdown border. Default `#e2e8f0` |
| `navMenuStyle.showBottomBorder` | Draws a line under the bar when true |
| `navMenuStyle.bottomBorderWidth` | That line’s thickness. Default **2** |
| `navMenuStyle.bottomBorderColor` | That line’s color. Default `#e2e8f0` |

The letters on the black bar are **not** `barTextColor`. They follow the bar color: white on a dark bar, `#111827` on a light bar. A bar whose luminance is above 0.65 is light.

---

## 3. Phone design

Full width. One horizontal row. Side padding **16** px. The row scrolls. The scrollbar is hidden.

| Piece | Size |
|---|---|
| Bar | Background `categoryBarBackgroundColor`. About **48** px tall |
| Label | **14** px, semibold, uppercase, wide tracking. Color from the bar, as above |
| Gap around a label | **8** px horizontal, **6** px vertical |
| Divider | A `|` between items, **12** px, the text color at **40%** opacity. Not before the first item |
| Chevron | **12** px, **6** px after the label, text color at **70%**. Only when `navMenuHoverDropdown` is not false and `hasDropdown` is true |
| Icon | **16 × 16**, only when `icon` is not empty. **6** px before the label |
| Scroll arrow | **32 × 32** circle, **4** px from the start edge, vertically centered. Same fill as the bar, **1** px border at 14% white (or 12% black on a light bar). Chevron icon **16** px. Show it only when the row is wider than the screen. Tapping it scrolls about one screen. On a phone the finger swipe does the same |

Arabic mirrors the row. The first item is on the right. The scroll arrow sits on the start edge.

---

## 4. Dropdown

There is no hover on a phone. Tapping the chevron opens the list under that item. Tapping the same chevron, or outside the list, closes it. Tapping the category name still opens `link`.

| Piece | Size |
|---|---|
| Panel | White (`dropdownBackgroundColor`), radius **12**, border **1** px `dropdownBorderColor`, shadow. Width **260**. Sits **2** px under the bar. Keep **8** px inside the screen edge |
| Row | **14** px, medium, `dropdownTextColor`. Padding **14** px horizontal, **8** px vertical. One line, then ellipsis |
| Child chevron | **14** px, 60% opacity, on the end edge, only when that row has `children` |
| Nested panel | Opens beside the row, **4** px away, width **200**, same fill and border. Rows are the `children` array |

If `megaMenu.images` has URLs, show them under the links: image cropped, radius **12**, label on the image when `label` is not empty. Tap uses that image’s `link`.

---

## 5. Checklist

- Two calls: `GET /api/store/settings` and `GET /api/categories`. No token.
- Do not read this strip from `GET /api/store/navbar-menu`.
- Parent mode ignores `navMenuItems` and lists only root categories that have children.
- Bar text is white on `#000000`. Do not print `barTextColor` on the bar.
- A chevron means a dropdown. The name is the category link.
