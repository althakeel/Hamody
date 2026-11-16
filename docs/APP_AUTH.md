# HAMODY shopper login and register — app API

Last updated: 28 October 2026  
Audience: Android and Flutter  
Website: sign-in sheet on `https://www.hamody.com`  
API root: `https://www.hamody.com/api`  
WhatsApp sample: [FLUTTER_WHATSAPP_OTP_AUTH.md](./FLUTTER_WHATSAPP_OTP_AUTH.md)

Send this file to the app developer. It is every shopper sign-in and register path on the website. Identity is **Firebase Auth**. The app does not send the password to a HAMODY login route.

After any successful sign-in, protected calls use:

```http
Authorization: Bearer {Firebase ID token}
```

Get that token from Firebase (`user.getIdToken()`). It lasts about one hour. On `401`, refresh with `getIdToken(true)` and retry once. Do not store a custom JWT of your own.

Use the **same Firebase project** as the website (`apiKey`, `authDomain`, `projectId`, `appId`). Those public values are the app’s `NEXT_PUBLIC_FIREBASE_*` settings. Do not put the Firebase Admin service account in the app.

Content-Type for the JSON routes below is `application/json`.

---

## 1. Screen

Title: **Hala! Let's get started**.  
Subtitle: **Create account or sign in to your account**.

Two tabs: **Log in** and **Sign up**. The continue button on both is **CONTINUE**.

There is no separate username. The identity field is the email. Placeholder: **Enter your email**. Placeholder for the password: **Enter your password**. A wrong password shows **Invalid email/username or password.**

```text
Hala! Let's get started
Create account or sign in to your account

[ Log in ]  [ Sign up ]

Sign up only:
  Full name
  Country code + phone

Enter your email
Enter your password
Sign up only: Confirm your password
CAPTCHA question + answer

Log in only: Forgot password?

[ CONTINUE ]

Or continue with
[ Google ]  [ Facebook ]
[ Login with OTP ]

By continuing, I confirm that I have read the Privacy Policy
```

| Method | Tab | Fields |
|---|---|---|
| Email and password | Log in | Email, password, CAPTCHA |
| Email and password | Sign up | Full name, phone, email, password, confirm password, CAPTCHA |
| Google | Either tab | No email or password typed in the app |
| Facebook | Either tab | No email or password typed in the app |
| Email OTP | **Login with OTP** | Email, then a 6-digit code |
| WhatsApp OTP | **Login with OTP** | UAE phone, then a 4-digit code |
| Forgot password | **Forgot password?** on Log in | Email and a 6-digit code, or WhatsApp and a 4-digit code, then a new password |
| MFA | After a successful sign-in, only when the account has it on | 6-digit email code |

Apple is not a button. Do not add it.

The password is never posted to Hamody. Firebase takes it. The calls below are CAPTCHA, lockout, and the result.

---

## 1b. Ways to sign in

The website sheet has these methods. Build the same set.

| Method | Where the secret goes | HAMODY calls |
|---|---|---|
| Email and password — sign in | Firebase `signInWithEmailAndPassword` | CAPTCHA, pre-login, login-result |
| Email and password — register | Firebase `createUserWithEmailAndPassword` | CAPTCHA, pre-login, login-result |
| Google | Firebase Google provider | login-result |
| Facebook | Firebase Facebook provider | login-result |
| Email OTP — sign in or register | 6-digit code by email | captcha, `POST` then `PUT /api/auth/email-otp` |
| WhatsApp OTP — sign in or register | 4-digit code on WhatsApp | captcha, `POST` then `PUT /api/auth/whatsapp-otp` |
| Forgot password | Email 6-digit code, or WhatsApp 4-digit code | `/api/auth/password-reset` |
| MFA | Extra email code, only if the account has it on | `/api/auth/mfa` after login-result |

Apple is not a button on the website sheet. Do not add it.

Google and Facebook do not use CAPTCHA or pre-login. Email/password and the first OTP send do.

---

## 2. Shared calls

### 2.1 Math CAPTCHA

```http
GET /api/auth/captcha
```

```json
{
  "challengeId": "abc123",
  "question": "4 + 7",
  "googleSiteKey": ""
}
```

