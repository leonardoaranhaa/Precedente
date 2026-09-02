# AUDIT.md — Precedente

Auditoria externa do repositório `leonardoaranhaa/Precedente` no commit `d9d1cff`
(deploy Railway `web` = SUCCESS, 2026-09-02).

Feita por leitura completa do código, da configuração de produção na Railway e
dos screenshots do repo. **Não** houve teste no app ao vivo — a rede do
ambiente de auditoria não alcança `*.up.railway.app`. Todo item marcado
`[VERIFICAR NO AR]` precisa de confirmação manual no deploy antes de virar
trabalho.

Cada item tem: **ID**, severidade, arquivos, o problema, o critério de aceite.
O critério de aceite é o que decide se está feito — não a descrição do fix.

---

## Ordem sugerida de ataque

| # | ID | Por quê agora |
|---|---|---|
| 1 | `SEC-01` | Chave paga da Anthropic exposta sem limite. Custo real, hoje. |
| 2 | `SEC-02` | Escrita ilimitada no Postgres por usuário logado. |
| 3 | `OPS-01` | Sem telemetria não dá pra precificar nada. Bloqueia o Stripe. |
| 4 | `ENG-01` + `ENG-02` | O número que o produto inteiro vende está inflado. |
| 5 | `LEG-01` | Precisa existir antes do primeiro pagante, não depois. |
| 6 | `ARQ-01` | O público-alvo (APK) não alcança a monetização. |
| 7 | `SCALE-01` | Quebra sozinho por volta de ~100 assinantes de alerta. |

---

## 🔴 SEC-01 — `analyzeSetup` roda sem rate limit

**Arquivos:** `src/lib/analyze.ts:209`, `src/routes/api/analyze.ts`

`/api/analyze` aplica `checkRateLimit` (12 req / 5 min por IP). Mas o app web
não usa essa rota: ele chama `analyzeSetup`, uma `createServerFn`, que o
TanStack Start expõe como endpoint HTTP próprio — sem auth e **sem passar pelo
rate limiter**. É por esse caminho que `readChart()` roda, com
`model: "claude-opus-5"` e `max_tokens: 16000`.

Consequência: qualquer pessoa abre o DevTools, copia a chamada da server
function e faz um loop contra a chave paga da Anthropic. O rate limit atual
protege a porta que ninguém usa.

**Fix:** mover o guard pra dentro de `runAnalysis` (ou do handler da server
function), de modo que os dois caminhos — REST e server fn — compartilhem o
mesmo limitador. Considerar limite mais apertado quando `imageDataUrl != null`
(a chamada cara) do que na análise OHLC pura (barata).

**Aceite:**
- Um teste prova que N+1 chamadas consecutivas a `analyzeSetup` retornam erro
  de limite, sem tocar a Anthropic.
- Chamada com print e chamada sem print têm cotas separadas.
- `/api/analyze` continua funcionando com o mesmo comportamento de hoje.

---

## 🟠 SEC-02 — `setSyncData` aceita qualquer coisa, de qualquer tamanho

**Arquivo:** `src/lib/sync.ts:9,22`

Os dois validators são identidade:

```ts
.validator((kind: SyncKind) => kind)
.validator((input: { kind: SyncKind; data: unknown }) => input)
```

O tipo é só TypeScript — em runtime nada é checado. `kind` pode ser qualquer
string (grava linhas de tipos inventados em `user_sync_data`) e `data` não tem
limite de tamanho. Um usuário logado grava dezenas de MB de JSON em uma
requisição. A query é parametrizada, então não há injection — o problema é
volume e integridade.

Secundário, mesmo arquivo: em `src/routes/index.tsx` os `useEffect` de `watch`
e `history` chamam `setSyncData` a cada mudança, reescrevendo o blob inteiro.
Write amplification desnecessária no Postgres.

**Fix:** validar `kind` contra `["watch","history"]` explicitamente; impor teto
de bytes no `data` serializado (o `MAX` local já é 20 histórico / 24 watch —
derivar o teto disso com folga); debounce nos efeitos de sync.

