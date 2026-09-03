import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireAdmin, AdminForbiddenError } from "@/lib/admin/require-admin.server";
import { resolveAdminRole } from "@/lib/admin/roles";
import { UnauthorizedError } from "@/lib/auth/verify.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const LIMIT = 200;

type Row = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan: string | null;
  status: string | null;
};

/**
 * Lista os usuários mais recentes (até 200) com o plano/status de billing
 * conhecido — join com user_entitlements, null quando o usuário nunca
 * iniciou um checkout. `?q=` filtra por substring de nome/e-mail.
 */
export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdmin();
        } catch (err) {
          if (err instanceof AdminForbiddenError) return json({ error: err.message }, 403);
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
        const sql = await getSql();
        const rows = q
          ? await sql.query<Row>(
              `select u.id, u.name, u.email, u."createdAt" as "createdAt",
                      e.plan, e.status
               from "user" u
               left join user_entitlements e on e.user_id = u.id
               where u.email ilike $1 or u.name ilike $1
               order by u."createdAt" desc
               limit $2`,
              [`%${q}%`, LIMIT],
            )
          : await sql.query<Row>(
              `select u.id, u.name, u.email, u."createdAt" as "createdAt",
                      e.plan, e.status
               from "user" u
               left join user_entitlements e on e.user_id = u.id
               order by u."createdAt" desc
               limit $1`,
              [LIMIT],
            );

        return json({
          users: rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            createdAt: r.createdAt,
            plan: r.plan ?? "free",
            status: r.status ?? "inactive",
            adminRole: resolveAdminRole(r.email),
          })),
        });
      },
    },
  },
});
