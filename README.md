# Precedente

Apoio a trade baseado em **frequência histórica**, não em sinais. Você informa
um par e um tempo gráfico (opcionalmente um print do gráfico); o Precedente
calcula o "fingerprint" técnico do momento atual (RSI, posição vs SMA20/50,
proximidade de extremos de 20 barras, direção do candle), procura no
histórico real da Binance quantas vezes esse mesmo fingerprint já ocorreu, e
mostra o que aconteceu depois — incluindo o *caminho* até lá (drawdown/runup),
não só o resultado final.

**Nunca recomenda comprar, vender, entrar ou sair.** É estatística de
precedentes e risco de caminho, não uma recomendação.

Existem dois clientes sobre o mesmo motor: um app **web** (TanStack Start) e
um app **mobile** (Expo/React Native), ambos consumindo a mesma engine de
análise via `POST /api/analyze`.

---

## Arquitetura

```
                    ┌─────────────────────────┐
                    │   Binance REST (klines)  │
                    └───────────┬─────────────┘
                                │
  ┌──────────┐   POST/GET   ┌──▼────────────────────┐   ┌─────────────────┐
  │  Web app │◄────────────►│  src/routes/api/*.ts   │──►│ Anthropic Vision │
  │ (TanStack│  server fns  │  (REST + server fns)   │   │ (leitura do print)│
  │  Start)  │              │                        │   └─────────────────┘
  └──────────┘              │  src/lib/analyze.ts    │──►┌─────────────────┐
                             │  src/lib/market/*.ts   │   │ DexScreener /    │
  ┌──────────┐   POST/GET   │  (motor de precedentes)│   │ Binance Futures  │
  │  Mobile  │◄────────────►│                        │   │ (on-chain/funding)│
  │  (Expo)  │              └──────────┬─────────────┘   └─────────────────┘
  └──────────┘                         │
                             ┌─────────▼─────────┐
                             │  Postgres (Neon /  │
                             │  Railway) — push   │
                             │  subscriptions só   │
                             │  (PGLite fallback   │
                             │  local/preview)     │
                             └────────────────────┘
```

- **Web** (`src/`) é ao mesmo tempo o frontend (React 19 + TanStack Router) e
  o backend: o motor de análise roda em `createServerFn` (chamado direto pelo
  próprio web app) **e** é exposto como REST (`src/routes/api/analyze.ts`)
  para o mobile e qualquer outro cliente.
- **Mobile** (`mobile/`) não tem lógica de análise própria — é um cliente Expo
  puro que chama a mesma API REST do web (`mobile/src/api.ts`).
- **Persistência**: watchlist e histórico ficam por padrão só no aparelho
  (`localStorage` no web, `AsyncStorage` no mobile) — **conta é opcional**,
  só pra quem quer sincronizar watch/histórico entre aparelhos. Sem login,
  nada muda: 100% local. O único outro dado no servidor são as *push
  subscriptions* de alerta (tabela `push_subscriptions`, Postgres), que
  degradam para um fallback em memória quando não há banco configurado
  (preview/local).

## Estrutura do repositório

```
src/
  routes/
    index.tsx              # UI principal do web
    api/analyze.ts          # POST — engine (mobile + web REST)
    api/universe.ts         # GET  — ranking de pares
    api/push/register.ts    # POST/DELETE — token de push + watches
    api/push/scan.ts        # POST — cron de alertas
    api/auth/$.ts            # Better Auth
    api/billing/webhook.ts    # Stripe → user_entitlements
    login.tsx
  lib/
    analyze.ts
    billing/
      entitlement-logic.ts / entitlements.ts / stripe.ts / checkout.ts
      plan-limits.ts          # cotas free/premium + assertPremiumFeature
      assert-premium.server.ts
      vision-quota.ts         # cota diária de print (memória)
    market/                   # motor de precedentes
    push/
  components/

mobile/                     # Expo — cliente REST do mesmo backend
migrations/
scripts/
AGENTS.md                   # contrato Grok App Builder — não editar
```

## Rodando localmente

### Web

```bash
npm install
npm run dev        # http://localhost:8080
```

Sem `DATABASE_URL`, o app sobe com PGLite em memória. Sem
`ANTHROPIC_API_KEY`, análise OHLC funciona; só a leitura de print fica
indisponível.

