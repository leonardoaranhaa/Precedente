# Alertas push — Precedente

## Visão

Notificações de **prevenção de perdas** para pares na Watch. Sempre factuais,
**sem** linguagem de compra/venda.

### Kinds

| Kind | Dispara quando |
|------|----------------|
| `sample_weak` | amostra `small` / `tiny` |
| `sample_regime` | transição de regime de amostra (ok ↔ fraca) |
| `drawdown_path` | drawdown mediano do caminho (H10) acima do limiar |
| `extreme_20` | preço colado na máxima/mínima de 20 barras |
| `price_zone` / `rsi_zone` | zonas de preço/RSI configuradas pelo usuário |
| `funding_extreme` | funding acima do limiar configurado |
| `volume_anomaly` | barra atual ≥ N× a mediana das 20 anteriores (contexto de atividade) |
| `dex_drain` | token DEX pinado piora de nível de fragilidade (liquidez/giro/venda/volume) — nunca dispara na recuperação |

Cooldown de 6h por par+kind (`lastSent` na subscription).

## API

| Método | Rota | Uso |
|--------|------|-----|
| `POST` | `/api/push/register` | Registra token Expo + watches + regras |
| `DELETE` | `/api/push/register` | Remove subscription |
| `POST` | `/api/push/scan` | Scan geral: reanalisa a watch e envia push |
| `POST` | `/api/push/zone-scan` | Só pares com zona ligada (cadência mais alta) |
| `POST` | `/api/push/digest-scan` | Digest diário da watch |
| `POST` | `/api/push/funding-digest-scan` | Digest de funding/OI 2×/dia (08h e 20h UTC) |
| `POST` | `/api/push/opening-scan` | Precedente de abertura |
| `POST` | `/api/push/weekly-risk-scan` | Resumo semanal de riscos sinalizados |
| `POST` | `/api/push/dex-drain-scan` | Drenagem dos tickers DEX pinados (`dexWatches`) |
| `POST` | `/api/news/scan` | Digest de notícias |
| `GET` | `/api/news/health` | Saúde dos feeds RSS |

### Auth do scan

Defina `PUSH_CRON_SECRET` no Railway. Envie:

```http
X-Cron-Secret: <secret>
```

ou `Authorization: Bearer <secret>`.

Sem a variável, o scan fica aberto (apenas para dev).

## Persistência

Tabela `push_subscriptions` (migration `migrations/0001_push_subscriptions.sql`,
com `user_id` a partir de `migrations/0008_push_user.sql`):

- `token` PK
- `watches`, `rules`, `last_sent` (JSONB)
- `user_id` — preenchido quando o register vem autenticado (usado no push de cota)
- `updated_at`

Com `DATABASE_URL` (Neon/Railway), sobrevive a redeploys.

---

## Cron no Railway (recomendado)

Railway **não** agenda HTTP no serviço web 24/7. O padrão certo é um **segundo
serviço** que sobe, roda o script e **sai**.

Scripts disponíveis em `scripts/` (cada um bate na rota correspondente):

| Script | Rota | Cadência sugerida (UTC) |
|--------|------|--------------------------|
| `push-scan-cron.mjs` | `/api/push/scan` | `*/30 * * * *` |
| `zone-scan-cron.mjs` | `/api/push/zone-scan` | `*/15 * * * *` |
| `watch-digest-cron.mjs` | `/api/push/digest-scan` | `0 * * * *` |
| `funding-digest-cron.mjs` | `/api/push/funding-digest-scan` | `0 8,20 * * *` |
| `opening-scan-cron.mjs` | `/api/push/opening-scan` | `0 * * * *` |
| `weekly-risk-cron.mjs` | `/api/push/weekly-risk-scan` | `0 12 * * 1` |
| `dex-drain-scan-cron.mjs` | `/api/push/dex-drain-scan` | `*/15 * * * *` (fluxo DEX muda rápido) |
| `news-digest-cron.mjs` | `/api/news/scan` | `0 * * * *` |
| `rss-health-cron.mjs` | `/api/news/health` | `0 */6 * * *` |

Referência de config: `railway.cron.toml` (documentação; o start command e o
cron você confirma no dashboard).

### 1. Variáveis no serviço web (já existente)

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Postgres / Neon |
| `PUSH_CRON_SECRET` | string longa aleatória |

### 2. Novo serviço no mesmo projeto

1. **New → GitHub Repo** → `leonardoaranhaa/Precedente` (mesmo repo).
2. **Settings → Deploy**
   - **Custom Start Command:** `node scripts/<script>.mjs`
   - **Cron Schedule:** ver tabela acima (UTC; mínimo Railway = 5 min)
3. **Variables** deste serviço cron:

| Variável | Valor |
|----------|--------|
| `PUSH_CRON_SECRET` | **igual** ao do web |
| `PUBLIC_APP_URL` | `https://<seu-servico-web>.up.railway.app` |

   Ou diretamente: `SCAN_URL=https://<web>.up.railway.app/api/push/scan`

4. **Não** coloque Cron Schedule no serviço web principal (ele precisa ficar
   Active 24/7).

### 3. Testar na mão

```bash
curl -sS -X POST "https://<web>.up.railway.app/api/push/scan" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -d '{}'
```

Resposta esperada: `ok: true`, contagens de `analyzed` / `alerts` / `sentOk`.

### 4. Logs

No serviço cron: Deployments → último run → logs do script.
Se o status ficar **Active** sem sair, o próximo schedule é **pulado**
(exigência do Railway).

### Expressões úteis (UTC)

| Cron | Significado |
|------|-------------|
| `*/30 * * * *` | A cada 30 min |
| `*/15 * * * *` | A cada 15 min |
| `0 * * * *` | Toda hora cheia |
| `0 */2 * * *` | A cada 2 horas |
| `0 8,20 * * *` | 08h e 20h |
| `0 12 * * 1` | Segundas, meio-dia |

---

## Alternativa: GitHub Actions

Arquivo: `.github/workflows/push-scan.yml`

Secrets do repo:

- `RAILWAY_APP_URL` = `https://seu-app.up.railway.app`
- `PUSH_CRON_SECRET` = mesmo do backend

Roda a cada 30 min (UTC) ou manualmente em **Actions → Push alert scan → Run
workflow**.

---

## Mobile

Aba **Alertas** → ativar push → regras (amostra, regime, drawdown, extremo,
funding, volume anômalo) + digest diário → pares na Watch são sincronizados
automaticamente.

```bash
cd mobile && npm install && npx expo start
```

Aparelho físico + permissão de notificação.
