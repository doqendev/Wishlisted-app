import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyAppProxy } from "../utils/proxy.server";
import prisma from "../db.server";

export async function action({ request, params }: ActionFunctionArgs) {
  if (!verifyAppProxy(request.url, process.env.SHOPIFY_API_SECRET!)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const id = params.id!;
  await prisma.wishlistItem.delete({ where: { id } }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}

