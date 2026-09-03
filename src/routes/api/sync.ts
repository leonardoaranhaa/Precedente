import { createFileRoute } from "@tanstack/react-router";
import { getSyncDataFor, setSyncDataFor } from "@/lib/sync";
import { assertSyncPayload, InvalidSyncPayloadError, isSyncKind } from "@/lib/sync-limits";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";

/**
 * REST wrapper (mesma lógica de src/lib/sync.ts) pra quem não fala o
 * protocolo interno de server functions do TanStack Start — hoje só o app
 * mobile (Expo). Autenticado por `Authorization: Bearer <token da sessão>`,
 * o mesmo token que a Better Auth já devolve no login/cadastro (plugin
 * `bearer()`, já registrado em src/lib/auth/server.ts).
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        const kind = new URL(request.url).searchParams.get("kind");
        if (!isSyncKind(kind)) {
          return json({ error: "Tipo de sincronização inválido." }, 400);
        }

        const data = await getSyncDataFor(userId, kind);
        return json({ data });
      },
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (esperado JSON)." }, 400);
        }

        const input = body as { kind?: unknown; data?: unknown };
        let kind;
        try {
          kind = assertSyncPayload(input?.kind, input?.data);
        } catch (err) {
          if (err instanceof InvalidSyncPayloadError) {
            return json({ error: err.message }, err.status);
          }
          throw err;
        }

        await setSyncDataFor(userId, kind, input.data);
        return json({ ok: true });
      },
    },
  },
});
