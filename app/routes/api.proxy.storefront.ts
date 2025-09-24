import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyAppProxy } from "../utils/proxy.server";

export async function action({ request }: ActionFunctionArgs) {
  if (!verifyAppProxy(request.url, process.env.SHOPIFY_API_SECRET!)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { query, variables } = await request.json();
  const res = await fetch(`https://${process.env.SHOP_DOMAIN}/api/2025-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.STOREFRONT_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
