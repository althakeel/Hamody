# HAMODY blogs — app API

Last updated: 27 October 2026  
Audience: Android and Flutter  
Website list: `https://www.hamody.com/blogs`  
Website article: `https://www.hamody.com/blogs/{slug}`

The app reads published posts only. Do not call `/api/store/blogs`. That route needs a seller login and includes drafts.

No login. Do not send `Authorization`.

Optional query on both calls: `?storeId=` a store id. Without it, the response is the public store. `?lang=ar` or `?language=ar` returns Arabic title, excerpt, and body when those Arabic fields are saved. Any other value, including a missing language, is English.

A future publish date stays hidden until that time. Drafts are hidden.

---

## 1. List

```http
GET https://www.hamody.com/api/public/blogs
```

| Query | Default | Meaning |
|---|---|---|
| `page` | `1` | Page number, minimum 1 |
| `limit` | `20` | Posts on this page, 1–50 |
| `sort` | `newest` | `newest`, `oldest`, or `title` (A–Z on the English title) |
| `q` | empty | Search in the English and Arabic title and excerpt |
| `lang` | `en` | `en` or `ar` |
| `storeId` | public store | |

The response is cached for about 1 minute. If the call fails, the server still returns HTTP 200 with `success: true` and `blogs: []`. An empty list is not a network failure. A failed network call is.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "page": 1,
  "limit": 20,
  "total": 3,
  "sort": "newest",
  "q": "",
  "blogs": [
    {
      "id": "665f0b1a2c3d4e5f60718293",
      "title": "How to choose a mattress",
      "titleEn": "How to choose a mattress",
      "titleAr": "كيف تختار مرتبة",
      "slug": "how-to-choose-a-mattress",
      "excerpt": "A short summary for the card.",
      "contentHtml": "<p>Full article HTML…</p>",
      "coverImage": "https://…/cover.jpg",
      "bannerImage": "https://…/banner.jpg",
      "authorName": "HAMODY",
      "publishedAt": "2026-10-01T08:00:00.000Z",
      "seoTitle": "How to choose a mattress",
      "seoDescription": "A short summary for the card.",
      "updatedAt": "2026-10-02T08:00:00.000Z"
    }
  ]
}
```

`total` is the number of posts that match, not the number on this page. The next page exists when `page * limit < total`.

On the list, draw the card from `coverImage`, `title`, `excerpt`, and `publishedAt`. Open the article with `slug`. Ignore `contentHtml` on the list. A missing `coverImage` is a card with no photo.

---

## 2. One article

```http
GET https://www.hamody.com/api/public/blogs/{slug}
```

`slug` is lowercase. Example: `GET /api/public/blogs/how-to-choose-a-mattress?lang=ar`.

| Status | Body |
|---|---|
| 200 | `{ "success": true, "blog", "previous", "next", "recent" }` |
| 400 | `{ "error": "Missing slug" }` |
| 404 | `{ "error": "Blog not found" }` |
| 500 | `{ "error": "Failed to load blog" }` |

`blog` uses the same fields as a list item. `previous` is the older post. `next` is the newer post. Either is `null` when there is no neighbor. `recent` is up to 6 other published posts, newest first, not including the open article.

`previous`, `next`, and `recent` are cards. Use `title`, `slug`, `coverImage`, and `publishedAt`. `recent` also has `excerpt`. Do not expect `contentHtml` or `bannerImage` on those three.

```json
{
  "success": true,
  "blog": {
    "id": "665f0b1a2c3d4e5f60718293",
    "title": "How to choose a mattress",
    "titleEn": "How to choose a mattress",
    "titleAr": "كيف تختار مرتبة",
    "slug": "how-to-choose-a-mattress",
    "excerpt": "A short summary for the card.",
    "contentHtml": "<h2>Firmness</h2><p>Body text.</p><img src=\"https://…/photo.jpg\" alt=\"\" data-width=\"full\" data-align=\"center\" />",
    "coverImage": "https://…/cover.jpg",
    "bannerImage": "https://…/banner.jpg",
    "authorName": "HAMODY",
    "publishedAt": "2026-10-01T08:00:00.000Z",
    "seoTitle": "How to choose a mattress",
    "seoDescription": "A short summary for the card.",
    "updatedAt": "2026-10-02T08:00:00.000Z"
  },
  "previous": {
    "id": "…",
    "title": "Older post",
    "slug": "older-post",
    "coverImage": "https://…/older.jpg",
    "publishedAt": "2026-09-01T08:00:00.000Z"
  },
  "next": null,
  "recent": []
}
```

### How to draw the article

1. Hero image is `bannerImage`. If it is empty, skip the hero. Do not stretch `coverImage` into the hero. `coverImage` is the list card.
2. Title, then `publishedAt` and `authorName` when they are not empty.
3. Body is `contentHtml`. Render it as HTML. Do not show it as a raw string.

The HTML can contain `p`, `br`, `h1`–`h4`, `strong`, `em`, `u`, lists, links, images, blockquote, tables, and `span` or `div`. Scripts and iframes are already removed.

| Image attribute | Draw |
|---|---|
| `data-width="full"` or class `blog-img-full` | Full width of the article |
| `data-width="half"` or class `blog-img-half` | Half the article width |
| `data-width="third"` or class `blog-img-third` | One third of the article width |
| no width | At most the article width, keep the photo’s ratio |
| `data-align="left"` | Against the start edge |
| `data-align="center"` | Centered |
| `data-align="right"` | Against the end edge |

A link with `href` starting with `/` is a page on this site. `https://` is an external page. Ignore `javascript:`.

In Arabic, lay the article out right to left. `title` is already the Arabic title when `lang=ar` and `titleAr` was saved. `titleEn` and `titleAr` are always both present so the app can switch language without a second request. The same is true of the body: `contentHtml` is the language requested. The other language is not a separate field on this response. Call the same URL again with the other `lang` to get the other body.

---

## 3. Checklist

- List: `GET /api/public/blogs`. Article: `GET /api/public/blogs/{slug}`.
- No token.
- Cards use `coverImage`, `title`, `excerpt`, and `publishedAt`.
- The article hero uses `bannerImage`. The body uses `contentHtml`.
- `lang=ar` switches title, excerpt, and body when Arabic text was saved.
- Previous, next, and recent open another article by `slug`.
- Do not call `/api/store/blogs`.