Show `question`. The shopper types the number (`11`). Send `captchaChallengeId` and `captchaAnswer` on the next call. Reload this GET after a wrong answer or a failed sign-in.

If `googleSiteKey` is not empty, a Google reCAPTCHA token may be sent as `recaptchaToken` instead of the math answer. The website uses the math question.

### 2.2 Rules the app can read

```http
GET /api/auth/security-config
```

```json
{
  "password": {
    "minLength": 8,
    "maxLength": 128,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumber": true,
    "requireSpecial": true,
    "summary": "Min 8 chars, upper, lower, number, special character."
  },
  "lockout": { "maxFailedAttempts": 5, "lockMinutes": 15 },
  "session": { "idleMs": 1800000, "maxMs": 604800000 },
  "captcha": { "mathFallback": true, "siteKey": "" }
}
```

Lockout is **5** failures, then **15 minutes**. Session idle is **30 minutes**. Max session is **7 days**.

### 2.3 Record the Firebase result

Call this after every Firebase sign-in, and after a failed email/password attempt.

```http
POST /api/auth/login-result
```

Success:

```json
{
  "email": "shopper@email.com",
  "success": true,
  "idToken": "{Firebase ID token}"
}
```

```json
{
  "ok": true,
  "sessionId": "…",
  "expiresAt": "…",
  "twoFactorRequired": false,
  "emailVerified": true
}
```

Save `sessionId` on the device. If `twoFactorRequired` is `true`, stay on the MFA screen in section 8. Do not open the account until MFA succeeds.

Failed email/password (no token):

```json
{ "email": "shopper@email.com", "success": false }
```

`423` from pre-login means the account is locked. Body includes `retryAfterSeconds`. Show that and do not call Firebase.

### 2.4 After the account is open

These run after MFA is done, or immediately when MFA is off. Header: `Authorization: Bearer {idToken}`.

| Call | When | Body |
|---|---|---|
| `POST /api/user/link-guest-orders` | Every sign-in | `{ "email": "…", "phone": "+9715…", "phoneNumber": "+9715…" }` |
| `POST /api/users/track-location` | Every sign-in | `{ "pageUrl": "/" }` |
| `POST /api/wallet/bonus` | New account only | `{}` |
| `POST /api/send-welcome-email` | New account only | `{ "email": "…", "name": "…" }` |
| `POST /api/send-login-email` | Returning account | `{ "email": "…", "name": "…" }` |

Guest-order linking attaches checkout orders placed before sign-in when the email or phone matches. A failure here does not undo the sign-in.

Welcome and login emails are notices. A failure does not undo the sign-in.

---

## 3. Email and password

### Sign in

Fields: email, password, CAPTCHA. The email is the account name. There is no separate username.

On Log in, the password field rejects fewer than 6 characters before Firebase is called. Sign up still requires the full rule: at least 8 characters, upper, lower, number, and a special character.

1. `GET /api/auth/captcha`
2. `POST /api/auth/pre-login`

```json
{
  "email": "shopper@email.com",
  "captchaChallengeId": "abc123",
  "captchaAnswer": "11"
}
```

| Status | Meaning |
|---|---|
| 200 | `{ "ok": true, "remainingAttempts": 5 }` — call Firebase |
| 400 | `{ "error": "CAPTCHA verification failed. Please try again." }` or `{ "error": "Email required" }` |
| 423 | Locked. Wait `retryAfterSeconds` |
| 500 | `{ "error": "Pre-login check failed" }` |

3. Firebase `signInWithEmailAndPassword(email, password)`.
4. On Firebase success, `POST /api/auth/login-result` with `success: true` and `idToken`.
5. On Firebase failure, `POST /api/auth/login-result` with `success: false`, then reload the CAPTCHA.

| Firebase code | Show |
|---|---|
| `auth/wrong-password`, `auth/invalid-credential`, `auth/user-not-found` | Invalid email/username or password. |
| `auth/invalid-email` | Please enter a valid email address. |
| `auth/user-disabled` | This account has been disabled. |
| `auth/too-many-requests` | Too many attempts. Please wait and try again. |
| `auth/network-request-failed` | Network error. Please check your connection. |

