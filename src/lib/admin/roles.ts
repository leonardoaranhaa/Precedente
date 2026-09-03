/**
 * Roles de administração — lógica pura (sem DB), pra rodar em
 * `node --experimental-strip-types --test`.
 *
 * Sem UI de gestão por enquanto: quem é superadmin/desenvolvedor é definido
 * por lista de e-mails em variável de ambiente (SUPERADMIN_EMAILS /
 * DEVELOPER_EMAILS, separados por vírgula). Superadmin também conta como
 * desenvolvedor — é a role de maior privilégio, não uma categoria à parte.
 */

export type AdminRole = "superadmin" | "developer" | null;

function parseEmailList(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveAdminRole(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): AdminRole {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const superadmins = parseEmailList(env.SUPERADMIN_EMAILS);
  if (superadmins.has(normalized)) return "superadmin";

  const developers = parseEmailList(env.DEVELOPER_EMAILS);
  if (developers.has(normalized)) return "developer";

  return null;
}

export function isStaff(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return resolveAdminRole(email, env) !== null;
}

export function isSuperadmin(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return resolveAdminRole(email, env) === "superadmin";
}
