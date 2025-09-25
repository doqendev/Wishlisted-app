import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyAppProxy } from "../utils/proxy.server";

export async function action({ request }: ActionFunctionArgs) {
  if (!verifyAppProxy(request.url, process.env.SHOPIFY_API_SECRET!)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { query, variables } = await request.json();
  const domain = process.env.STOREFRONT_PUBLIC_DOMAIN || process.env.SHOP_DOMAIN;
  const token = process.env.STOREFRONT_ACCESS_TOKEN || process.env.STOREFRONT_TOKEN;
  const apiVersion = process.env.STOREFRONT_API_VERSION || '2025-07';
  if(!domain || !token){
    return new Response(JSON.stringify({ error: 'Storefront env not configured', domain, tokenSet: !!token }), { status: 500, headers: { 'Content-Type':'application/json' } });
  }
  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
