# Wishlisted — Agents & Implementation Plan (v1)

## Vision
A production-ready **Shopify Wishlist** app for both guests and logged-in customers, with **variant-level** items, an optional **public share link**, and clean theme integration via a **Theme App Extension**. Server is **Remix (embedded)**, persistence via **Prisma + SQL** (SQLite in dev, Postgres in prod), and storefront product hydration through a **Storefront API proxy** (via App Proxy on the server).

## Scope for v1
- Single default wishlist per user (guest → migrates to customer on login).
- Add/Remove items at **variant** granularity.
- Public, read-only share link (opaque token).
- Theme App Extension: wishlist **page block** + PDP **button snippet**.
- Compliance with Shopify App Store requirements (App Proxy HMAC verification, no private endpoints from the browser, supported theme extension structure).

## Out-of-scope (to backlog)
- Multiple named lists per user.
- Alerts (price drop / back in stock).
- Merchant analytics UI beyond minimal settings.

---

## Architecture
- **App type:** Public, embedded app (Partner Dashboard).
- **Theme App Extension:** `extensions/wishlisted-theme/`
  - `blocks/wishlisted-page.liquid` — wishlist page block (auto-loads `wishlisted-page.js/.css`).
  - `snippets/wishlisted-button.liquid` — add-to-wishlist button for PDP/cards (auto-loads `wishlisted.js/.css` from extension or theme assets).
  - Only allowed dirs: `assets/`, `blocks/`, `snippets/`, `locales/`.
- **App Proxy:** `/apps/wishlisted/**` → Remix routes under `/api/proxy/**` with HMAC verification.
- **Data layer:** Prisma models `AppUser`, `Wishlist`, `WishlistItem`.
  - Dev: **SQLite** (`file:./dev.sqlite`) so you can inspect a local DB while testing.
  - Prod: Postgres (via `DATABASE_URL` swap).
- **Storefront hydration:** Server-side proxy `POST /apps/wishlisted/storefront` calls Storefront GraphQL with a **Storefront token** (not exposed to the browser). Frontend should **not** call `/sf_private_access_tokens`.
- **Guest fallback:** If the user is not logged in, failed adds are temporarily cached in `localStorage` (`wl_fallback`). Page load merges these for dev convenience (does not affect prod).

---

## Data Model (Prisma)
```prisma
model AppUser {
  id          String     @id @default(cuid())
  shop        String
  customerGid String?
  wishlists   Wishlist[]
  createdAt   DateTime   @default(now())

  @@index([shop, customerGid])
}

model Wishlist {
  id         String         @id @default(cuid())
  shop       String
  ownerId    String
  owner      AppUser        @relation(fields: [ownerId], references: [id])
  shareToken String         @unique
  isPublic   Boolean        @default(false)
  items      WishlistItem[]
  createdAt  DateTime       @default(now())

  @@index([shop, ownerId])
}

model WishlistItem {
  id         String   @id @default(cuid())
  wishlistId String
  wishlist   Wishlist @relation(fields: [wishlistId], references: [id])
  productGid String
  variantGid String?
  createdAt  DateTime @default(now())

  @@unique([wishlistId, variantGid])
}
```

---

## API Surface (App Proxy)
All endpoints live under `/apps/wishlisted/**` and are verified by HMAC.

- `GET /apps/wishlisted/wishlist` → returns `{ "list": { "items": [...] } }`, creating the default list if missing.
- `POST /apps/wishlisted/wishlist/items` → body: `{ productGid, variantGid, wishlistId? }` → upserts an item.
- `DELETE /apps/wishlisted/wishlist/items/:id` → removes an item by id.
- `GET /apps/wishlisted/public/:token` → returns read-only list for sharing.
- `POST /apps/wishlisted/storefront` → server-side Storefront GraphQL proxy `{ query, variables }`.

---

## Agents / Responsibilities
- **App Proxy Agent (server)**: Verify HMAC, translate to DB ops, guard privacy, shape responses for the theme.
- **DB Agent (Prisma)**: Manage schema, migrations, and connections (SQLite dev / Postgres prod).
- **Hydration Agent (Storefront proxy)**: Fetch product/variant data using Storefront API on the server.
- **Theme Extension Agent**: Ship block/snippet + assets; ensure schema length constraints; avoid disallowed dirs.
- **QA Agent**: Validate `/pages/wishlist` rendering, PDP button add/remove, public share, and login migration.

---

## Milestones
1. **M1 – Core list CRUD (done)**: App Proxy GET/POST/DELETE wired to DB; wishlist page renders.
2. **M2 – Storefront hydration (done)**: Server proxy and client integration.
3. **M3 – Guest fallback (done)**: LocalStorage bridge in dev.
4. **M4 – App Store checklist**: scopes, CSP, privacy policy links, billing prep (if needed).
5. **M5 – Docs & polish**: README, support docs, edge-case handling (bundle/combined listings ready).

---

## Acceptance Criteria
- Theme block renders wishlist correctly at `/pages/wishlist`.
- Adding/removing items updates DB and UI immediately.
- No browser calls to private endpoints; all cross-origin calls go through the App Proxy.
- Clean validator output from Shopify CLI for theme app extension.
- README documents local dev (DB visible), deployment, and compliance checklists.
