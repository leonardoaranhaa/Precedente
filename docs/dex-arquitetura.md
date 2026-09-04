# Arquitetura do subsistema DEX

## Por que existe um segundo motor

O Precedente tem **dois motores de leitura que não se misturam**, porque
respondem perguntas diferentes com dados de natureza diferente.

| | Precedente | Fragilidade DEX |
|---|---|---|
| Pergunta | "quantas vezes isso já aconteceu, e o que veio depois?" | "qual é o estado deste par agora?" |
| Exige | histórico de candles (centenas de barras) | um par vivo no DEX |
| Fonte | Binance spot (OHLCV) | DexScreener |
| Saída | mediana, P10/P90, drawdown, caminho | flags factuais de liquidez e fluxo |
| Universo | ~100 pares USDT líquidos | qualquer token com par no DEX |

Um par de 18 horas **não tem** histórico pra precedente. Rodar o motor
estatístico ali produziria números inventados — mediana de 3 amostras,
drawdown sem base. Por isso o subsistema DEX **não reusa** nada do motor de
precedentes: sem mediana, sem P10/P90, sem caminho. Só fatos verificáveis do
par, com o disclaimer carregado em todo relatório.

A recíproca também vale: um par da Binance com 500 barras de histórico não
precisa da leitura de fragilidade pra decidir nada — ela entra ali só como
contexto (liquidez, funding), nunca como veredito.

## Camadas

```
CAMADA 1 · DADOS  (faz I/O, conhece o formato do fio)
  market/symbol.ts        baseAsset(): "PEPEUSDT" → "PEPE"
  market/dex/types.ts     DexScreenerPair (fio) → DexPairSnapshot (nosso)
                          toSnapshot() é a ÚNICA tradução do fio
  market/dex/fetch.ts     fetchDexPair(symbol) → DexPairSnapshot | null
                          busca canônica + busca por nome + scorePair
                                 │
                                 ▼
CAMADA 2 · DOMÍNIO  (puro: sem fetch, sem DB, sem relógio externo)
  market/dex/fragility.ts assessDexFragility(input) → DexFragilityReport
                          entrada ESTRUTURAL — não conhece DexScreener
                                 │
                                 ▼
CAMADA 3 · COMPOSIÇÃO
  market/dex/index.ts     fachada: readDexPair(), toFragilityInput()
  market/onchain.ts       derivativos Binance + fetchDexPair
  routes/api/dex.ts       GET /api/dex?ticker=X
                                 │
                                 ▼
CAMADA 4 · APRESENTAÇÃO
  components/ (web) · mobile/src/components/ (Expo)
```

### Por que o domínio tem entrada estrutural

`assessDexFragility` recebe um objeto avulso (`liquidityUsd`, `buys24h`, …),
não um `DexPairSnapshot`. Isso é deliberado:

- **testável sem mock**: os 23 testes montam literais, não respostas de API;
- **reusável**: `OnchainContext` (do caminho de análise) satisfaz a mesma
  forma, então o motor serve os dois caminhos sem adaptador;
- **desacoplado**: se o DexScreener mudar o JSON, muda `toSnapshot` e mais
  nada. O domínio não sabe que DexScreener existe.

O adaptador `toFragilityInput(snapshot)` mora na camada 3, que é onde
adaptador deve morar.

## A regra de import (o footgun nº 1 deste projeto)

> **Tudo dentro de `dex/` se importa estaticamente entre si.
> Quem está fora entra por `await import("@/lib/market/dex")` — a fachada.**

### Por quê

O Rolldown corrompe o chunk quando **o mesmo módulo** é importado de forma
**estática num arquivo e dinâmica em outro**, cruzando a fronteira
client/server. O servidor compilado morre com:

```
SyntaxError: Export 'ssr_exports' is not defined in module
```

Isso é **invisível** para `tsc`, para o `eslint` e até para o `vite build` —
os três passam. Só aparece rodando o binário e batendo numa rota. Já derrubou
produção **duas vezes** (03–04/09/2026): `market/onchain` importado
estaticamente por `push/funding-digest-scan.ts`, e `billing/vision-quota`
por `api/billing/vision-status.ts`.

