# Push alerts (prevenção)

Alertas factuais — **sem** linguagem de compra/venda.

## Kinds

- **sample_weak** — amostra small/tiny
- **sample_regime** — transição de regime de amostra
- **drawdown_path** — DD mediano do caminho acima do limiar
- **extreme_20** — perto de high20/low20
- **price_zone** / **rsi_zone** — zonas configuradas
- **funding** acima do limiar configurado
- **volume anômalo** — barra atual ≥ N× mediana das 20 anteriores (contexto de atividade)

## Cadência

- Scan geral: `*/30`
- Zone scan: `*/15` (só pares com zona)
- Digests e health: ver `railway.cron.toml`

## Mobile

Aba **Alertas**: liga push, regras (amostra, regime, DD, extremo, funding, volume) e digest diário.

Cooldown 6h por par+kind.
