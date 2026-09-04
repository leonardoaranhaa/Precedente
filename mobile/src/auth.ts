import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";

/**
 * Login é opcional — o app inteiro funciona sem conta, exatamente como no
 * web. Conta serve só pra sincronizar watch/histórico entre aparelhos e pra
 * assinar o plano premium.
 *
 * Better Auth (o mesmo backend do web, src/lib/auth/) já expõe suas próprias
 * rotas REST em /api/auth/* e já roda com o plugin `bearer()` habilitado —
 * então em vez de lidar com cookies (React Native não tem cookie jar de
 * navegador), guardamos o `token` que o corpo da resposta de login/cadastro
 * devolve e mandamos como `Authorization: Bearer <token>` em toda chamada
 * autenticada (sync, billing).
 */

const TOKEN_KEY = "precedente.auth.token";
const USER_KEY = "precedente.auth.user";

export type AuthUser = { id: string; name: string; email: string };

type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };

// Cache em memória — fonte de verdade pra sessão atual. SecureStore só
// existe pra sobreviver a um restart do app; se falhar (aparelho sem
// keystore utilizável, por exemplo), a sessão em curso continua funcionando
// normalmente, só não sobrevive a fechar e reabrir o app.
let memToken: string | null = null;
let memUser: AuthUser | null = null;

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* melhor esforço — a sessão em memória já cobre o restante desta execução */
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

async function persist(token: string, user: AuthUser): Promise<void> {
  memToken = token;
  memUser = user;
  await safeSet(TOKEN_KEY, token);
  await safeSet(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  if (memToken) return memToken;
  const stored = await safeGet(TOKEN_KEY);
  memToken = stored;
  return stored;
}

export async function getStoredUser(): Promise<AuthUser | null> {
  if (memUser) return memUser;
  const raw = await safeGet(USER_KEY);
  if (!raw) return null;
  try {
    memUser = JSON.parse(raw) as AuthUser;
    return memUser;
  } catch {
    return null;
  }
}

async function callAuthEndpoint(path: string, body: unknown): Promise<AuthResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Falha de rede. Confira sua conexão." };
  }

  const json = (await response.json().catch(() => null)) as
    | { token?: string; user?: { id: string; name: string; email: string }; message?: string }
    | null;

  if (!response.ok || !json?.token || !json.user) {
    return { ok: false, error: json?.message ?? "Não deu pra continuar. Confira os dados." };
  }

  const user: AuthUser = { id: json.user.id, name: json.user.name, email: json.user.email };
  await persist(json.token, user);
  return { ok: true, user };
}

export function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  return callAuthEndpoint("sign-up/email", { name, email, password });
}

export function signIn(email: string, password: string): Promise<AuthResult> {
  return callAuthEndpoint("sign-in/email", { email, password });
}

export async function signOut(): Promise<void> {
  const token = await getToken();
  if (token) {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: "{}",
    }).catch(() => {});
  }
  memToken = null;
  memUser = null;
  await safeDelete(TOKEN_KEY);
  await safeDelete(USER_KEY);
}

/** Header pronto pra chamadas autenticadas — `{}` quando não há sessão. */
export async function currentAuthHeader(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? authHeaders(token) : {};
}

type SimpleResult = { ok: true } | { ok: false; error: string };

export async function updateName(name: string): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Entre na sua conta primeiro." };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/update-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ name }),
    });
  } catch {
    return { ok: false, error: "Falha de rede. Confira sua conexão." };
  }
  const json = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) return { ok: false, error: json?.message ?? "Não deu pra salvar." };
  if (memUser) {
    memUser = { ...memUser, name };
    await safeSet(USER_KEY, JSON.stringify(memUser));
  }
  return { ok: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Entre na sua conta primeiro." };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    return { ok: false, error: "Falha de rede. Confira sua conexão." };
  }
  const json = (await response.json().catch(() => null)) as { message?: string; token?: string } | null;
  if (!response.ok) return { ok: false, error: json?.message ?? "Não deu pra trocar a senha." };
  if (json?.token) {
    memToken = json.token;
    await safeSet(TOKEN_KEY, json.token);
  }
  return { ok: true };
}
