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
  só pra quem quer sincronizar watch/histórico entre aparelhos (web, por
  enquanto — ver seção **Conta e sincronização**). Sem login, nada muda:
  100% local, como sempre foi. O único outro dado no servidor são as *push
  subscriptions* de alerta (tabela `push_subscriptions`, Postgres), que
  degradam para um fallback em memória quando não há banco configurado
  (preview/local).

## Estrutura do repositório

```
src/
  routes/
    index.tsx              # UI principal do web (única rota real da SPA)
    api/analyze.ts          # POST — roda a engine, usado pelo mobile
    api/universe.ts         # GET  — ranking de pares mais negociados
    api/push/register.ts    # POST/DELETE — registra token de push
    api/push/scan.ts        # POST — dispara avaliação + push (cron)
    api/auth/$.ts            # catch-all do Better Auth (/api/auth/*)
    api/billing/webhook.ts    # eventos do Stripe — única rota que escreve entitlement
    login.tsx                 # entrar/criar conta — só email/senha
  lib/
    analyze.ts               # validação de input + orquestra o pipeline
    rate-limit.ts             # rate limit em memória por IP
    sync.ts                   # server functions de sync (watch/histórico por conta)
    auth/                      # Better Auth pré-instalado — não editar (ver skill)
    billing/                    # entitlements + Stripe (checkout/portal) — nenhum gate ativo ainda
    market/
      precedent.ts            # o motor: fingerprint, matching, horizontes
      indicators.ts            # RSI (Wilder), SMA, percentil/mediana
      exchange.ts               # fetch de OHLCV na Binance
      onchain.ts                 # funding/OI (Binance Futures) + liquidez (DexScreener)
      scenario.ts                 # simulação hipotética de capital/alavancagem
      types.ts                     # tipos compartilhados do payload de análise
    push/                    # subscriptions, avaliação de alertas, envio via Expo
    watchlist.ts, history.ts # persistência local (localStorage) + sync opcional
  components/                # UI do resultado, watch, risk rail, cenário…

mobile/
  src/
    api.ts                  # cliente REST pro mesmo backend
    screens/                # Home, Resultado, Watch, Histórico, Alertas
    components/              # espelham os componentes web (RN + react-native-svg)
    watchlist.ts, history.ts # mesma persistência local, via AsyncStorage (sem login ainda)

migrations/                 # schema do Postgres (push_subscriptions, auth, sync, billing)
scripts/                    # build/dev/migrate/cron worker + testes de infra
AGENTS.md                   # contrato da plataforma (Grok App Builder) — não editar
```

## Rodando localmente

### Web

```bash
npm install
npm run dev        # http://localhost:8080
```

Sem `DATABASE_URL`, o app sobe sozinho num Postgres embutido (PGLite,
em memória) — dá pra desenvolver sem configurar nada. Sem
`ANTHROPIC_API_KEY`, a análise OHLC funciona normalmente; só a leitura de
print (visão) fica indisponível.

### Mobile

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://SEU-IP-NA-REDE:8080 npx expo start
```

Escaneie o QR code com o **Expo Go**. `localhost` não funciona a partir de um
celular físico — use o IP da sua máquina na rede local. Mais detalhes em
[`mobile/README.md`](mobile/README.md).

## Variáveis de ambiente

| Variável | Onde | Obrigatória? | Efeito |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | web | Não | Sem ela, a leitura de print (visão) fica indisponível; o resto do app funciona normalmente. |
| `ANTHROPIC_WORKSPACE_ID` | web | Não | Header opcional pra chaves vinculadas a um workspace. |
| `DATABASE_URL` | web | Não | Sem ela, cai no fallback PGLite (local/preview). Necessária pra push de alerta persistir de verdade em produção. |
| `PUSH_CRON_SECRET` | web + cron worker | **Sim em produção** | Protege `/api/push/scan`. Sem ela, o endpoint fica **fechado por padrão** quando há um banco real configurado (`DATABASE_URL` setado) — só fica aberto no fallback local sem banco. |
| `PUBLIC_APP_URL` / `SCAN_URL` | cron worker | Uma das duas | Pra onde `scripts/push-scan-cron.mjs` envia o POST do scan. |
| `NITRO_PRESET` | web (build) | Recomendado fora da Vercel | `node-server` para hosts Node genéricos (ex. Railway); default é `vercel`. |
| `EXPO_PUBLIC_API_BASE_URL` | mobile | Sim (fora do Expo Go em rede local) | URL pública do backend web que o mobile consome. |
| `BETTER_AUTH_URL` | web | **Sim, se login estiver ligado** | Origin público do próprio deploy (ex. `https://seu-app.up.railway.app`). Sem ela, a sessão só aceita `localhost`/preview do Grok — login real falha com "Invalid origin" em qualquer outro host. |
| `BETTER_AUTH_SECRET` | web | **Sim, se login estiver ligado** | Assina as sessões. Sem ela, cai num segredo aleatório por processo — todo deploy/restart derruba todo mundo logado. |
| `STRIPE_SECRET_KEY` | web | Não (ver **Assinatura premium**) | Sem ela, checkout/portal voltam "Pagamento indisponível" — erro limpo, não quebra o app. |
| `STRIPE_WEBHOOK_SECRET` | web | Junto com `STRIPE_SECRET_KEY` | Verifica a assinatura dos eventos do Stripe em `/api/billing/webhook`. |
| `STRIPE_PREMIUM_PRICE_ID` | web | Junto com `STRIPE_SECRET_KEY` | Price id do plano premium (criado no Stripe Dashboard). |
| `OPS_SECRET` | web | Não | Abre `GET /api/ops/analysis?days=N` (agregação de `analysis_log`: total de análises, quantas leituras de print, quanto custaram nos últimos N dias, e o estado dos circuit breakers de Binance/leitura visual). Sem ela, o endpoint fica **fechado por padrão**. Header `x-ops-secret` ou `Authorization: Bearer`. |
| `SENTRY_DSN` | web (servidor) | Não | Sem ela, erro inesperado no backend só cai no log da Railway, como sempre. Com ela, também vai pro Sentry (`src/lib/sentry.server.ts`). |
| `VITE_SENTRY_DSN` | web (navegador) | Não | Mesma coisa, lado cliente (`src/lib/sentry-client.ts`) — pode ser o mesmo DSN do servidor. |
| `EXPO_PUBLIC_SENTRY_DSN` | mobile | Não | Mesma coisa no app mobile (`mobile/src/sentry.ts`) — captura crash e exceção não tratada. |