The password is never posted to Hamody.

### Register

Extra fields, in this order: full name, phone with country code, email, password, confirm password, CAPTCHA.

| Field | Rule |
|---|---|
| Name | At least 2 characters. Letters and spaces only |
| Phone | Required. Country picker, default `+971`. Local number must match that country |
| Email | Must contain `@` and a dot |
| Password | At least 8, at most 128. One uppercase, one lowercase, one number, one of `!@#$%^&*()_+-=[]{}|;:,.<>?` |
| Confirm | Must equal the password |

Same CAPTCHA and `POST /api/auth/pre-login` as sign in. Then Firebase `createUserWithEmailAndPassword`. Set the Firebase display name to the full name. Then `login-result` with `success: true`. This path is a new account: run the new-account calls in section 2.4. Send the phone on `link-guest-orders` as `{countryCode}{local number}`.

| Firebase code | Show |
|---|---|
| `auth/email-already-in-use` | This email is already registered. Please sign in. |
| `auth/weak-password` | Password is too weak. Use 8+ characters with upper, lower, number, and special character. |

There is no `POST /api/auth/register`. Firebase creates the user.

---

## 4. Google

1. Firebase Google sign-in. Ask the shopper to pick an account (`prompt: select_account`).
2. `POST /api/auth/login-result` with the Google account email, `success: true`, and `idToken`.
3. Treat as a new account when Firebase `creationTime` equals `lastSignInTime`.

No CAPTCHA. No password. No HAMODY token exchange.

| Firebase code | Show |
|---|---|
| `auth/popup-closed-by-user`, `auth/cancelled-popup-request` | Sign-in cancelled. Please try again. |
| `auth/account-exists-with-different-credential` | An account already exists with the same email using a different sign-in method. Sign in with email first. |
| `auth/network-request-failed` | Network error. Please check your connection. |

On Android and iOS use the native Google sign-in for this Firebase project, then `GoogleAuthProvider.credential` and `signInWithCredential`. The website uses a popup. The Firebase user must be the same project.

Android reads the Firebase client settings and the Google web client id from `GET /api/public/google-auth`. Do not copy those ids from Google Console. The Android steps are in [ANDROID_GOOGLE_SIGNIN.md](./ANDROID_GOOGLE_SIGNIN.md).

---

## 5. Facebook

Same sequence as Google, with the Firebase Facebook provider. Button label is **Facebook**. No CAPTCHA.

`auth/account-exists-with-different-credential` uses the same message as Google.

---

## 6. Email OTP

Login and register are the same two calls. A new email creates the Firebase user (`isNewUser: true`). An existing email signs into that account. No password.

### Send

```http
POST /api/auth/email-otp
```

```json
{
  "email": "shopper@email.com",
  "name": "Ahmed Ali",
  "captchaChallengeId": "abc123",
  "captchaAnswer": "11"
}
```

`name` is optional. On a new account it is stored as the display name.

```json
{
  "ok": true,
  "ttlSeconds": 600,
  "maskedEmail": "sh***@email.com",
  "message": "We sent a code to sh***@email.com."
}
```

The code is **6 digits** and lasts **10 minutes**. Resend waits **45 seconds**. A resend while a code is still valid does not need a new CAPTCHA.

| Status | Body | App |
|---|---|---|
| 400 | `{ "error": "Enter a valid email address." }` or CAPTCHA failed | Show `error`, reload CAPTCHA |
| 423 | Locked | Show `error`, wait `retryAfterSeconds` |
| 429 | `{ "error": "Please wait 32s before requesting another code.", "retryAfterSeconds": 32 }` | Disable Resend for that many seconds |
| 500 | `{ "error": "Could not send email code" }` | Ask them to try again |

### Verify

```http
PUT /api/auth/email-otp
```

```json
{
  "email": "shopper@email.com",
  "code": "123456",
  "name": "Ahmed Ali"
}
```

```json
{
  "ok": true,
  "customToken": "{Firebase custom token}",
  "isNewUser": false,
  "email": "shopper@email.com",
  "name": "Ahmed Ali"
}
```

Sign in with Firebase `signInWithCustomToken(customToken)` immediately. Discard the custom token. Then `POST /api/auth/login-result` with the ID token.

