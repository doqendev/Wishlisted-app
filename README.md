# Wishlisted (Shopify Wishlist App)

A public, embedded **Shopify wishlist** app with a Theme App Extension. Works for guests and logged-in customers, supports **variant-level** items, and provides an optional **public share link**. Server is built with **Remix**, persistence via **Prisma + SQL** (SQLite dev → Postgres prod), and product hydration via a **server-side Storefront API proxy**.

---

## Features
- Theme App Extension (block + snippet) with zero-theme-code install flow.
- App Proxy endpoints (HMAC-verified) for wishlist CRUD.
- Variant-level wishlist items.
- Optional public share link (read-only).
- Local dev uses **SQLite** so you can watch the DB fill up during testing.
- No private endpoints from the browser (e.g., never call `/sf_private_access_tokens`).

---

## Architecture
- **Theme App Extension:** `extensions/wishlisted-theme/`
  - `blocks/wishlisted-page.liquid` — wishlist page block (loads `wishlisted-page.js/.css`).
  - `snippets/wishlisted-button.liquid` — add-to-wishlist button (loads `wishlisted.js/.css`).
  - Allowed dirs only: `assets/`, `blocks/`, `snippets/`, `locales/`.
- **App Proxy:** `/apps/wishlisted/**` → Remix routes `/api/proxy/**`.
- **Storefront Hydration:** `POST /apps/wishlisted/storefront` (server-only Storefront GraphQL proxy).
- **DB:** Prisma models for `AppUser`, `Wishlist`, `WishlistItem`.

---

## App Proxy Endpoints
All requests are HMAC-verified (`verifyAppProxy`).

- `GET /apps/wishlisted/wishlist` → returns the shopper's default list, creating it if necessary:
  ```json
  { "list": { "items": [ /* ... */ ] } }
  ```
- `POST /apps/wishlisted/wishlist/items` → body:
  ```json
  { "productGid": "gid://shopify/Product/...", "variantGid": "gid://shopify/ProductVariant/...", "wishlistId": "optional" }
  ```
  Upserts an item into the list.
- `DELETE /apps/wishlisted/wishlist/items/:id` → removes the item by id.
- `GET /apps/wishlisted/public/:token` → read-only public wishlist.
- `POST /apps/wishlisted/storefront` → body:
  ```json
  { "query": "...", "variables": { } }
  ```
  Proxies to Storefront GraphQL with your server-held token.

> Configure the App Proxy in **Partner Dashboard → App setup → App proxies** (or in `shopify.app.toml`): `prefix=apps`, `subpath=wishlisted`, `url=<your-app-domain>/api/proxy`.

---

## Theme Integration

### 1) Wishlist page
- Create a store page named **Wishlist** (handle `wishlist`).
- In Theme Editor, open that page → **Add block → Apps → “Wishlisted: Page”**.
- This renders a `<div data-wl-root>` and loads `wishlisted-page.js` + `wishlisted-page.css` from the extension.

Navigate to `https://<shop>.myshopify.com/pages/wishlist` (note: **/pages/**, not `/page/`).

### 2) Product button
Add the snippet or block to product templates/cards:

```liquid
{% render 'wishlisted-button', product: product %}
```

The snippet outputs a button like:

```liquid
<button
  data-wishlisted
  data-product-gid="{{ product.admin_graphql_api_id }}"
  data-variant-gid="{{ product.selected_or_first_available_variant.admin_graphql_api_id }}"
>
  <span data-wishlisted-label>Add to wishlist</span>
</button>
```

`wishlisted.js` auto-binds `[data-wishlisted]` to call `POST /apps/wishlisted/wishlist/items` and toggles UI state.

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

## Local Development

### 1) Environment
Create `.env`:
```env
DATABASE_URL="file:./dev.sqlite"
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
SCOPES=read_products,unauthenticated_read_product_listings
STOREFRONT_API_VERSION=2025-07
STOREFRONT_PUBLIC_DOMAIN=<shop>.myshopify.com
STOREFRONT_ACCESS_TOKEN=<public_storefront_token>
```

### 2) Database
```bash
npx prisma migrate dev --name init_wishlist
npx prisma generate
```
This creates **dev.sqlite**; open it in a viewer to watch items as you add/remove them.

### 3) Start Dev
```bash
shopify app dev --reset
```
- CLI will link your app + dev store, start the **App Proxy** and **Theme App Extension** dev server.
- Theme Editor link will be printed—open it and add the **Wishlisted: Page** block to the **Wishlist** page.

---

## Security & Compliance (App Store)
- All storefront calls go through the **App Proxy**. No browser requests to private endpoints.
- HMAC verification on every App Proxy request.
- Scopes limited to what you use (e.g., `read_products`, `unauthenticated_read_product_listings` for hydration).
- Customer data: wishlist rows keyed by `{ shop, customerId? }` and only shown to the owner.
- **CSP:** If you host assets off-domain, update CSP in your app or theme. (The theme extension assets are served by Shopify CDN and are allowed by default.)
- **Privacy pages**: ensure links in your app listing/settings.
- **Billing**: (optional for v1) set up recurring app plan if needed.

---

## Troubleshooting
- **404** on `/page/wishlist` → use `/pages/wishlist` (plural).
- **401** at `/sf_private_access_tokens` → not used by this app; likely a third-party snippet. Safe to ignore/remove.
- **400** on `/apps/wishlisted/wishlist/items` GET → it’s POST-only. The page script requests **GET /apps/wishlisted/wishlist** first.
- Nothing renders? Confirm the block is added to the correct page template, and check DevTools → Network for the App Proxy calls.

---

## Deploy
```bash
shopify app deploy
```
- Confirm **App Proxy** settings (prefix=`apps`, subpath=`wishlisted`, URL=`<your-app-domain>/api/proxy`).
- Promote Postgres by changing `DATABASE_URL` and running `prisma migrate deploy` on your server.

---

## License
Proprietary – 2025 Wishlisted.
