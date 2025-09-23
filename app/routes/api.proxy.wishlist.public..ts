import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const token = params.token!;
  const list = await prisma.wishlist.findFirst({
    where: { shareToken: token, isPublic: true },
    include: { items: true },
  });
  if (!list) return new Response("Not found", { status: 404 });
  return json({ list });
}

