# HAMODY — Login, credentials & Super Admin

**Audience:** Store owner, IT, team leads, developers  
**Product:** HAMODY seller dashboard + platform admin  
**Last updated:** 9 November 2026  

This is the **full login and access document**: who signs in where, how credentials work, what the Super Admin is, team invites, PINs, and password reset.  
Shopper (customer) login is separate — see [APP_AUTH.md](./APP_AUTH.md) and [AUTH_SECURITY.md](./AUTH_SECURITY.md).

---

## 1. Quick map

| Who | Login URL | Identity | Access after login |
|-----|-----------|----------|--------------------|
| **Super Admin** | `/store/login` and/or `/admin/sign-in` | Firebase email in `NEXT_PUBLIC_ADMIN_EMAIL` | Full `/store` + platform `/admin` |
| **Store owner** | `/store/login` | Firebase account that owns the Store record | Full seller dashboard |
| **Team member** | `/store/login` | Invited Firebase email (or username → email) | Only areas allowed in Team Access |
| **Shopper / customer** | Website / app sign-in modal | Firebase | `/dashboard` — **not** the seller store |

Passwords are **never stored in MongoDB**. Firebase Auth holds password hashes. HAMODY only checks the Firebase ID token and then looks up store membership / admin email.

---

## 2. Seller dashboard login (`/store/login`)

**URL:** `https://www.hamody.com/store/login`  
**Page:** `app/store/login/page.jsx`

### 2.1 Ways to sign in

| Method | How |
|--------|-----|
| Email + password | Enter email and password → Firebase `signInWithEmailAndPassword` |
| Username + password | Username is resolved to email via `POST /api/store/login/resolve`, then Firebase email login |
| Google | `startStoreGoogleSignIn` → Google account must already be a seller / invited member |

After Firebase success the app calls `GET /api/store/is-seller` with:

```http
Authorization: Bearer <Firebase ID token>
```

If `isSeller: true`, the user is sent to `/store`.

### 2.2 Login resolve (username → email)

```http
POST /api/store/login/resolve
Content-Type: application/json
```

```json
{ "identifier": "warehouse1" }
```

```json
{ "email": "warehouse1@example.com", "username": "warehouse1" }
```

- If the identifier already contains `@`, it is returned as the email.  
- Otherwise HAMODY looks up `StoreUser.username` with status `approved` or `pending`.  
- `404` = no store account for that username.

### 2.3 Seller check response

```http
GET /api/store/is-seller
Authorization: Bearer <token>
```

Important fields:

| Field | Meaning |
|-------|---------|
| `isSeller` | Allowed into `/store` |
| `isOwner` | This Firebase user owns the Store document |
| `isSuperAdmin` | Email is listed in admin env (see §3) |
| `accessRole` | `owner` · `admin` · `member` |
| `permissions` | Team Access flags for sidebar / APIs |
| `storeInfo` | Store profile |
| `canManageTeamAccess` | Owner, or member with `manageUsers` |
| `canViewActivityHistory` | Activity log visibility |

### 2.4 Demo hint on the login screen

The login page shows a blue “Demo Credentials” box for staff orientation:

| Field | Shown on screen |
|-------|-----------------|
| Email | `support@Store1920.com` |
| Password | Contact admin |

That is a **hint only**. The real password lives in Firebase / your password manager — never commit passwords into git or this repo.

### 2.5 After login

- Owner / Super Admin → full sidebar (subject to a few Super Admin–only settings).  
- Team member → sidebar filtered by Team Access permissions.  
- English LTR only under `/store` (see store skill / `StoreLanguageScope`).

---

## 3. Super Admin (entire definition)

### 3.1 How someone becomes Super Admin

Super Admin is **not** a Mongo role checkbox on the store team list.  
It is an **email allow-list** in environment variables:

```env
NEXT_PUBLIC_ADMIN_EMAIL=hamody.com@gmail.com
```

Optional alias (server-side):

```env
ADMIN_EMAIL=hamody.com@gmail.com
```