| Status | Meaning |
|---|---|
| 400 | Invalid, expired, or too many tries on this code (5 tries) |
| 423 | Account locked for 15 minutes |
| 503 | Firebase could not create the user or the token |

Five wrong codes on the account also count toward the 15-minute lock.

---

## 7. WhatsApp OTP

UAE mobiles only. Login and register use the same two calls. Full Flutter sample: [FLUTTER_WHATSAPP_OTP_AUTH.md](./FLUTTER_WHATSAPP_OTP_AUTH.md).

Accepted numbers all become `9715XXXXXXXX`:

| Input | `phoneCode` |
|---|---|
| `0501234567` | `+971` |
| `501234567` | `+971` |
| `+971501234567` | `+971` |

Reject landlines and numbers that are not `971` plus a 9-digit local number starting with `5`.

### Send

```http
POST /api/auth/whatsapp-otp
```

```json
{
  "phone": "0501234567",
  "phoneCode": "+971",
  "name": "Ahmed Ali",
  "captchaChallengeId": "abc123",
  "captchaAnswer": "11"
}
```

`name` is required for register (letters, at least 2 characters). On login it is optional. `countryCode` is an alias of `phoneCode`.

```json
{
  "ok": true,
  "ttlSeconds": 600,
  "maskedPhone": "971****567",
  "message": "We sent a WhatsApp code to 971****567."
}
```

The code is **4 digits**, lasts **10 minutes**, resend waits **45 seconds**, and the number can receive at most **5 codes in 15 minutes**.

| Status | Meaning |
|---|---|
| 400 | Bad phone or CAPTCHA failed |
| 423 | Locked after 5 wrong codes |
| 429 | Resend too soon, or too many sends. Honor `retryAfterSeconds` |
| 503 | WhatsApp is not available. Show `error` |

### Verify

```http
PUT /api/auth/whatsapp-otp
```

```json
{
  "phone": "0501234567",
  "phoneCode": "+971",
  "code": "1234",
  "name": "Ahmed Ali"
}
```

```json
{
  "ok": true,
  "customToken": "{Firebase custom token}",
  "isNewUser": false,
  "email": "",
  "name": "Ahmed Ali",
  "phone": "+971501234567",
  "linkedOrderCount": 0
}
```

`signInWithCustomToken`, then `login-result`. `linkedOrderCount` is guest orders already attached by this phone. `phone` is E.164.

| Status | Meaning |
|---|---|
| 400 | Invalid or expired code |
| 423 | Locked for 15 minutes |
| 503 | Firebase account or token failed |

Do not send the OTP through any other WhatsApp API. HAMODY sends it.

---

## 8. MFA

Only when `login-result` returns `twoFactorRequired: true`. The code is emailed. It is **6 digits** and lasts **10 minutes**. Five wrong tries on that code fail it.

### Send

```http
POST /api/auth/mfa
Authorization: Bearer {idToken}
```

```json
{ "idToken": "{same Firebase ID token}" }
```

```json
{ "ok": true, "message": "MFA code sent to your email" }
```

The website sends this as soon as login-result says MFA is required.

### Verify

```http
PUT /api/auth/mfa
Authorization: Bearer {idToken}
```

```json
{ "code": "123456", "idToken": "{Firebase ID token}" }
```

```json
{ "ok": true, "mfaVerified": true }
```

`400` is `{ "error": "Invalid code" }`, `{ "error": "Code expired or not found" }`, or `{ "error": "Too many invalid attempts" }`. `401` is `{ "error": "Unauthorized" }`.

After `mfaVerified`, run section 2.4. The website does not sign the shopper out of Firebase while they type the code.

Turning MFA on or off is the account security screen, not the login sheet. `GET /api/auth/mfa` with the bearer token returns `{ "twoFactorEnabled": false, "emailVerified": true }`. Enable: `POST` with `{ "setup": true }` to send a code, then `PUT` with `{ "code": "123456", "setup": true }`. Disable: `PUT` with `{ "code": "123456", "disable": true }`.

---

## 9. Forgot password

Two channels. Neither one uses `/api/auth/email-otp` or `/api/auth/whatsapp-otp`.

