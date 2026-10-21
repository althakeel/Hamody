# Google sign-in for the Store1920 Android app

Last updated: 20 October 2026  
Audience: Android  
API root: `https://www.store1920.com/api`  
Full shopper auth: [APP_AUTH.md](./APP_AUTH.md)

The website and the app use one Firebase project. Do not create a second Google Cloud project, and do not paste client IDs from Google Console into the app. Read them from the server.

---

## 1. Read the Google setup from the server

```http
GET /api/public/google-auth
```

```json
{
  "configured": true,
  "firebase": {
    "apiKey": "",
    "authDomain": "",
    "projectId": "",
    "storageBucket": "",
    "messagingSenderId": "",
    "appId": ""
  },
  "googleWebClientId": ""
}
```

Initialize Firebase with `firebase`. Pass `googleWebClientId` to Google Sign-In as the server / web client id (`requestIdToken`). That value is the same OAuth Web client the website uses.

These fields are public client ids. They are not the Firebase Admin private key. Do not ask the store for a service-account JSON file.

Call this when the app starts, or ship the JSON from a build step that calls this URL. If `configured` is false, Google sign-in is not ready on the server.

---

## 2. Sign in

1. Google Sign-In with `requestIdToken(googleWebClientId)` and `requestEmail()`.
2. Firebase `GoogleAuthProvider.getCredential(idToken, null)`, then `signInWithCredential`.
3. `user.getIdToken(false)`.
4. Tell the server:

```http
POST /api/auth/login-result
Content-Type: application/json

{
  "email": "shopper@gmail.com",
  "success": true,
  "idToken": "<Firebase ID token>"
}
```

No CAPTCHA. No password. There is no separate Store1920 Google token.

Later API calls use:

```http
Authorization: Bearer <Firebase ID token>
```

Refresh with `getIdToken(true)` on `401`. Account linking, new-account calls, and error text are in [APP_AUTH.md](./APP_AUTH.md) section 4.

| Firebase code | Show |
|---|---|
| Cancelled by the shopper | Sign-in cancelled. Please try again. |
| `auth/account-exists-with-different-credential` | An account already exists with the same email using a different sign-in method. Sign in with email first. |
| `auth/network-request-failed` | Network error. Please check your connection. |

---

## 3. One console step the store owner does

Google still checks the app’s package name and signing certificate. The Android developer sends the store owner:

- Application id (package name)
- SHA-1 and SHA-256 of the debug keystore
- SHA-1 and SHA-256 of the Play App Signing certificate

The store owner adds those once in Firebase, on the same project as the website:

1. Project settings → Your apps → Add app → Android.
2. Package name from the developer.
3. Add both SHA-1 fingerprints (debug and Play signing).
4. Authentication → Sign-in method → Google stays enabled. Do not create a new OAuth client by hand. Firebase adds the Android client when the SHA-1 is saved.

After that, the app keeps using `GET /api/public/google-auth`. It does not download `google-services.json` for the client ids.