**Aceite:**
- `kind` fora da lista → erro, nada escrito.
- Payload acima do teto → erro, nada escrito.
- Uma rajada de 10 mudanças de watch em 2s gera no máximo 1 escrita.

---

## 🟠 SEC-03 — `/api/push/register` não tem dono

**Arquivo:** `src/routes/api/push/register.ts:98` (DELETE)

Qualquer requisição pode registrar ou remover uma subscription passando o token
do Expo. Token do Expo não é secreto — é distribuível. Na prática: dá pra
desligar o alerta de outra pessoa se você tiver o token dela.

Impacto baixo hoje (poucos usuários, token difícil de obter), mas é o tipo de
coisa que fica cara de consertar depois que o mobile tem login.

**Fix:** amarrar a subscription ao `userId` quando houver sessão; sem sessão,
exigir prova de posse do token (ex.: challenge via push). Fazer junto de
`ARQ-01` — o mesmo trabalho.

**Aceite:** DELETE com token de terceiro, sem sessão do dono, retorna 401/403.

---

## 🟠 SEC-04 — CORS `*` sem chave de cliente

**Arquivos:** `src/routes/api/analyze.ts`, `universe.ts`, `push/register.ts`

`Access-Control-Allow-Origin: *` é coerente com o Expo chamando de fora do
navegador, e está documentado como decisão consciente. Mas combinado com
ausência de qualquer credencial de cliente, significa que qualquer um monta um
front por cima do seu motor e não paga nada.

**Fix:** não é urgente enquanto o rate limit por IP existir e funcionar
(`SEC-01`). Quando houver plano pago, introduzir uma chave de app (mesmo que
pública e rotacionável) para diferenciar tráfego seu de tráfego de terceiro nas
métricas — pré-requisito de qualquer decisão de preço.

**Aceite:** a telemetria de `OPS-01` consegue separar chamadas do app oficial
das demais.

---

## 🟠 SCALE-01 — o cron reanalisa o mesmo par N vezes, em série

**Arquivo:** `src/lib/push/scan.ts:33-35`

`scanAllSubscriptions` faz um `runAnalysis` completo **por watch, por
subscription, sequencialmente**. Cada `runAnalysis` = até 2 páginas de 1000
klines na Binance + DexScreener + Binance Futures.

50 assinantes × 10 pares = 500 análises em série a cada 30 min, a maioria do
*mesmo* par. Vai bater rate limit da Binance ou estourar o job muito antes de
100 usuários. O cooldown de alerta em si (`alertCooldownKey` / `lastSent` /
`shouldScan`) está correto — o problema é só a ausência de cache.

**Fix:** deduplicar por `(ticker, timeframe)` antes do loop; rodar cada par uma
vez, guardar o payload em memória durante o scan, e avaliar as regras de todas
as subscriptions contra o resultado compartilhado. Paralelismo limitado
(ex.: 4 concorrentes) em cima disso.

**Aceite:**
- Um scan com 3 subscriptions assistindo `BTC/4h` chama a Binance **uma** vez.
- O `ScanReport.analyzed` reflete pares únicos, não watches totais.
- Scan de 50 subscriptions × 10 pares termina dentro da janela de 30 min.

---

## 🟠 OPS-01 — observabilidade zero

**Onde:** não existe.

Nenhum log estruturado, nenhuma métrica, nenhum funil. Hoje é impossível
responder: quantas análises por dia? quais pares? quanto custou em Anthropic
neste mês? onde o usuário desiste? quantos voltam no dia seguinte?

**Isso bloqueia o Stripe.** Não dá pra escolher o que travar nem por quanto sem
saber o custo por usuário e qual recurso as pessoas realmente usam.

