import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { verifyAppProxy, getProxyContext } from "../utils/proxy.server";
import { makeToken } from "../utils/token.server";

/**
 * POST /apps/wishlisted/wishlist/share
 * Body: { makePublic?: boolean, rotate?: boolean }
 * - makePublic: when provided, sets list.isPublic to this value
 * - rotate: if true, rotates shareToken (returns the new one)
 *
 * Returns: { ok: true, list: { id, isPublic, shareToken } }
 */
export async function action({ request }: ActionFunctionArgs) {
  if (!verifyAppProxy(request.url, process.env.SHOPIFY_API_SECRET!)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { shop, customerId } = getProxyContext(request.url);
  const body = await request.json().catch(() => ({}));
  const makePublic = typeof body.makePublic === 'boolean' ? body.makePublic : undefined;
  const rotate = !!body.rotate;

  let user = await prisma.appUser.findFirst({ where: { shop, customerGid: customerId ?? undefined } });
  if (!user) {
    user = await prisma.appUser.create({ data: { shop, customerGid: customerId ?? undefined } });
  }
  let list = await prisma.wishlist.findFirst({ where: { ownerId: user.id, shop } });
  if (!list) {
    list = await prisma.wishlist.create({ data: { ownerId: user.id, shop, shareToken: makeToken() } });
  }

  const data: { isPublic?: boolean; shareToken?: string } = {};
  if (makePublic !== undefined) data.isPublic = makePublic;
  if (rotate || !list.shareToken) data.shareToken = makeToken();

  if (Object.keys(data).length) {
    list = await prisma.wishlist.update({ where: { id: list.id }, data });
  }

  return json({ ok: true, list: { id: list.id, isPublic: list.isPublic, shareToken: list.shareToken } });
}
