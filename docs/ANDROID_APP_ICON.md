# Store1920 app header icon

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/app-icon`

One image in the home header, at the start of the Deliver to row. This is not the icon on the phone’s home screen, not a splash screen, and not a bottom-menu icon.

---

## 1. API

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`. Do not call `/api/store/mobile-features`.

Optional query: `?storeId=` a store id. Without it, the response is the public store.

Read `mobileFeatures.appNavbar.logoUrl`. The response is cached for about 3 minutes. Keep the last good payload on the device. If a refresh fails, keep that copy.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "appNavbar": {
      "logoUrl": "https://…/app-icon.gif"
    }
  }
}
```

When the seller has not saved an icon, `logoUrl` is left out. Draw no icon. Do not draw a “store 1920” placeholder.

The file is a JPEG, PNG, WebP, or GIF. A GIF keeps playing, looped, with no controls. A video is not accepted for this icon.

A tap on the icon does nothing. It is not a link.

---

## 2. How to draw it

Place it on the home header only, inside `appNavbar.logoRow`, at the start edge.

| Piece | Draw |
|---|---|
| Box | **56 × 56** px |
| Corners | Radius **16** |
| Image | Covers the box. Crop the overflow |
| Inset | `logoRow.paddingX` from the start edge. Default **16** |
| Beside it | The Deliver to pin and the two address lines, in the space that remains |

Arabic mirrors the row, so the icon sits on the right.

The rest of the home header — marquee, search, banner — stays as in `ANDROID_APP_NAVBAR.md`. Other pages do not show this icon.

---

## 3. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Read `mobileFeatures.appNavbar.logoUrl`.
- Hide the icon when `logoUrl` is missing.
- Draw a 56 × 56 box, radius 16, image covering the box, at the start of the Deliver to row.
- A GIF keeps playing.
- Do not use this URL as the phone launcher icon.
