import crypto from "crypto";

export function verifyAppProxy(urlString: string, secret: string): boolean {
  const url = new URL(urlString);
  const hmac = url.searchParams.get("hmac") || "";
  const params = new URLSearchParams(url.searchParams);
  params.delete("hmac"); params.delete("signature");
  const digest = crypto.createHmac("sha256", secret).update(params.toString()).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac)); } catch { return false; }
}

export function getProxyContext(urlString: string) {
  const url = new URL(urlString);
  return {
    shop: url.searchParams.get("shop") || "",
    customerId: url.searchParams.get("logged_in_customer_id"),
  };
}
