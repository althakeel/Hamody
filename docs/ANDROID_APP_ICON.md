# Store1920 app main icon

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/app-icon`

The icon of the app itself, the mark on the phone home screen. This is not the header logo. The header logo is `mobileFeatures.appNavbar.logoUrl` and is drawn only beside Deliver to. See [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md).

---

## 1. API

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`. Do not call `/api/store/mobile-features`.

Optional query: `?storeId=` a store id. Without it, the response is the public store.

Read `mobileFeatures.appIcon.url`. The response is cached for about 3 minutes. Keep the last good payload on the device. If a refresh fails, keep that copy.

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "appIcon": {
      "url": "https://…/app-icon.png"
    }
  }
}
```

When the seller has not saved an icon, `url` is left out and `appIcon` is `{}`. Keep the icon that shipped with the app build. Do not use `appNavbar.logoUrl` in its place.

The file is a JPEG, PNG, or WebP. Prefer a square PNG so the corners stay transparent. A GIF is not accepted for this icon.

---

## 2. How to use it

Use `appIcon.url` as the app’s main icon.

| Piece | Draw |
|---|---|
| Shape | Square. The phone masks it (Android squircle, iOS rounded square) |
| Image | Covers the box. Crop the overflow |
| Missing `url` | The icon bundled in the app |

Saving a new file here does not rewrite an already installed launcher icon by itself. The app applies `appIcon.url` when it next reads this payload. Until then, the bundled icon stays.

Do not draw this image in the home header. That place uses `appNavbar.logoUrl`.

---

## 3. Checklist

- One call: `GET /api/public/mobile-features`. No token.
- Read `mobileFeatures.appIcon.url`.
- When `url` is missing, keep the bundled app icon.
- Do not use `appNavbar.logoUrl` as the main app icon.
- Do not draw `appIcon.url` beside Deliver to.