### Mobile

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://SEU-IP-NA-REDE:8080 npx expo start
```

Detalhes em [`mobile/README.md`](mobile/README.md).

## Variáveis de ambiente

| Variável | Onde | Obrigatória? | Efeito |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | web | Não | Leitura de print (visão). |
| `ANTHROPIC_WORKSPACE_ID` | web | Não | Header opcional de workspace. |
| `DATABASE_URL` | web | Não | Sem ela, PGLite. |
| `PUSH_CRON_SECRET` | web + cron | **Sim em produção** | Protege `/api/push/scan`. |
| `PUBLIC_APP_URL` / `SCAN_URL` | cron | Uma das duas | URL do POST de scan. |
| `NITRO_PRESET` | web (build) | Recomendado fora Vercel | `node-server` na Railway. |
| `EXPO_PUBLIC_API_BASE_URL` | mobile | Sim em device | Backend web. |
| `BETTER_AUTH_URL` | web | Se login ligado | Origin público do deploy. |
| `BETTER_AUTH_SECRET` | web | Se login ligado | Assina sessões. |
| `STRIPE_SECRET_KEY` | web | Não | Sem ela, checkout indisponível (erro limpo). |
| `STRIPE_WEBHOOK_SECRET` | web | Com Stripe | Assinatura do webhook. |
| `STRIPE_PREMIUM_PRICE_ID` | web | Com Stripe | Price do plano premium. |
| `BILLING_GATES_ENABLED` | web | Não | `true`/`1` liga gates de plano (watch/zonas/vision). **Default off** — ninguém fica bloqueado sem Stripe configurado. |
| `OPS_SECRET` | web | Não | Abre `GET /api/ops/analysis`. |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | web | Não | Erros no Sentry. |
| `EXPO_PUBLIC_SENTRY_DSN` | mobile | Não | Crash/JS no Sentry. |

## Conta e sincronização

Login **opcional** (Better Auth, email/senha). Sem conta: watch/histórico só
locais. Com conta: sync em `user_sync_data` (web + mobile).

## Assinatura premium

Infraestrutura Stripe pronta (`user_entitlements`, checkout, portal, webhook).
**Gates de produto só enforçam com `BILLING_GATES_ENABLED=true`.**

### `assertPremiumFeature` / cotas (`src/lib/billing/plan-limits.ts`)

| Plano | Watch (alertas) | Zonas preço/RSI | Vision (print) / dia UTC |
|-------|-----------------|-----------------|---------------------------|
| Free | até **3** pares | não | **2** (exige login) |
| Premium | até **24** | sim | **10** |

- `assertPremiumFeature(isPremium, feature, opts)` — pura, testável; no-op se gates off.
- `assertPremiumFeatureForUser(userId, feature, opts)` — resolve `hasPremium` no servidor.
- Pontos de enforcement: `POST /api/push/register` (watch + zonas), `setSyncData` kind=watch, `runAnalysis` com print.
- Copy dos erros **não** usa linguagem de ordem de compra/venda.

**Pra ligar de verdade:** Stripe configurado → webhook ok → `BILLING_GATES_ENABLED=true` na Railway.

## O motor de precedentes

Ver `src/lib/market/precedent.ts` (fingerprint, matching com dedupe, horizontes
com drawdown/runup, baseline). Testes em `*.test.ts` via `npm run test:unit`.

## API

| Rota | Método | O que faz |
|---|---|---|
| `/api/analyze` | POST | Pipeline completo. Rate limit + gates de vision se flag on. |
| `/api/universe` | GET | Ranking 24h Binance. |
| `/api/push/register` | POST/DELETE | Token Expo + watches (gates de watch/zonas se flag on). |
| `/api/push/scan` | POST | Avalia alertas; `X-Cron-Secret`. |

## Testes e validação

```bash
npm run typecheck
npm run lint
npm run test:unit   # produto (inclui plan-limits)
npm run test:e2e
npm run build
```

CI: `.github/workflows/ci.yml` em todo PR e push em `main`.

## Deploy

Railway: serviços `web` + Postgres + `push-scan-cron` a partir de `main`.

## Sobre o `AGENTS.md`

Contrato da plataforma **Grok App Builder**, não guia de contribuição do
Precedente — não editar no desenvolvimento normal do produto.