Rules (`lib/adminEmails.js`):

- Values are split on commas (several admins allowed).  
- Compared case-insensitively to the Firebase sign-in email.  
- `isAdminEmail(email)` → `true` means **Super Admin**.

**Current configured Super Admin email (from env):** `hamody.com@gmail.com`  

To add another Super Admin, append a comma-separated email and redeploy / restart:

```env
NEXT_PUBLIC_ADMIN_EMAIL=hamody.com@gmail.com,second.admin@example.com
```

### 3.2 What Super Admin gets

| Area | Super Admin power |
|------|-------------------|
| `/store` dashboard | Treated as full access (same as owner for menu); `isSuperAdmin: true` from `is-seller` |
| `/admin/*` platform console | Allowed via `authAdmin` / `isAdminEmail` |
| Settings → **Stock alerts** | Only Super Admin |
| Settings → **Welcome popup** (seller dashboard popup) | Only Super Admin |
| Settings → **Customer pickup** toggle | Super Admin always; owner; or team with pickup permission |
| Settings → **Cache** | Super Admin or store owner |
| Settings → **Passwords** | Super Admin or store owner |
| Block team accounts | Only Super Admin (`/api/store/users/block`) |
| Reset team / customer passwords | Super Admin or store owner |
| VaultsPay statement sidebar | Always visible to Super Admin |
| Activity history | Super Admin can always view |

The Super Admin account **cannot be blocked** by the block-user API.

### 3.3 Platform admin (`/admin`)

| URL | Purpose |
|-----|---------|
| `/admin/sign-in` | Admin sign-in page |
| `/admin` | Admin home |
| `/admin/approve` | Store approval |
| `/admin/home`, `/admin/home-sections`, `/admin/home-hero` | Home merchandising |
| `/admin/categories` | Categories |
| `/admin/coupons` | Coupons |
| `/admin/cache` | Cache tools |
| `/admin/stores` | Stores |
| `/admin/products/fbt` | Frequently bought together |
| `/admin/inventory-history` | Inventory history |
| … | Other admin tools under `app/admin/` |

Access gate: Firebase user email must pass `isAdminEmail`. Non-admin emails are rejected even if they can use `/store`.

Middleware helper: `middlewares/authAdmin.js`.

### 3.4 Super Admin vs store owner vs team

```
Firebase login
      │
      ├─ email in NEXT_PUBLIC_ADMIN_EMAIL  → Super Admin
      │         ├─ /store (full)
      │         └─ /admin (platform)
      │
      ├─ userId === Store.userId           → Store owner
      │         └─ /store (full seller)
      │
      └─ StoreUser membership              → Team member
                └─ /store (permissions only)
```

One person can be both Super Admin and store owner if that Firebase email owns the store **and** is listed in `NEXT_PUBLIC_ADMIN_EMAIL`.

---

## 4. Store owner

- The Store document’s `userId` is the owner’s Firebase UID.  
- Owner always receives full default permissions.  
- Owner can invite team members and edit Team Access.  
- Owner can open Settings → Passwords and Cache (with Super Admin).  
- Owner is **not** automatically a platform `/admin` user unless their email is also in the admin env list.

---

## 5. Team members (credentials & access)

### 5.1 Invite

**Where:** `/store/settings` → **Team Access**  
**API:** `POST /api/store/users/invite` with email + permissions  
**Who:** Store owner (or member with `manageUsers`)

Invite creates / updates a `StoreUser` row and sends an invite link. The person signs in at `/store/login` with that email (or a username if one was set) and the Firebase password for that account.

### 5.2 Roles on StoreUser

| `role` | Meaning |
|--------|---------|
| `admin` | Team “admin” label in dashboard access (still not Super Admin) |
| `member` | Normal team member |

Real power comes from **permission flags**, not only the role string. Defaults: `lib/storePermissionDefaults.js` / `lib/storeDashboardPermissions.js`.

### 5.3 Typical permission areas

Examples (sidebar / API gates):