### Email

1. CAPTCHA, then:

```http
POST /api/auth/password-reset
```

```json
{
  "channel": "email",
  "email": "shopper@email.com",
  "captchaChallengeId": "abc123",
  "captchaAnswer": "11"
}
```

Success is always the same sentence, even when no account exists:

```json
{
  "ok": true,
  "message": "If an account exists for that email, a reset code has been sent. Check inbox and spam."
}
```

The code is **6 digits** and lasts **10 minutes**. `502` means the mail server failed: show `error`.

2. New password:

```http
PUT /api/auth/password-reset
```

```json
{
  "channel": "email",
  "email": "shopper@email.com",
  "otp": "123456",
  "newPassword": "NewPass1!"
}
```

`newPassword` uses the register rules in section 3. Success:

```json
{ "ok": true, "message": "Password updated. Please sign in." }
```

The old sessions are revoked. Send the shopper back to email/password sign in. Do not stay signed in.

| Status | Meaning |
|---|---|
| 400 | Weak password, bad or expired code, or missing `otp` |
| 404 | `{ "error": "Account not found" }` |
| 500 | `{ "error": "Could not reset password" }` |

### WhatsApp

Same route. `channel` is `whatsapp`. Phone rules match section 7. The code is **4 digits**.

Send:

```json
{
  "channel": "whatsapp",
  "phone": "0501234567",
  "phoneCode": "+971",
  "captchaChallengeId": "abc123",
  "captchaAnswer": "11"
}
```

```json
{
  "ok": true,
  "message": "If an account exists for that number, a WhatsApp code has been sent."
}
```

Confirm:

```json
{
  "channel": "whatsapp",
  "phone": "0501234567",
  "phoneCode": "+971",
  "otp": "1234",
  "newPassword": "NewPass1!"
}
```

A resend of either channel, while the shopper is still on the code step for the same email or phone, does not ask for CAPTCHA again.

---

## 10. Sign out and sessions

```http
GET /api/auth/sessions
Authorization: Bearer {idToken}
```

```json
{
  "sessions": [
    {
      "sessionId": "…",
      "deviceLabel": "…",
      "ip": "…",
      "createdAt": "…",
      "lastSeenAt": "…",
      "expiresAt": "…",
      "current": false
    }
  ],
  "idleMs": 1800000,
  "maxMs": 604800000
}
```

| Call | Body | Effect |
|---|---|---|
| `POST /api/auth/sessions` | `{ "sessionId": "…" }` | Heartbeat. `401` with `expired: true` means sign out |
| `DELETE /api/auth/sessions` | `{ "sessionId": "…" }` | Revoke that device |
| `DELETE /api/auth/sessions` | `{ "all": true, "keepCurrent": true, "sessionId": "…" }` | Sign out every other device |

Sign out on this phone: Firebase `signOut()`, delete the saved `sessionId`, and `DELETE` that session.

`401` on any of these is `{ "error": "Unauthorized" }`.

---

## 11. Verify email or phone later

These are for the account screen after sign-in. They are not the login buttons.

| Action | Call | Body |
|---|---|---|
| Send email code | `POST /api/auth/email-verify` | Bearer token. No body |
| Confirm email | `PUT /api/auth/email-verify` | `{ "code": "123456" }` |
| Send phone code | `POST /api/auth/phone-verify` | `{ "phone": "+971501234567" }` |
| Confirm phone | `PUT /api/auth/phone-verify` | `{ "phone": "+971501234567", "code": "123456" }` |

Email verify success is `{ "ok": true, "emailVerified": true }`. Phone verify success is `{ "ok": true, "phoneVerified": true, "phone": "+971501234567" }`. The phone code may arrive by SMS or by email. The send response includes `deliveredVia`: `sms` or `email`. Both codes are 6 digits and last 10 minutes.

---

## 12. What not to build

- A second password database or a custom JWT.
- `POST` of the email/password to Hamody. Firebase takes the password.
- Reuse of `customToken` after `signInWithCustomToken`.
- WhatsApp login for a non-UAE number.
- Apple on the sign-in sheet.
- Seller `Authorization` rules. This document is the shopper app only.
