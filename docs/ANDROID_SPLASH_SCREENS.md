# Store1920 app splash screens

Last updated: 22 October 2026  
Audience: Android and Flutter  
Seller page: `/store/mobile-features/splash-screens`  
Web source: `lib/mobileSplashScreens.js`

These screens play before the home screen. They are not shown on the website.

The seller picks when they play. The default is install, then again only after the app has been closed for 3 hours.

```http
GET https://www.store1920.com/api/public/mobile-features
```

No login. Do not send `Authorization`. The response is cached for about 3 minutes. Cache the last good `mobileFeatures.splashScreens` on the device, including the media files. If a refresh fails, keep that cache and play it. If this is the first launch and the request fails, open home.

Read only `mobileFeatures.splashScreens`. The rest of `mobileFeatures` is other app blocks. The navbar spec is [ANDROID_APP_NAVBAR.md](./ANDROID_APP_NAVBAR.md).

Skip the splash and open home when any of these is true:

- `splashScreens` is missing
- `enabled` is false
- `screens` is missing or empty

`enabled: false` is returned as `{ "enabled": false, "screens": [] }`. `gapSeconds` and `showCountdown` are omitted in that case.

---

## 1. What the seller sets

The seller can save up to 12 screens. The app receives only the screens that are turned on and have a file. Order in `screens` is the play order. A screen the seller turned off is not in the list.

Each file is a photo, a GIF, or a video (MP4, WEBM, MOV, or M4V).

| Field | Meaning |
|---|---|
| `displayMode` | When the list is allowed to play. See the next section |
| `closedHours` | Hours the app must stay closed before it plays again. Always `3` |
| `durationSeconds` | How long that screen stays up |
| `gapSeconds` | Black pause after a screen, before the next one. `0` means no pause |
| `showCountdown` | Draw the remaining seconds in the top end corner |

Photo and GIF seconds are 1–30. The default is 3. Video seconds are 0–30. `0` on a video means play the file until it ends. The gap is 0–10 seconds.

---

## 2. Sample

```json
{
  "success": true,
  "storeId": "69cf7453536ace6caa8c3716",
  "mobileFeatures": {
    "splashScreens": {
      "enabled": true,
      "displayMode": "afterClosed",
      "closedHours": 3,
      "gapSeconds": 1,
      "showCountdown": true,
      "screens": [
        {
          "id": "splash-1",
          "mediaType": "image",
          "url": "https://…/intro.jpg",
          "durationSeconds": 3
        },
        {
          "id": "splash-2",
          "mediaType": "gif",
          "url": "https://…/mark.gif",
          "durationSeconds": 3
        },
        {
          "id": "splash-3",
          "mediaType": "video",
          "url": "https://…/open.mp4",
          "durationSeconds": 0
        }
      ]
    }
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `enabled` | boolean | `false` means do not play |
| `displayMode` | string | `afterClosed`, `everyOpen`, or `installOnly` |
| `closedHours` | number | `3`. Used only when `displayMode` is `afterClosed` |
| `gapSeconds` | number | Present when `enabled` is true. `0`–`10` |
| `showCountdown` | boolean | Present when `enabled` is true |
| `screens` | array | Play in this order. May be empty |
| `screens[].id` | string | Stable id for caching that file |
| `screens[].mediaType` | string | `image`, `gif`, or `video` |
| `screens[].url` | string | `https://` file. Load this URL |
| `screens[].durationSeconds` | number | See the table above |

`mediaType` is already chosen from the file. A `.gif` URL is `gif`. A video extension is `video`. Anything else with a URL is `image`.

---

## 3. When to show it

Keep two values on the device:

- `splashPlayed` — true after the splash has played once on this install
- `closedAt` — the time the app last left the foreground (background or killed)

Set `closedAt` every time the app goes to the background. On the next open, compare that time with now.

```
App open
  │
  ├─ enabled false, or screens empty ──────────────► home
  │
  ├─ displayMode everyOpen ────────────────────────► play, then home
  │
  ├─ displayMode installOnly
  │     first open after install ──────────────────► play, set splashPlayed, then home
  │     any later open ────────────────────────────► home
  │
  └─ displayMode afterClosed   (closedHours is 3)
        first open after install ──────────────────► play, set splashPlayed, then home
        closed for 3 hours or more ────────────────► play, then home
        closed for less than 3 hours ──────────────► home
```

| `displayMode` | Install (first open) | Later opens |
|---|---|---|
| `afterClosed` | Play | Play only when `now - closedAt` is at least `closedHours` (3 hours) |
| `everyOpen` | Play | Play on every open |
| `installOnly` | Play | Do not play again until the app is installed again |

A reinstall clears `splashPlayed` and `closedAt`, so the install splash plays again. Switching the app away for a few minutes does not play the splash when the mode is `afterClosed`.

If `closedAt` is missing after the install play, do not play again until the app has been closed and opened. Do not treat a missing time as 3 hours.

## 4. How to play it

Full screen. Black behind the media. The file fills the screen, cropped (`BoxFit.cover` / `CENTER_CROP`). No player controls. No sound. Play the list once, then open home. Do not loop back to the first screen.

Once the rule above says play, run the list once:

```
screen 1 for durationSeconds
black gap for gapSeconds, if gapSeconds > 0
screen 2
black gap
…
last screen
black gap, if gapSeconds > 0
home
```

| `mediaType` | Draw | When to leave |
|---|---|---|
| `image` | Still image | After `durationSeconds` |
| `gif` | Animated image in an image view, not a video player | After `durationSeconds`. The GIF may loop inside that time |
| `video` | Muted video, no controls | `durationSeconds` is `0`: when the video ends. Greater than `0`: when that many seconds pass, or sooner if the video ends first |

The gap is a full black frame. It counts as its own wait. The countdown, when on, shows the seconds left on the current screen and the seconds left in the gap.

Countdown badge: top end, clear of the status bar. Dark pill, white text, `{seconds} sec`. Hide it when the remaining time is 0. A video with `durationSeconds: 0` has no countdown while the video plays. The gap after it still counts down when `showCountdown` is true.

If one file fails to load, skip that screen and continue. If a video with `durationSeconds: 0` never reports the end, leave that screen after 30 seconds so the app can open home.

---

## 5. Cache

Keep the last successful `splashScreens` object and the downloaded files. When the rule in section 3 says to play, use those cached files so the splash does not wait on the network. Then refresh this API in the background.

A successful response with `enabled: false` or an empty `screens` array is a real “do not show” from the seller. Clear the splash and open home. A failed request is not that. Keep the previous splash.