O Railway não roda `tsc` no build (`vite build && db:migrate`), então os dois
casos subiram marcados como **SUCCESS**.

### O que isso significa na prática

| Módulo | Importado por | Como |
|---|---|---|
| `dex/types.ts` | `dex/fetch.ts` | estático |
| `dex/fetch.ts` | `dex/index.ts`, `market/onchain.ts` | estático (ambos) |
| `dex/fragility.ts` | `dex/index.ts` | estático |
| `dex/index.ts` | `routes/api/dex.ts` | **dinâmico** |
| `market/onchain.ts` | `lib/analyze.ts`, `push/funding-digest-scan.ts` | **dinâmico** (ambos) |

`market/onchain.ts` só é alcançado dinamicamente, então o import estático que
ele faz de `dex/fetch` é seguro: `dex/fetch` continua com importadores
exclusivamente estáticos.

### Antes de mexer em qualquer import aqui

```bash
grep -rn "market/dex" src/          # todos os importadores
grep -rn "await import(.*market/dex" src/   # quais são dinâmicos
```

Se um módulo aparecer nas duas listas, **pare**: é a bomba.

## Seleção de par

`scorePair` decide qual par representa o token — e essa escolha determina
**toda** a leitura seguinte, então errar aqui faz o produto descrever um
mercado que não existe.

```
score = log10(liquidez) + log10(volume 24h)
        − 15 se transações 24h < 10      (pool parada não é mercado)
        + 20 se símbolo bate exato
        +  5 se símbolo bate parcial
        +  8 se quote é stable ou major
```

O termo de volume e a penalidade existem por um caso real: ranqueando só por
liquidez, `PEPE` trazia uma pool Meteora de **US$ 9 bilhões** com **US$ 3,99**
de volume em 24h e **1 compra / 1 venda**. Depois da correção, resolve pra um
par Raydium com liq US$ 2,8M, vol US$ 323K e 17/17 transações.

Majors (BTC, ETH, SOL, BNB, LINK, AVAX, SUI) têm contrato canônico fixo e
pulam a busca por nome — pares migram e secam, o contrato do token não muda.

## Os sinais de fragilidade

| Flag | Dispara | Alta severidade |
|---|---|---|
| `par_novo` | idade < 168h | < 48h |
| `liquidez_baixa` | < US$ 50K | < US$ 10K |
| `giro_extremo` | volume 24h ÷ liquidez ≥ 3× | ≥ 10× |
| `pressao_venda` | sells ÷ (buys+sells) ≥ 55% | ≥ 65% |
| `volume_esfriando` | última hora < 50% do ritmo das 6h | — |
| `preco_fino` | \|Δ24h\| ≥ 30% **e** pool rasa | — |
| `saida_estreita` | liquidez ÷ market cap < 5% | < 1% |

Nível: 3+ flags altas = `extrema`; 2 = `alta`; 1 flag alta ou 2+ médias =
`media`; nenhuma = `observavel`.

`saida_estreita` é o sinal mais direto do padrão "baleia sai e mata a moeda":
se o token vale US$ 98,9M no papel mas há US$ 228K na pool, 0,23% desse valor
tem por onde sair. A formatação preserva casa decimal de propósito —
arredondar 0,23% pra "0%" apagaria o fato.

## Voz

O produto é de **prevenção de perda**, não de recomendação. Nenhuma flag pode
dizer "compre", "venda", "alvo", "stop" ou "entrada" — há um teste unitário
que falha se aparecer. As frases descrevem o estado; a decisão é do usuário.

## O que a API pública do DexScreener não dá

Conferido ao vivo contra a resposta real, não de memória:

- **volume de compra vs venda separado** — só volume total e *contagem* de
  compras/vendas;
- **carteiras únicas** (traders / buyers / sellers);
- **ranking de trending** e listagem de "pares novos".

As barras de pressão por **transações** são possíveis; por **volume** e por
**traders**, não. Um screener tipo "New/Trending" exigiria varrer e guardar
histórico por conta própria — é um serviço, não uma tela.

## Estado atual

Pronto: camadas 1 a 3, `GET /api/dex`, 23 testes de domínio.
Falta: camada 4 (painel web e mobile) e o alerta de drenagem.