- Dashboard, categories, brands, suppliers  
- Add / manage products, product cost, change pricing, bulk edit  
- Orders, shipping, inventory  
- Mobile features, menus, blogs  
- Settings, team (`manageUsers`), activity history  
- Customer pickup, VaultsPay statement (off by default for members)

If a member lacks a permission, APIs return **403** with a clear English message (e.g. ask the store owner to enable Change product prices).

### 5.4 Username login

Team accounts may have a `username` on `StoreUser`.  
Login flow: type username → resolve to email → Firebase password for that email.

### 5.5 Block account

Only **Super Admin** can block a team account.  
The Super Admin email itself cannot be blocked.

---

## 6. Passwords & credential management

### 6.1 Where passwords live

| Item | Stored where |
|------|----------------|
| Seller / admin / team password | **Firebase Auth only** |
| Shopper password | **Firebase Auth only** |
| Store membership | Mongo `Store` / `StoreUser` |
| Super Admin flag | Env email list (not a password) |

### 6.2 Reset passwords (seller dashboard)

**Where:** `/store/settings` → **Passwords** tab  
**Who:** Super Admin or store owner  
**API:** `/api/store/users/reset-password`  

Use this to reset a **team** or **customer** Firebase password from the dashboard. Do not paste new passwords into chat, tickets, or git.

### 6.3 Forgot password (person signing in)

Staff who cannot enter `/store` should use Firebase / IT recovery for that email, or ask Super Admin / owner to reset from Settings → Passwords when available.

### 6.4 Credential hygiene (required)

- Do **not** put live passwords in docs, screenshots, or the repo.  
- Do **not** share the Super Admin Google/Firebase password in Slack without a password manager.  
- Rotate Firebase password if an ex-staff member had Super Admin or owner access.  
- Remove their email from `NEXT_PUBLIC_ADMIN_EMAIL` and from Team Access when they leave.

---

## 7. Admin PIN (Help Agent & AI bulk edit)

Separate from login passwords.

| Item | Detail |
|------|--------|
| Env | `STORE_HELP_ADMIN_PIN` |
| Used for | Store Help Agent unlock (sales/customer details) and AI bulk-edit confirmation |
| Verify API | `POST /api/store/admin-pin/verify` with `{ "pin": "…" }` + Bearer token |
| Code | `lib/storeHelpAgentPin.js` |

Any signed-in store account can enter the PIN when prompted; knowing the PIN is an extra gate, not a second login.

**Ops:** keep the current PIN in your private password vault / hosting secrets. Do not publish it in public docs. Change it by updating `STORE_HELP_ADMIN_PIN` and restarting the app.

Related optional secret for unlock tokens: `STORE_HELP_UNLOCK_SECRET` (falls back to other secrets / PIN if unset).

---

## 8. Environment checklist (login & admin)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ADMIN_EMAIL` | Super Admin email list (comma-separated) |
| `ADMIN_EMAIL` | Optional server-side admin email(s) / notifications |
| `STORE_HELP_ADMIN_PIN` | Help Agent / AI bulk PIN |
| `STORE_HELP_UNLOCK_SECRET` | Optional HMAC secret for PIN unlock tokens |
| Firebase client `NEXT_PUBLIC_FIREBASE_*` | Browser Auth |
| `FIREBASE_SERVICE_ACCOUNT_KEY` / `_PATH` | Admin SDK (verify tokens, reset users) |

Firebase must be the **same project** for website and seller login.

---

## 9. API list (login & access)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/store/login/resolve` | Public | Username → email |
| `GET` | `/api/store/is-seller` | Bearer | Seller / owner / Super Admin flags + permissions |
| `POST` | `/api/store/users/invite` | Bearer + permission | Invite team member |
| `GET` | `/api/store/users` | Bearer | List team / dashboard users |
| `POST` | `/api/store/users/reset-password` | Bearer (Super Admin or owner) | Reset password |
| `POST` | `/api/store/users/block` | Bearer (Super Admin only) | Block account |
| `POST` | `/api/store/users/update-permissions` | Bearer | Change Team Access |
| `POST` | `/api/store/admin-pin/verify` | Bearer | Check admin PIN → short-lived token |
| `PATCH` | `/api/store/profile/update` | Bearer | Store settings (some fields Super Admin only) |

