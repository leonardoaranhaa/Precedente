# Alertas push — Precedente

## Visão

Notificações de **prevenção de perdas** para pares na Watch:

- amostra `small` / `tiny`
- drawdown mediano do caminho (H10) acima do limiar
- preço colado na máxima/mínima de 20 barras

Sem linguagem de compra/venda.

## API

| Método | Rota | Uso |
|--------|------|-----|
| `POST` | `/api/push/register` | Registra token Expo + watches + regras |
| `DELETE` | `/api/push/register` | Remove subscription |
| `POST` | `/api/push/scan` | Reanalisa e envia push (cron 30 min) |
| `POST` | `/api/push/daily-summary-scan` | Resumo diário consolidado (cron 1x/dia) |
| `POST` | `/api/push/dex-drain-scan` | Alerta de drenagem DEX (cron 10 min) |

### Auth do scan

Defina `PUSH_CRON_SECRET` no Railway. Envie:

```http
X-Cron-Secret: <secret>
```

ou `Authorization: Bearer <secret>`.

Sem a variável, o scan fica aberto (apenas para dev).

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

### 2b. daily-summary-scan-cron (resumo diário)

1. **New → GitHub Repo** → `leonardoaranhaa/Precedente` (mesmo repo).
2. **Settings → Deploy**
   - **Custom Start Command:** `node scripts/daily-summary-scan-cron.mjs`
   - **Cron Schedule:** `0 10 * * *` (10:00 UTC = 07:00 BRT, 1×/dia)
3. **Variables:**

| Variável | Valor |
|----------|--------|
| `PUSH_CRON_SECRET` | **igual** ao do web |
| `PUBLIC_APP_URL` | `https://<seu-servico-web>.up.railway.app` |

Resposta esperada: `ok: true`, contagens de `subscriptions` / `analyzed` / `sent`.

### 2c. dex-drain-scan-cron (drenagem DEX)

1. **New → GitHub Repo** → `leonardoaranhaa/Precedente` (mesmo repo).
2. **Settings → Deploy**
   - **Custom Start Command:** `node scripts/dex-drain-scan-cron.mjs`
   - **Cron Schedule:** `*/10 * * * *` (a cada 10 min)
3. **Variables:**

| Variável | Valor |
|----------|--------|
| `PUSH_CRON_SECRET` | **igual** ao do web |
| `PUBLIC_APP_URL` | `https://<seu-servico-web>.up.railway.app` |

Resposta esperada: `ok: true`, contagens de `pairsChecked` / `drainAlerts` / `sent`.

### 3. Testar na mão

```bash
# Scan de alertas (a cada 30 min)
curl -sS -X POST "https://<web>.up.railway.app/api/push/scan" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -d '{}'

# Resumo diário
curl -sS -X POST "https://<web>.up.railway.app/api/push/daily-summary-scan" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -d '{}'

# Drenagem DEX
curl -sS -X POST "https://<web>.up.railway.app/api/push/dex-drain-scan" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -d '{}'
```

### 4. Logs

No serviço cron: Deployments → último run → logs de `[push-scan-cron]` / `[daily-summary-cron]` / `[dex-drain-cron]`.
Se o status ficar **Active** sem sair, o próximo schedule é **pulado** (exigência do Railway).

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
