import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { verifyAppProxy, getProxyContext } from "../utils/proxy.server";
import { makeToken } from "../utils/token.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!verifyAppProxy(request.url, process.env.SHOPIFY_API_SECRET!)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { shop, customerId } = getProxyContext(request.url);

  let user = await prisma.appUser.findFirst({ where: { shop, customerGid: customerId ?? undefined } });
  if (!user) {
    user = await prisma.appUser.create({ data: { shop, customerGid: customerId ?? undefined } });
  }

  let list = await prisma.wishlist.findFirst({ where: { ownerId: user.id, shop }, include: { items: true } });
  if (!list) {
    list = await prisma.wishlist.create({ data: { ownerId: user.id, shop, shareToken: makeToken() }, include: { items: true } });
  }

  return json({ list });
}



