# Alertas push — Precedente

## Visão

Notificações de **prevenção de perdas** para pares na Watch:

- amostra `small` / `tiny`
- transição de **regime de amostra** (ok ↔ small ↔ tiny)
- drawdown mediano do caminho (H10) acima do limiar
- preço colado na máxima/mínima de 20 barras
- **funding** acima do limiar configurado
- **digest diário** da Watch (+ movers 24h opcional)

Sem linguagem de compra/venda.

## API

| Método | Rota | Uso |
|--------|------|-----|
| `POST` | `/api/push/register` | Registra token Expo + watches + regras + digest |
| `DELETE` | `/api/push/register` | Remove subscription |
| `POST` | `/api/push/scan` | Reanalisa e envia push |
| `POST` | `/api/push/digest-scan` | Digest diário (cron) |

### Auth do scan

Defina `PUSH_CRON_SECRET` no Railway. Envie:

```http
X-Cron-Secret: <secret>
```

ou `Authorization: Bearer <secret>`.

Sem a variável, o scan fica aberto (apenas para dev).

## App mobile

Aba **Alertas**: liga push, regras (amostra, regime, DD, extremo, funding) e digest
(hora UTC + movers). O register envia `rules` + `digestEnabled` / `digestHourUtc` /
`includeMovers`.

## Cron no Railway

Ver `railway.cron.toml` e scripts:

- `push-scan-cron.mjs` — a cada 30 min
- `watch-digest-cron.mjs` — a cada hora (só envia na hora do usuário)
- `rss-health-cron.mjs` — health dos feeds (opcional)
