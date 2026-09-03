/**
 * Guarda de acesso admin (server-only) — resolve a sessão real via
 * getSessionUser() e checa o e-mail contra as listas de
 * SUPERADMIN_EMAILS/DEVELOPER_EMAILS. Nunca confia em role vindo do cliente.
 */
import { getSessionUser } from "../auth/verify.server";
import { type AdminRole, resolveAdminRole } from "./roles";

export type AdminUser = { id: string; email: string; role: AdminRole };

export class AdminForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Acesso restrito à equipe.") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

/** Sessão + role admin do request atual, ou null se não for staff (ou não estiver logado). */
export async function getAdminUser(): Promise<AdminUser | null> {
  const session = await getSessionUser();
  if (!session?.email) return null;
  const role = resolveAdminRole(session.email);
  if (!role) return null;
  return { id: session.id, email: session.email, role };
}

/**
 * Exige uma role admin (qualquer uma, por padrão) — lança AdminForbiddenError
 * (403) se a sessão não for staff, ou se `minRole: "superadmin"` for pedido
 * e o usuário for só "developer".
 */
export async function requireAdmin(minRole?: "superadmin"): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) throw new AdminForbiddenError();
  if (minRole === "superadmin" && admin.role !== "superadmin") {
    throw new AdminForbiddenError("Essa ação exige acesso de superadmin.");
  }
  return admin;
}
