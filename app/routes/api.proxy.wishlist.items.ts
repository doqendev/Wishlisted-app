import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { verifyAppProxy, getProxyContext } from "../utils/proxy.server";
import { makeToken } from "../utils/token.server";

export async function action({ request }: ActionFunctionArgs) {
  if (!verifyAppProxy(request.url, process.env.SHOPIFY_API_SECRET!)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { shop, customerId } = getProxyContext(request.url);
  const { productGid, variantGid, wishlistId } = await request.json();

  let user = await prisma.appUser.findFirst({ where: { shop, customerGid: customerId ?? undefined } });
  if (!user) user = await prisma.appUser.create({ data: { shop, customerGid: customerId ?? undefined } });

  let list = wishlistId
    ? await prisma.wishlist.findUnique({ where: { id: wishlistId } })
    : await prisma.wishlist.findFirst({ where: { ownerId: user.id, shop } });

  if (!list) {
    list = await prisma.wishlist.create({ data: { ownerId: user.id, shop, shareToken: makeToken() } });
  }

  const item = await prisma.wishlistItem.upsert({
    where: { wishlistId_variantGid: { wishlistId: list.id, variantGid } },
    update: {},
    create: { wishlistId: list.id, productGid, variantGid },
  });

  return json({ ok: true, item, listId: list.id });
}



