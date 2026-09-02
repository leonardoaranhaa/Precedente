import { definePlugin } from "nitro";
import { reportServerError } from "../../src/lib/sentry.server";

/**
 * Rede de segurança: captura qualquer erro que escape das rotas REST (que já
 * reportam com contexto próprio) — erro de middleware, de server function, etc.
 */
export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("error", (error: Error) => {
    reportServerError(error, { source: "nitro" });
  });
});
