const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://dd.dexscreener.com",
  "connect-src 'self' https://api.binance.com https://fapi.binance.com https://api.dexscreener.com https://*.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

interface SecurityEvent {
  url: URL;
  req: { method: string };
}

export default async function securityHeaders(
  event: SecurityEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (
    result instanceof Response &&
    String(result.headers.get("content-type") ?? "").includes("text/html")
  ) {
    const headers = new Headers(result.headers);
    headers.set("Content-Security-Policy", CSP);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  }
  return result;
}
