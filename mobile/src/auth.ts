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

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function persist(token: string, user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
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
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/** Header pronto pra chamadas autenticadas — `{}` quando não há sessão. */
export async function currentAuthHeader(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? authHeaders(token) : {};
}
