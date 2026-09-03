import { createFileRoute } from "@tanstack/react-router";
import { listFeatureFlags, setFeatureFlag } from "@/lib/admin/feature-flags.server";
import { billingGatesEnabled } from "@/lib/billing/plan-limits";
import { requireAdmin, AdminForbiddenError } from "@/lib/admin/require-admin.server";
import { UnauthorizedError } from "@/lib/auth/verify.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Toda flag que o painel sabe mostrar mesmo sem linha na tabela ainda — chave + default (env var). */
const KNOWN_FLAGS: { key: string; label: string; defaultValue: boolean }[] = [
  {
    key: "billing_gates_enabled",
    label: "Gates de Premium (zonas, cota de visão, limite de watch)",
    defaultValue: billingGatesEnabled(),
  },
];

export const Route = createFileRoute("/api/admin/flags")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdmin();
        } catch (err) {
          if (err instanceof AdminForbiddenError) return json({ error: err.message }, 403);
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        const stored = await listFeatureFlags();
        const byKey = new Map(stored.map((f) => [f.key, f]));
        const flags = KNOWN_FLAGS.map((known) => {
          const row = byKey.get(known.key);
          return {
            key: known.key,
            label: known.label,
            enabled: row?.enabled ?? known.defaultValue,
            source: row ? "painel" : "env var (BILLING_GATES_ENABLED)",
            updatedAt: row?.updatedAt ?? null,
            updatedBy: row?.updatedBy ?? null,
          };
        });
        return json({ flags });
      },
      POST: async ({ request }) => {
        let admin;
        try {
          admin = await requireAdmin("superadmin");
        } catch (err) {
          if (err instanceof AdminForbiddenError) return json({ error: err.message }, 403);
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (esperado JSON)." }, 400);
        }
        const raw = body as Record<string, unknown>;
        const key = typeof raw.key === "string" ? raw.key : "";
        const enabled = raw.enabled === true;
        if (!KNOWN_FLAGS.some((f) => f.key === key)) {
          return json({ error: "Flag desconhecida." }, 400);
        }

        const flag = await setFeatureFlag(key, enabled, admin.email);
        return json({ ok: true, flag });
      },
    },
  },
});
