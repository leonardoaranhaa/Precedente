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
| `POST` | `/api/push/scan` | Reanalisa e envia push |

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

Com `DATABASE_URL` (Neon), sobrevive a redeploys. Sem URL, PGLite aplica a mesma migration em preview.

## Cron no Railway

1. Variáveis: `DATABASE_URL`, `PUSH_CRON_SECRET`
2. Cron job (ex. a cada 30 min):

```bash
curl -sS -X POST "$RAILWAY_PUBLIC_DOMAIN/api/push/scan" \
  -H "X-Cron-Secret: $PUSH_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Ou use o **Cron Triggers** do Railway apontando para a mesma URL.

## Mobile

Aba **Alertas** → ativar push → regras → pares na Watch são sincronizados automaticamente.

`npm install` em `mobile/` (expo-notifications, expo-device, expo-constants).
