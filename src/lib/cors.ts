function appOrigin(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:8080").replace(/\/+$/, "");
}

export function publicCorsHeaders(methods = "GET, OPTIONS"): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function authCorsHeaders(methods = "POST, OPTIONS"): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": appOrigin(),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function cronCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": appOrigin(),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
  };
}
