# Acesso admin — Precedente

## Visão

Painel web em `/admin` para **superadmin** e **developer**. Sem tabela de
roles no banco — o acesso é resolvido só a partir de duas env vars.

## Configurar acesso

| Variável | Valor |
|----------|-------|
| `SUPERADMIN_EMAILS` | lista separada por vírgula, ex. `ana@time.com,bruno@time.com` |
| `DEVELOPER_EMAILS` | idem, para o role `developer` |

Comparação case-insensitive e com espaços ignorados. Se o mesmo e-mail
aparecer nas duas listas, vale `superadmin`. Sem nenhuma das duas
configuradas, ninguém tem acesso — o link "Painel admin" simplesmente não
aparece no menu de conta e `/admin` mostra a mensagem de acesso negado.

Pra dar acesso a alguém: a pessoa cria conta normal (e-mail/senha ou
OAuth) e você adiciona o e-mail dela numa das duas variáveis no Railway,
depois redeploy. Não existe UI pra promover usuário a admin — é
deliberado, por ser a superfície de mais risco do painel.

## O que cada role pode

| Capacidade | `developer` | `superadmin` |
|---|---|---|
| Ver usuários e assinaturas (`Usuários`) | ✅ | ✅ |
| Conceder/revogar Premium manualmente | ❌ | ✅ |
| Ver estado das feature flags (`Config`) | ✅ | ✅ |
| Alterar feature flags | ❌ | ✅ |
| Ver métricas e saúde (`Saúde`) | ✅ | ✅ |
| Bypass de gates de Premium e rate limit do `/api/analyze` | ✅ | ✅ |

O bypass de staff é automático: qualquer sessão logada com um e-mail nas
duas listas passa por `assertPremiumFeatureForUser` e
`assertAnalyzeRateLimit` como se fosse Premium/sem limite — sem precisar
de assinatura Stripe real. É pra poder testar as features pagas sem
fricção; não é um plano "vitalício" nem aparece como Premium pro resto do
sistema (o menu de conta continua mostrando "Plano gratuito" pra quem não
tiver `user_entitlements` ativo).

## Painel `/admin`

Três abas:

- **Usuários** — lista (até 200, mais recentes primeiro) com plano,
  desde-quando, role admin (se houver) e busca por nome/e-mail. Botão
  "Conceder Premium" / "Revogar Premium" só aparece pra `superadmin`.
- **Config** — feature flags conhecidas (hoje só `billing_gates_enabled`).
  `developer` vê o estado; só `superadmin` alterna o switch.
- **Saúde** — volume de análises e custo de visão nos últimos 7 dias,
  pares mais analisados, estado dos circuit breakers. Reaproveita o
  endpoint `/api/ops/analysis` (mesmo usado pra auditoria via
  `OPS_SECRET`), agora também aceitando sessão admin autenticada.
  **Não inclui log de erro (Sentry)** — isso só existe direto no Sentry
  hoje, não há API de consulta ligada ao app.

## Conceder/revogar Premium manualmente

`POST /api/admin/grant-premium` (`superadmin` apenas), body
`{"userId": "...", "grant": true|false}`. Escreve direto em
`user_entitlements`. É um **override manual**, não permanente: se o
usuário tiver assinatura Stripe real, o próximo evento de webhook
(renovação, cancelamento etc.) sobrescreve o que foi setado manualmente.
Serve pra: dar acesso de cortesia, revogar acesso por abuso, ou testar o
comportamento Premium sem passar pelo Stripe.

## Feature flags no banco

Tabela `admin_feature_flags` (migration `migrations/0006_admin.sql`) —
`key`, `enabled`, `updated_at`, `updated_by`. Hoje só uma flag conhecida:

| Flag | Efeito quando desligada |
|------|--------------------------|
| `billing_gates_enabled` | Todo mundo vira "free" pra fins de gate de Premium — equivalente a rodar com `BILLING_GATES_ENABLED=false`, mas sem precisar redeploy |

Sem linha na tabela pra uma flag, o valor cai pro que já existia antes
(env var `BILLING_GATES_ENABLED`, avaliada em `plan-limits.ts`) — ligar o
painel não muda nada pra quem nunca mexeu na flag.

## Rotas

| Método | Rota | Auth |
|--------|------|------|
| `GET` | `/api/admin/whoami` | qualquer um (sempre 200; `{role: null}` se não for staff) |
| `GET` | `/api/admin/users` | staff (`developer` ou `superadmin`) |
| `GET` | `/api/admin/flags` | staff |
| `POST` | `/api/admin/flags` | `superadmin` |
| `POST` | `/api/admin/grant-premium` | `superadmin` |

## Testar localmente

```bash
SUPERADMIN_EMAILS="voce@exemplo.com" npm run dev
```

Crie conta com esse e-mail exato em `/login` (ou faça login se já
existir) e o link "Painel admin" aparece no menu de conta.
