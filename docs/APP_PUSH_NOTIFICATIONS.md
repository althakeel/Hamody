# Store1920 app push notifications

Last updated: 27 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/push`

The seller sends a title, a message, an optional image, and an optional button that opens a page. The server delivers it with Firebase Cloud Messaging to phones that have registered a device token.

Do not call `/api/store/app-notifications`. That route is the seller dashboard.

---

## 1. App headers

Both public calls below require these headers. A missing or wrong pair returns `401` `{ "error": "Unauthorized" }`.

| Header | Meaning |
|---|---|
| `X-Store1920-App-Id` | The app id issued for this store |
| `X-Store1920-App-Key` | The app key issued for this store |

Ask the store for those two values. They are not in this document.

Also send the platform so the server knows the phone:

| Header | Value |
|---|---|
| `X-Store1920-Client` | `app` |
| `X-Store1920-Platform` | `android` or `ios` |

---

## 2. Register the phone

Call this after Firebase returns a device token, and again whenever that token changes. Call it on each app open so the phone stays in the send list.

```http
POST https://www.store1920.com/api/public/app-device
Content-Type: application/json
X-Store1920-App-Id: …
X-Store1920-App-Key: …
X-Store1920-Platform: android
```

```json
{
  "token": "the FCM registration token",
  "platform": "android",
  "anonymousId": "optional device id"
}
```

| Field | Meaning |
|---|---|
| `token` | Firebase registration token. 20 to 4096 characters, no spaces |
| `platform` | `android` or `ios`. If omitted, `X-Store1920-Platform` is used |
| `anonymousId` | Optional. Max 80 characters. A stable id for this install |
| `storeId` | Optional. Without it, the public store is used |

Success:

```json
{ "ok": true }
```

| Status | Body |
|---|---|
| `400` | `{ "error": "A device token is required" }` or `{ "error": "platform must be android or ios" }` |
| `401` | Wrong app id or app key |
| `404` | `{ "error": "Store not found" }` |
| `500` | `{ "error": "Could not save this phone" }` |

The same token is updated, not duplicated. A token Firebase later rejects is removed on the next send.

---

## 3. What arrives in the push

Firebase delivers two parts. The system tray uses `notification`. The app reads `data` for the button and the page.

`notification`:

| Field | Meaning |
|---|---|
| `title` | Max 80 characters |
| `body` | Max 240 characters |
| `imageUrl` | Present only when the seller attached an image. HTTPS |

`data` (every value is a string):

| Field | Meaning |
|---|---|
| `title` | Same title |
| `body` | Same message |
| `imageUrl` | Image URL, or `""` |
| `buttonText` | Button label, max 24 characters, or `""` |
| `path` | Where a tap opens. Default `/` |

Android sets priority `high` and click action `FLUTTER_NOTIFICATION_CLICK`. iOS plays the default sound. When an image is set, iOS `mutableContent` is true so the image can be attached.

### Tap

Open `data.path`.

A path that starts with `/` is a screen in the app (`/shop`, `/product/…`, `/category/…`). `https://` opens as a full URL.

Show `buttonText` only when it is not empty. The button uses the same `path`. A notification with no button still opens `path` when the customer taps the tray message.

Show `imageUrl` above the title when it is not empty.

---

## 4. Recent messages

Use this for an in-app list. It returns the last 20 messages for that phone’s platform, newest first. It does not register the phone.

```http
GET https://www.store1920.com/api/public/app-notifications?platform=android
X-Store1920-App-Id: …
X-Store1920-App-Key: …
```

`platform` is `android` or `ios`. Without it, the list includes Android-only, iOS-only, and messages sent to both.

```json
{
  "notifications": [
    {
      "id": "6712ab0c9f1e4a0012345678",
      "title": "Weekend offer",
      "body": "Open the app for the deal",
      "imageUrl": "https://…/banner.jpg",
      "buttonText": "Shop now",
      "path": "/shop",
      "audience": "all",
      "sentAt": "2026-10-27T08:00:00.000Z"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `audience` | `all`, `android`, or `ios`. An Android phone receives `all` and `android` |
| `sentAt` | When the seller sent it |
| `imageUrl` | `""` when there is no image |
| `buttonText` | `""` when there is no button |

A failure still returns `{ "notifications": [] }` with status `500`. `401` means the app headers are wrong.

---

## 5. Checklist

- Send `X-Store1920-App-Id` and `X-Store1920-App-Key` on both calls.
- After Firebase issues a token, `POST /api/public/app-device` with `token` and `platform`.
- Repeat that call when the token refreshes and when the app opens.
- Draw the tray from `notification.title`, `notification.body`, and `notification.imageUrl`.
- On tap, open `data.path`. If `data.buttonText` is set, the button opens that same path.
- `GET /api/public/app-notifications?platform=android` is the in-app list, last 20.
