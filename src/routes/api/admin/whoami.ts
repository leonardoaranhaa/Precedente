import { createFileRoute } from "@tanstack/react-router";
import { getAdminUser } from "@/lib/admin/require-admin.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Nunca 403 — sempre 200 com role null quando o visitante não é staff. É o
 * endpoint que o cliente chama só pra decidir se mostra o link "Admin" no
 * menu; a proteção de verdade está em cada rota /api/admin/* que faz algo.
 */
export const Route = createFileRoute("/api/admin/whoami")({
  server: {
    handlers: {
      GET: async () => {
        const admin = await getAdminUser();
        return json({ role: admin?.role ?? null });
      },
    },
  },
});
