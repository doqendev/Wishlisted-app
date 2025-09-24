# Wishlisted (Shopify Wishlist App)

This app provides a lightweight wishlist system using an App Proxy and Prisma storage.

## App Proxy endpoints
- `GET /apps/wishlisted/wishlist` → maps to Remix route `/api/proxy/wishlist` and returns (or creates) the shopper's default wishlist.
- `POST /apps/wishlisted/wishlist/items` → maps to Remix route `/api/proxy/wishlist/items` and upserts an item.
- `POST /apps/wishlisted/wishlist/items/:id` → maps to Remix route `/api/proxy/wishlist/items/:id` and removes the item.
- `GET /apps/wishlisted/public/:token` → maps to Remix route `/api/proxy/wishlist/public/:token` and returns a public wishlist for sharing.

> Configure your App Proxy in **Partner Dashboard → App setup → App proxies** with: Subpath prefix = `apps`, Subpath = `wishlisted`, and Proxy URL = your app's domain.

## Theme integration (vanilla)
Add these to your Online Store theme (e.g., `theme.liquid`):

```liquid
{{ 'wishlisted.css' | asset_url | stylesheet_tag }}
<script src="{{ 'wishlisted.js' | asset_url }}" defer></script>
```

Then add buttons on product or product-card templates:

```liquid
<button
  data-wishlisted
  data-product-gid="{{ product.admin_graphql_api_id }}"
  data-variant-gid="{{ product.selected_or_first_available_variant.admin_graphql_api_id }}"
>
  Add to wishlist
</button>
```

`window.Wishlisted` exposes small helpers: `getWishlist()`, `addItem({ productGid, variantGid, wishlistId })`, `removeItem(id)`, and `hydrateButtons()` to auto-bind buttons with `data-wishlisted` attribute.

## Environment
Create `.env` with:

```env
SHOPIFY_API_SECRET=
SHOP_DOMAIN=
STOREFRONT_TOKEN=
SHOPIFY_API_KEY=
```

> Never commit real secrets. Rotate the values present in the sample `.env` if they were used for local dev.

## Prisma
- `prisma/schema.prisma` defines Session, AppUser, Wishlist, WishlistItem.
- Run `npx prisma migrate dev` for local changes.

## Development
- `npm run dev` (Shopify CLI)
- `npm run vite` if you want to run the Remix Vite dev server directly as configured by Shopify template.

## Notes
- All App Proxy routes validate HMAC via `verifyAppProxy`.
- Storefront GraphQL proxy available at `/api/storefront`.
