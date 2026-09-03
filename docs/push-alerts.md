# Alertas push — Precedente

## Visão

Notificações de **prevenção de perdas** para pares na Watch:

- amostra `small` / `tiny`
- drawdown mediano do caminho (H10) acima do limiar
- preço colado na máxima/mínima de 20 barras

Sem linguagem de compra/venda.

## "Auto" na Watch ≠ push

A Watch (web e mobile) tem um seletor **Auto** (desligado / 5 / 15 / 30 min)
que reavalia os pares pinados sozinho. É fácil confundir com este sistema de
push, mas são dois mecanismos independentes:

| | Auto (seletor da Watch) | Push (este doc) |
|---|---|---|
| Onde roda | No navegador/app, só com a tela aberta | No servidor (cron Railway), roda sempre |
| Precisa do app aberto? | Sim — fecha a aba/app, para | Não — é o ponto do push |
| Web consegue? | Sim | **Não** — web não tem registro de push (token Expo é só mobile); a Watch no web só **exibe** (ícone de sino) uma zona configurada no app, nunca edita |
| O que faz | Só atualiza os números da tabela (Δ, amostra, DD) na tela | Manda notificação push de verdade pro celular |

Ou seja: ligar "Auto 30min" no web **não** cria nem substitui um alerta push —
é só a tabela se atualizando sozinha enquanto a aba estiver aberta. Só o
app mobile registra push de verdade (aba **Alertas**).

## API

| Método | Rota | Uso |
|--------|------|-----|
| `POST` | `/api/push/register` | Registra token Expo + watches + regras |
| `DELETE` | `/api/push/register` | Remove subscription |
| `POST` | `/api/push/scan` | Reanalisa e envia push |

### Auth do scan

Defina `PUSH_CRON_SECRET` no Railway. Envie:

```http
X-Cron-Secret: <secret>
```

ou `Authorization: Bearer <secret>`.

Sem a variável, o scan fica aberto (apenas para dev).

### Capacidade de `/api/push/register`

Testado localmente (build de produção, fallback PGLite) contra carga leve:

- Rate limit (20 req / 5 min por IP) dispara exatamente no request 21 (`429`
  com `retryAfterSec`) — confirmado com 25 requests sequenciais.
- 60 registros concorrentes de dispositivos distintos (20 em paralelo): todos
  `200`, contagem final de subscribers bate exatamente (sem escrita perdida
  no upsert por token).
- Payloads malformados (JSON inválido, corpo vazio, token fora do formato
  Expo) seguem retornando `400` sem derrubar o processo; `watches` acima do
  limite é truncado em 24 itens, não rejeitado.

Não valida capacidade da Neon real em produção — só confirma que a rota e o
rate limiter não têm um teto óbvio bem abaixo do tráfego esperado.

## Persistência

Tabela `push_subscriptions` (migration `migrations/0001_push_subscriptions.sql`):

- `token` PK
- `watches`, `rules`, `last_sent` (JSONB)
- `updated_at`

Com `DATABASE_URL` (Neon), sobrevive a redeploys.

---

## Cron no Railway (recomendado)

Railway **não** agenda HTTP no serviço web 24/7. O padrão certo é um **segundo serviço** que sobe, roda o script e **sai**.

### 1. Variáveis no serviço web (já existente)

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Postgres / Neon |
| `PUSH_CRON_SECRET` | string longa aleatória |

### 2. Novo serviço no mesmo projeto

1. **New → GitHub Repo** → `leonardoaranhaa/Precedente` (mesmo repo).
2. **Settings → Deploy**
   - **Custom Start Command:** `node scripts/push-scan-cron.mjs`
   - **Cron Schedule:** `*/30 * * * *` (a cada 30 min, UTC; mínimo Railway = 5 min)
3. **Variables** deste serviço cron:

| Variável | Valor |
|----------|--------|
| `PUSH_CRON_SECRET` | **igual** ao do web |
| `PUBLIC_APP_URL` | `https://<seu-servico-web>.up.railway.app` |

   Ou diretamente: `SCAN_URL=https://<web>.up.railway.app/api/push/scan`

4. **Não** coloque Cron Schedule no serviço web principal (ele precisa ficar Active 24/7).

Referência de config: `railway.cron.toml` (documentação; o start command e o cron você confirma no dashboard).

### 3. Testar na mão

```bash
curl -sS -X POST "https://<web>.up.railway.app/api/push/scan" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -d '{}'
```

Resposta esperada: `ok: true`, contagens de `analyzed` / `alerts` / `sentOk`.

### 4. Logs

No serviço cron: Deployments → último run → logs de `[push-scan-cron]`.
Se o status ficar **Active** sem sair, o próximo schedule é **pulado** (exigência do Railway).

### Alerta de falha

`/api/push/scan` sempre responde `200 { ok: true, ... }` quando o scan como um
todo roda — mas isso não significa que nada falhou dentro dele (ex.: dados de
mercado fora do ar pra um par, ou envio Expo falhando pra um token). Duas
camadas cobrem isso, independentes:

- **Servidor** — se `report.errors` não estiver vazio, o servidor manda pro
  Sentry (`reportServerMessage`, nível `warning`, ou `error` se **todos** os
  pares falharam) antes de responder 200. É o sinal principal — só existe se
  `SENTRY_DSN` estiver setado no serviço `web`.
- **Cron** — `scripts/push-scan-cron.mjs` também sai com código `1` quando
  `body.errors` não está vazio (antes só saía `1` em HTTP não-200), então o
  Railway marca o run do serviço cron como falho mesmo sem Sentry configurado.

### Expressões úteis (UTC)

| Cron | Significado |
|------|-------------|
| `*/30 * * * *` | A cada 30 min |
| `*/15 * * * *` | A cada 15 min |
| `0 * * * *` | Toda hora cheia |
| `0 */2 * * *` | A cada 2 horas |

---

## Alternativa: GitHub Actions

Arquivo: `.github/workflows/push-scan.yml`

Secrets do repo:

- `RAILWAY_APP_URL` = `https://seu-app.up.railway.app`
- `PUSH_CRON_SECRET` = mesmo do backend

Roda a cada 30 min (UTC) ou manualmente em **Actions → Push alert scan → Run workflow**.

---

## Mobile

Aba **Alertas** → ativar push → regras → pares na Watch são sincronizados automaticamente.

```bash
cd mobile && npm install && npx expo start
```

Aparelho físico + permissão de notificação.
