import crypto from "crypto";

export function verifyAppProxy(urlString: string, secret: string): boolean {
  // Shopify App Proxy signs requests by appending a `signature` query param.
  // The signature is an HMAC-SHA256 of the *sorted, concatenated* query params
  // (excluding `signature` itself), formatted as `key=value` with multiple values
  // joined by comma, and then concatenated *without separators*.
  // Ref: https://shopify.dev/apps/build/online-store/display-dynamic-data
  const url = new URL(urlString);
  const signature = url.searchParams.get('signature') || '';
  if (!signature) return false;
  const params = new URLSearchParams(url.searchParams);
  params.delete('signature');

  // Build sorted concatenation per docs
  const entries: [string, string][] = [];
  // Collect keys and aggregate multiple values by comma, unencoded
  const byKey: Record<string, string[]> = {};
  params.forEach((value, key) => {
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(value);
  });
  Object.keys(byKey).sort().forEach((key) => {
    const joined = byKey[key].join(',');
    entries.push([key, joined]);
  });
  const message = entries.map(([k, v]) => `${k}=${v}`).join(''); // no separators
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function getProxyContext(urlString: string) {
  const url = new URL(urlString);
  return {
    shop: url.searchParams.get("shop") || "",
    customerId: url.searchParams.get("logged_in_customer_id"),
  };
}