Platform admin routes under `/api/admin/*` also require an admin email (see [ADMIN_API.md](./ADMIN_API.md) when present).

---

## 10. End-to-end flows

### 10.1 Super Admin daily login

1. Open `/store/login` (or `/admin/sign-in` for platform tools).  
2. Sign in with the Super Admin Firebase email + password (or Google if enabled for that account).  
3. `is-seller` returns `isSuperAdmin: true`.  
4. Use `/store` for operations; use `/admin` for platform merchandising / approvals.

### 10.2 Invite a warehouse staff member

1. Owner or Super Admin → Settings → Team Access.  
2. Set permissions → enter email → Send invite.  
3. Staff opens invite / `/store/login`, sets or uses Firebase password.  
4. They only see allowed menu items.

### 10.3 Staff locked out

1. Confirm email / username is correct.  
2. Super Admin or owner → Settings → Passwords → reset.  
3. If Super Admin email was mistyped in env, fix `NEXT_PUBLIC_ADMIN_EMAIL` and restart — wrong email = no Super Admin powers even if password works.

### 10.4 Remove access when someone leaves

1. Remove from Team Access (delete member) and/or block (Super Admin).  
2. If they were Super Admin, remove email from `NEXT_PUBLIC_ADMIN_EMAIL` and redeploy.  
3. Rotate shared PINs if they knew `STORE_HELP_ADMIN_PIN`.  
4. Optionally disable the Firebase user in Firebase Console.

---

## 11. Security rules (do / don’t)

**Do**

- Use Firebase for all seller and admin passwords.  
- Keep Super Admin email list short.  
- Prefer Team Access permissions over sharing the owner password.  
- Store PIN and admin passwords in a company password manager.

**Don’t**

- Don’t commit `.env` with live passwords or PINs to a public place.  
- Don’t treat “team admin” role as Super Admin.  
- Don’t give `/admin` access by only inviting someone to Team Access — they must be on the admin email list.  
- Don’t reuse the Super Admin password for personal Gmail outside the intended account policy.

---

## 12. Related documents

| Doc | Topic |
|-----|--------|
| [AUTH_SECURITY.md](./AUTH_SECURITY.md) | Customer auth security layer |
| [APP_AUTH.md](./APP_AUTH.md) | Shopper app login APIs |
| Store skill / `/store` LTR rules | Seller dashboard English-only UI |
| [ERP_INTEGRATION_API.md](./ERP_INTEGRATION_API.md) | ERP staff roles (separate product) |

---

## 13. One-page credential sheet (fill privately)

Copy this into your **private** password vault — leave blanks in git:

| Account | Email / username | Password location | Notes |
|---------|------------------|-------------------|-------|
| Super Admin | `hamody.com@gmail.com` | Password manager | Also controls `/admin` |
| Store owner | ________________ | Password manager | Owns Store.userId |
| Support / demo hint | `support@Store1920.com` | Password manager | Shown on `/store/login` hint |
| Team: ________ | ________________ | Password manager | Permissions: ________ |
| Help / AI PIN | env `STORE_HELP_ADMIN_PIN` | Hosting secrets | Not a login password |

---

## 14. Acceptance checklist

- [ ] Super Admin can sign in at `/store/login` and see `isSuperAdmin: true`  
- [ ] Super Admin can open `/admin`  
- [ ] Non-admin seller cannot open `/admin`  
- [ ] Store owner sees full `/store` menu  
- [ ] Invited member only sees allowed areas  
- [ ] Username resolves via `/api/store/login/resolve`  
- [ ] Password reset works for Super Admin / owner  
- [ ] Only Super Admin can block users  
- [ ] Admin PIN gates Help Agent / AI bulk edit  
- [ ] No live passwords stored in this repository  
