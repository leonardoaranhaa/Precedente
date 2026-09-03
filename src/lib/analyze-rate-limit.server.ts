import { getRequest } from "@tanstack/react-start/server";
import { clientIp } from "./rate-limit";
import { assertAnalyzeQuota } from "./analyze-rate-limit-logic";

/**
 * Server-only rate limit for `runAnalysis`, shared by both call sites
 * (`/api/analyze` REST route and the `analyzeSetup` server function that the
 * web app actually calls — the server function had no route-level guard of
 * its own, so without this it bypassed rate limiting entirely). Quota logic
 * itself lives in `analyze-rate-limit-logic.ts` (framework-free, unit tested);
 * this file only wires it to the real incoming request.
 */
export async function assertAnalyzeRateLimit(hasImage: boolean): Promise<void> {
  const request = getRequest();
  if (!request) return; // no request context (tests) — nothing to throttle

  // The push-scan cron calls `runAnalysis` once per (subscription × watch) inside a
  // single authenticated `/api/push/scan` request — easily dozens of calls sharing
  // one IP. It is already gated by `PUSH_CRON_SECRET` (see that route's `authorized`
  // check), so it is not the abuse vector this limiter exists for; exempt it instead
  // of having a trusted internal batch job trip its own users' quota.
  const cronSecret = process.env.PUSH_CRON_SECRET;
  if (cronSecret) {
    const header =
      request.headers.get("x-cron-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header === cronSecret) return;
  }

  // Staff (superadmin/developer) precisa poder martelar Analisar durante
  // teste sem esbarrar no limite pensado pra tráfego anônimo por IP.
  const { getSessionUser } = await import("./auth/verify.server");
  const { isStaff } = await import("./admin/roles");
  const session = await getSessionUser().catch(() => null);
  if (isStaff(session?.email)) return;

  assertAnalyzeQuota(hasImage, clientIp(request));
}
