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
- **Persistência**: watchlist e histórico ficam só no aparelho
  (`localStorage` no web, `AsyncStorage` no mobile) — não há conta de
  usuário. O único dado no servidor são as *push subscriptions* de alerta
  (tabela `push_subscriptions`, Postgres), que degradam para um fallback em
  memória quando não há banco configurado (preview/local).

## Estrutura do repositório

```
src/
  routes/
    index.tsx              # UI principal do web (única rota real da SPA)
    api/analyze.ts          # POST — roda a engine, usado pelo mobile
    api/universe.ts         # GET  — ranking de pares mais negociados
    api/push/register.ts    # POST/DELETE — registra token de push
    api/push/scan.ts        # POST — dispara avaliação + push (cron)
  lib/
    analyze.ts               # validação de input + orquestra o pipeline
    rate-limit.ts             # rate limit em memória por IP
    market/
      precedent.ts            # o motor: fingerprint, matching, horizontes
      indicators.ts            # RSI (Wilder), SMA, percentil/mediana
      exchange.ts               # fetch de OHLCV na Binance
      onchain.ts                 # funding/OI (Binance Futures) + liquidez (DexScreener)
      scenario.ts                 # simulação hipotética de capital/alavancagem
      types.ts                     # tipos compartilhados do payload de análise
    push/                    # subscriptions, avaliação de alertas, envio via Expo
    watchlist.ts, history.ts # persistência local (localStorage)
  components/                # UI do resultado, watch, risk rail, cenário…

mobile/
  src/
    api.ts                  # cliente REST pro mesmo backend
    screens/                # Home, Resultado, Watch, Histórico, Alertas
    components/              # espelham os componentes web (RN + react-native-svg)
    watchlist.ts, history.ts # mesma persistência local, via AsyncStorage

migrations/                 # schema do Postgres (push_subscriptions)
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
npm run build          # build de produção (Vite + Nitro) + migrate
```

No mobile: `cd mobile && npm run typecheck`.

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