**Fix mínimo viável:** log estruturado (JSON, uma linha por análise) com
`ticker`, `timeframe`, `hasImage`, `durationMs`, `matches`, `sampleNote`,
`relaxed`, `source`, e um contador de custo estimado quando a visão roda. Um
endpoint autenticado ou uma view no Postgres que agregue isso.

**Aceite:** consigo responder, sem abrir código, "quantas leituras de print
rodaram nos últimos 7 dias e quanto isso custou".

---

## 🟡 ENG-01 — matches sobrepostos contam como independentes

**Arquivo:** `src/lib/market/precedent.ts:216-230`

Candles `i` e `i+1` com o mesmo fingerprint entram na amostra como duas
observações. Mas seus horizontes de 10 barras se sobrepõem em 9 — não são
independentes. O número que o produto exibe em display-type ("30 vezes em 1.500
candles") está inflado e fortemente autocorrelacionado.

Isso é a falha mais séria do produto, porque é a única que faz o app enganar
sem querer: os percentuais parecem ter mais lastro do que têm.

**Fix:** ao montar `matchIdx`, descartar match a menos de `maxHorizon` barras do
match anterior aceito (ou, alternativa mais generosa, `bars` do horizonte em
avaliação). Documentar na UI que a contagem é de ocorrências **não
sobrepostas**.

**Aceite:**
- Teste unitário: série sintética com 20 candles idênticos consecutivos produz
  no máximo `floor(20 / maxHorizon)` matches, não 20.
- O número exibido cai (é esperado) e o copy explica por quê.

---

## 🟡 ENG-02 — não existe baseline

**Arquivo:** `src/lib/market/precedent.ts`, `src/lib/market/narrate.ts`

"52% das vezes subiu" não informa nada sem "e a taxa incondicional deste par
neste timeframe é 51%". Sem essa comparação, **todo** resultado parece
informativo e nenhum é.

Esta é a adição de maior impacto no motor inteiro — é o que separa o Precedente
de um indicador de TradingView, e é exatamente a conta que o público-alvo não
consegue fazer sozinho.

**Fix:** calcular, na mesma série, a distribuição incondicional de retorno para
cada horizonte (todos os candles a partir do 50, sem filtro de fingerprint).
Expor `upPct`, `medianPct` e `medianDrawdownPct` do baseline junto do
condicional. Na UI, mostrar o **delta**, não só o absoluto.

**Aceite:**
- O payload de `/api/analyze` traz `baseline` por horizonte.
- A UI mostra "+8 pts vs. a base do par" ou "em linha com a base".
- Teste: série puramente aleatória produz delta ≈ 0.

---

## 🟡 ENG-03 — o relaxamento vai longe demais sem mudar o peso visual

**Arquivo:** `src/lib/market/precedent.ts:216-230`

O relaxamento cai até `score >= 2`, que é só bucket de RSI + direção do candle.
Nesse ponto "precedente" virou "qualquer candle de alta com RSI parecido" — mas
o app entrega os números com a mesma confiança visual de um match completo.

`relaxed[]` e `sampleNote` são honestos, mas ficam em corpo pequeno ao lado de
um número em display-type gigante.

**Fix:** dois lados. (a) No motor: considerar não entregar horizontes quando o
score final for 2 e a amostra ainda for `tiny` — devolver um estado explícito
de "sem precedente utilizável". (b) Na UI: a degradação de confiança tem que ser
visível no elemento dominante, não numa legenda.

**Aceite:**
- Existe pelo menos um par/TF real em que o app diz "não tenho precedente
  suficiente" em vez de mostrar percentuais.
- Num resultado relaxado até score 2, o componente principal está visualmente
  atenuado.

---

## 🟡 ENG-04 — janela de 1.500 candles

**Arquivo:** `src/lib/market/exchange.ts:17,81`

`TARGET_BARS = 1500` significa ~25 horas de história em 1m e ~8 meses em 4h. Em
1d, quase nenhum par da Binance tem 1.500 dias. A janela é o teto de tudo que o
motor pode afirmar.

**Fix:** tornar `TARGET_BARS` função do timeframe (mais páginas nos TFs longos,
onde a Binance tem história e o custo de request é irrelevante). Expor na UI o
período real coberto ("8 meses de história"), não só a contagem de candles.

**Aceite:** em 1d, o app cobre pelo menos o histórico disponível do par; a UI
mostra a janela em tempo, não em barras.

---

## 🟡 ENG-05 — o cenário é PnL bruto

**Arquivo:** `src/lib/market/scenario.ts`

A encenação de capital/alavancagem não desconta taxa, spread nem funding. Num
exemplo alavancado isso pode inverter o sinal do resultado — o que é
especialmente delicado num produto que se define por *não* induzir decisão.

**Fix:** aplicar taxa de maker/taker configurável e, quando `onchain.fundingRate`
existir, projetar o custo de funding sobre o horizonte em tempo real
(`timeNote` já calcula essa duração).

**Aceite:** um cenário de 20 barras em 4h com alavancagem 3 mostra o custo
estimado separado do resultado bruto.

---

## 🟡 RISK-01 — Binance é ponto único de falha

**Arquivo:** `src/lib/market/exchange.ts`

Os dois `BASES` são a mesma contraparte. Um geo-block ou 451 e o produto inteiro
para — não há degradação, só erro.

**Fix:** adicionar uma segunda exchange como fallback de OHLCV (Bybit ou OKX têm
klines compatíveis o suficiente). Marcar `source` no payload para que a UI diga
de onde veio.

**Aceite:** com a Binance simulada como indisponível, uma análise de BTC/4h ainda
completa e a UI indica a fonte alternativa.

---

## 🟠 LEG-01 — sem termos, privacidade ou aviso de risco formal

**Onde:** existem duas rotas — `/` e `/login`.

Você guarda e-mail e senha em Postgres (LGPD) e vai cobrar por um produto
adjacente a investimento (CVM 20/2021, sobre recomendação). O copy do produto se
defende muito bem — `productBoundary()`, os disclaimers do cenário, o prompt de
visão. Mas defesa de copy não substitui documento.

**Fix:** rotas `/termos`, `/privacidade` e um aviso de risco linkado do rodapé e
do fluxo de checkout. Consultar advogado sobre o enquadramento CVM antes de
cobrar — o produto é estatística descritiva, não recomendação, e essa distinção
precisa estar escrita por alguém habilitado, não inferida do código.

**Aceite:** as três páginas existem, estão linkadas do app e do checkout, e o
enquadramento foi revisado por um profissional.

---

## 🟠 ARQ-01 — o mobile não alcança a monetização

**Arquivos:** `mobile/` (sem `login`), `src/lib/sync.ts`, `src/lib/billing/`

O público-alvo declarado é o APK. Mas o mobile não tem login, não tem sync e não
tem checkout. Um usuário que só usa o app **nunca encontra o produto pago**.
Toda a receita vive no cliente que não é o alvo.

Isso precisa ser resolvido antes de qualquer decisão de preço.

**Fix:** Better Auth no Expo (email/senha, mesmo backend), sync de
watch/histórico usando as mesmas server functions, e checkout via navegador
externo (`Linking.openURL` para a URL do Stripe Checkout — evita a política de
in-app purchase enquanto for distribuição interna/APK; revisar antes de ir pra
Play Store).

**Aceite:** login no APK, watch sincronizada entre APK e web, e o estado do plano
visível no mobile.

---

## 🟡 OPS-02 — rate limit em memória com uma réplica

**Arquivo:** `src/lib/rate-limit.ts:12,16`

Funciona hoje: `multiRegionConfig: { sfo: { numReplicas: 1 } }`. No dia que
subir para 2 réplicas ou uma segunda região, o limite dobra silenciosamente e
ninguém percebe. O comentário no arquivo documenta o tradeoff corretamente — o
risco é o esquecimento.

**Fix:** mover os buckets para o Postgres ou um Redis quando escalar. Enquanto
não escalar, deixar um teste ou um check de boot que falha ruidosamente se
`numReplicas > 1`.

**Aceite:** subir uma segunda réplica quebra o build ou emite um alerta — não
passa em silêncio.

---

## 🟢 DEBT-01 — sobras da plataforma Grok

- `src/lib/multiplayer/p2p.ts` — 570 linhas de WebRTC full-mesh apontando para
  `/api/rtc`, rota que **não existe** neste app. Código morto.
- `package.json` ainda se chama `app-builder-workspace`.
- Dezenas de deps `@radix-ui/*` nunca importadas (accordion, avatar, checkbox,
  radio-group, slider, toggle-group, etc.), mais `zustand`, `react-day-picker`,
  `react-resizable-panels`, `cmdk`, `vaul`, `@tanstack/react-table`.
- `AGENTS.md`, `server/middleware/grok-pwa.ts`, `public/__grok/`,
  `scripts/grok-pwa-*` são contrato da plataforma, não do produto.

**Fix:** apagar `p2p.ts`; renomear o package; podar deps não importadas
(`npx depcheck` como ponto de partida). **Não** mexer nos arquivos de contrato
da plataforma listados no `AGENTS.md` sem entender a consequência no build.

**Aceite:** `npm run build` limpo depois da poda; bundle menor; nenhum import
quebrado.

---

## 🟢 DEBT-02 — `npm test` vermelho por padrão

13 testes de scaffold falham (5 de auth-invariant/migration-plan/with-app-env
após ligar o login, 8 pré-existentes de `grok-pwa-plugin`). Estão documentados
como "fora de escopo" — e a documentação está correta, são asserções sobre o
template, não sobre o produto.

O problema é de processo: CI cronicamente vermelho deixa de ser sinal. Na
próxima vez que um teste **real** quebrar, ninguém vai notar.

**Fix:** separar `npm run test:product` (motor, rate-limit, billing, auth
identity, app-data) de `npm run test:scaffold`. O primeiro tem que ser verde
sempre e ser o que roda no gate.

**Aceite:** `npm run test:product` passa 100% e é o comando citado em qualquer
checklist de merge.

---

## Nice-to-have — o que converte pagante

Público: trader BR de varejo, alavancado, disciplina em construção, saturado de
sinal. O que ele pagaria, em ordem de razão valor/esforço:

**1. Alertas de precedente no celular** — já está ~80% construído. É o único
recurso que trabalha enquanto ele dorme. Gate natural: grátis = 3 pares e
intervalo longo; pago = 24 pares e intervalo curto. Depende de `SCALE-01` e
`ARQ-01`.

**2. Baseline visível** (`ENG-02`) — é a resposta para "por que isso não é só
mais um indicador". Não deveria ser pago; deveria ser o que faz a pessoa
acreditar no produto o suficiente para pagar por outra coisa.

**3. Diário de decisão** — o usuário marca "olhei este precedente e entrei / não
entrei", e 20 barras depois o app mostra o que aconteceu. Vira histórico
pessoal: o único dado que ele não consegue em lugar nenhum, e que só cresce
enquanto ele continuar assinando. Melhor mecanismo de retenção disponível para
este produto, e o histórico local já existe.

**4. Sizing pelo drawdown** — "com este drawdown mediano, X% da banca é o que
sobrevive ao caminho típico". Continua sem apontar direção, e é a tradução
prática da tese central do app.

**Não vale o esforço agora:** backtest completo, mais exchanges além do fallback
de `RISK-01`, mais indicadores. Complexidade que não converte.

**Sobre o gate:** o custo é dominado pela visão (Opus 5). O corte mais
defensável é *leitura de print* (caro, mágico, limitável por cota) + *alertas*
(recorrente por natureza). A análise OHLC deveria continuar grátis e ilimitada —
é o funil inteiro. Mas essa decisão só deve ser tomada **depois** de `OPS-01`,
com número de custo real na mão.