## Conta e sincronização

Login é **opcional** e usa o [Better Auth](https://better-auth.com) que já vem
pré-instalado na plataforma (`src/lib/auth/`) — não é uma integração
paralela. Habilitado seguindo `.grok/skills/auth/SKILL.md` ("Turning sign-in
on"), mas só com **email/senha**: o app roda na Railway, não no deploy da
própria Grok, então o broker federado (Google/X, via `auth.grok.me`) não tem
como funcionar aqui — precisaria de credenciais de cliente que só a Grok
injeta no próprio pipeline de deploy dela. Email/senha é local a este app
(própria tabela `user` em Postgres, migrada de `migrations/auth/0001_auth.sql`)
e não depende de nada disso.

- **Sem login**: tudo exatamente como sempre foi — watch e histórico só no
  `localStorage`, nenhuma chamada extra.
- **Com login**: `user_sync_data` (`migrations/0002_user_sync_data.sql`)
  guarda um blob JSON por usuário por tipo (`watch` | `history`). No primeiro
  login, o que já existia localmente sobe pro servidor; num segundo aparelho
  (ou logins seguintes), o servidor manda — evita um aparelho velho
  sobrescrever o que já estava sincronizado. Toda mudança na watch/histórico
  depois disso sincroniza em segundo plano (`src/lib/sync.ts`,
  `createServerFn` + `authMiddleware`, escopado por `context.userId`).
- **Mobile**: login (email/senha) e sincronização funcionam igual ao web,
  contra o mesmo Better Auth (`mobile/src/auth.ts`, `mobile/src/sync.ts`).

## Assinatura premium

Infraestrutura de cobrança pronta, **mas nenhum recurso está travado ainda** —
com `STRIPE_SECRET_KEY` ausente, ninguém consegue virar premium de verdade
(o checkout falha com erro limpo), então travar qualquer coisa agora
deixaria o recurso inacessível pra todo mundo. Ativar um gate real é uma
decisão de produto separada, feita quando fizer sentido.

- **Schema**: `user_entitlements` (`migrations/0003_billing.sql`) — uma
  linha por usuário: `plan` (`free`/`premium`), `status`
  (`inactive`/`active`/`past_due`/`canceled`), ids do Stripe e
  `current_period_end`. Só o webhook escreve aqui.
- **`src/lib/billing/`**:
  - `entitlement-logic.ts` — `isEntitlementActive()`, lógica pura (sem
    import de banco) e testada (`entitlements.test.ts`).
  - `entitlements.ts` — acesso a dado (`getEntitlement`,
    `upsertEntitlement`, `hasPremium(userId)`) + `getMyEntitlement`
    (server function pro cliente saber o próprio plano).
  - `stripe.ts` — client Stripe sob demanda; sem chave, toda função lança
    "Pagamento indisponível" em vez de derrubar o app.
  - `checkout.ts` — `startPremiumCheckout` (cria/reusa o Customer, abre um
    Checkout Session de assinatura) e `openBillingPortal` (pra
    quem já assina gerenciar/cancelar).
- **`/api/billing/webhook`**: recebe `checkout.session.completed`,
  `customer.subscription.updated` e `customer.subscription.deleted`,
  verifica a assinatura (`STRIPE_WEBHOOK_SECRET`) e é a **única** rota que
  escreve em `user_entitlements` — o app nunca confia em nada que o
  cliente diga sobre o próprio plano.
- **UI**: menu de conta (`account-menu.tsx`) mostra o plano atual e um
  botão que abre o checkout ou o portal, dependendo do estado.

**Pra ligar de verdade**: criar o produto/price no Stripe Dashboard (ou via
MCP do Stripe), configurar as 3 env vars acima, apontar o webhook do Stripe
pra `/api/billing/webhook`, e decidir qual recurso passa a exigir
`hasPremium(userId)` — nenhum ainda exige.

## O motor de precedentes

`src/lib/market/precedent.ts` calcula, pro candle mais recente:

1. **Fingerprint**: bucket de RSI (faixas de 10 em 10), posição vs SMA20/50
   (`acima`/`abaixo`/`perto`), se está colado numa máxima/mínima de 20 barras,
   e a direção do candle.
2. **Matching**: varre o histórico (a partir da barra 50) procurando
   candles com o mesmo fingerprint, pontuando por quantos critérios batem
   (2 a 5). Prioriza match completo (score 5); se a amostra ficar pequena
   (< 12), relaxa o critério progressivamente e documenta o que foi
   relaxado.
3. **Horizontes**: para 5, 10 e 20 barras à frente de cada match, calcula
   retorno final (subiu/lateral/caiu), mediana/média/p10/p90, **e** o
   drawdown/runup máximo *no caminho* — não só no ponto final, que é o que
   de fato estressa uma posição alavancada.

`src/lib/market/indicators.ts` e `precedent.ts` têm testes unitários
(`*.test.ts`, rodados via `node --experimental-strip-types --test`) cobrindo
RSI conhecido, SMA, percentil/mediana e os invariantes do motor de matching.

## API

Todas as rotas em `src/routes/api/` são REST simples (CORS liberado — o
mobile chama de fora do navegador):

| Rota | Método | O que faz |
|---|---|---|
| `/api/analyze` | POST | Roda o pipeline completo (OHLC + precedentes + on-chain + visão opcional). Rate limit: 12 req / 5 min por IP. |
| `/api/universe` | GET | Ranking dos pares mais negociados na Binance (24h). |
| `/api/push/register` | POST/DELETE | Registra/remove um token de push (Expo) e seus watches/regras de alerta. |
| `/api/push/scan` | POST | Reavalia os pares de cada subscription e dispara push se algum alerta bater. Protegido por `X-Cron-Secret`. Chamado pelo `push-scan-cron` a cada 30 min. |

## Testes e validação

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint .
npm test              # scripts/*.test.mjs + testes TS (motor, rate-limit, auth)
npm run test:e2e       # Playwright — fluxo real de navegador contra o dev server
npm run build          # build de produção (Vite + Nitro) + migrate
```

No mobile: `cd mobile && npm run typecheck`.

`npm run test:e2e` sobe o `npm run dev` sozinho se nenhum já estiver rodando em
`localhost:8080` (ou reaproveita o que já estiver de pé). Roda contra a
Binance de verdade — sem mock — então precisa de rede. `.github/workflows/ci.yml`
roda typecheck/lint/testes unitários e a suíte E2E em todo PR e push em `main`.

## Deploy

Produção roda na Railway, três serviços no mesmo projeto:

- **`web`** — o app (Vite + Nitro, preset `node-server`), rastreando a
  branch `main`. Deploy automático a cada push/merge em `main`.
- **`Postgres`** — banco real (`push_subscriptions`); sem ele o app usa o
  fallback PGLite (funcional, mas não persiste entre deploys).
- **`push-scan-cron`** — serviço separado, sem tráfego HTTP, rodando
  `node scripts/push-scan-cron.mjs` a cada 30 min (`cronSchedule`), também a
  partir de `main`.

Alternativa ao cron nativo da Railway: `.github/workflows/push-scan.yml`
(GitHub Actions), documentado em [`docs/push-alerts.md`](docs/push-alerts.md).

## Sobre o `AGENTS.md`

Este repositório nasceu na plataforma **Grok App Builder**; `AGENTS.md` na
raiz é o contrato dessa plataforma (não um guia de contribuição do
Precedente) — define coisas como o preset de deploy padrão (Vercel), o
branding injetado em toda página, e arquivos que nunca devem ser apagados
(`server/`, `scripts/grok-pwa-*`, `public/__grok/`). Ele não deve ser editado
como parte do desenvolvimento normal do produto.
