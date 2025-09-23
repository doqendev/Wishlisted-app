# Wishlisted — Agents & Implementation Plan

## Vision
Build a production-ready **Shopify Wishlist** app that works for both guests and logged-in customers, supports **variant-level** wishlist items, provides a **shareable public link**, and integrates cleanly with themes via a **Theme App Extension**. Backend uses **Remix**, data via **Prisma + SQL**, and storefront hydration via **Storefront API**.

## Non-Goals (for v1)
- Complex multi-list management (v1 supports a single default list per user).
- Email campaigns or price-drop notifications (planned for v1.1+).
- Admin dashboards beyond minimal settings.

---

## User Stories
- **Shopper (guest):** I can add a product/variant to a wishlist; it persists in the browser and migrates when I log in.
- **Shopper (customer):** I can view, add, remove items; I can share my wishlist URL.
- **Merchant:** I can add a block on PDP and a “Wishlist Page” section via Theme Editor without touching code.
- **SEO/Social:** Public share page renders server-side for link previews.

---

## Architecture
- **App type:** Public app (draft) created via Partner dashboard.
- **Server:** Remix app (embedded), handling App Proxy requests under `/api/proxy/*`.
- **Persistence:** SQL via Prisma (SQLite dev → Postgres prod). Primary truth for wishlists. Optional sync to Customer metafield for portability.
- **Storefront hydration:** Client calls `/api/proxy/wishlist` to fetch list; then `/api/storefront` proxy runs Storefront GraphQL `nodes(ids:)` to hydrate variants for rendering.
- **Theme integration:** Theme App Extension with:
  - PDP block: “Wishlist — Add Button”
  - Page section: “Wishlist — Page”
  - Asset: small JS for add/remove & state events.
- **Sharing:** Public token (opaque) for read-only page (`/apps/wishlist/public/:token`).

---

## Data Model (Prisma)
```prisma
model AppUser {
  id          String     @id @default(cuid())
  shop        String
  customerGid String?    @unique
  email       String?
  wishlists   Wishlist[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([shop])
}

model Wishlist {
  id          String         @id @default(cuid())
  shop        String
  ownerId     String
  owner       AppUser        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title       String         @default("My Wishlist")
  isPublic    Boolean        @default(true)
  shareToken  String         @unique
  items       WishlistItem[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([shop])
}

model WishlistItem {
  id          String   @id @default(cuid())
  wishlistId  String
  wishlist    Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  productGid  String
  variantGid  String
  notes       String?
  createdAt   DateTime @default(now())

  @@unique([wishlistId, variantGid])
  @@index([variantGid])
}
