# Precedente — App Mobile (Expo)

App companion do [Precedente](../src) para Android/iOS: mesmo fluxo do web —
print + ticker + tempo gráfico → estatística real de precedentes (RSI, SMAs,
extremas de 20 barras) — usando a **mesma engine** do app web via
`POST /api/analyze` (`../src/routes/api/analyze.ts`).

## Antes de tudo — aponte pro backend

O app web já expõe `/api/analyze`. Rode o web app (`npm run dev` na raiz do
repo) ou aponte para uma instância publicada, e configure a URL:

```bash
# .env dentro de mobile/, ou exportado no shell antes de rodar
EXPO_PUBLIC_API_BASE_URL=http://SEU-IP-NA-REDE:8080   # dev local, celular físico via Expo Go
# ou
EXPO_PUBLIC_API_BASE_URL=https://seu-precedente.vercel.app   # produção
```

`localhost` não funciona a partir de um celular físico — use o IP da sua
máquina na rede local (ex. `192.168.0.10`) durante o desenvolvimento.

## Rodando pra testar (Expo Go, sem gerar build)

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://SEU-IP:8080 npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS).

## Gerando o build (EAS)

```bash
npx eas login
npx eas build:configure
npm run build:apk   # gera .apk direto, sem passar pela Play Store
```

## Estrutura

- `App.tsx` — estado de navegação (Analisar / Resultado / Histórico), mesmo
  padrão do `src/routes/index.tsx` do web.
- `src/api.ts` — chama `/api/analyze` no backend do web app.
- `src/image.ts` — redimensiona o print (mesmo critério do `src/lib/compress.ts`
  web) antes de enviar, e gera a miniatura do histórico.
- `src/history.ts` — histórico local via `AsyncStorage` (equivalente ao
  `localStorage` do web), sem conta/servidor.
- `src/types.ts`, `src/format.ts` — espelham `src/lib/market/types.ts` e
  `src/lib/market/labels.ts` do web, pro payload e formatação ficarem idênticos.
- `src/theme.ts`, `src/fonts.ts` — paleta e tipografia (IBM Plex Sans +
  Fraunces) do `src/styles.css` do web.
- `src/screens/` — Analisar (`HomeScreen`), Resultado (`ResultScreen`),
  Histórico (`HistoryScreen`).

## Próximos ajustes naturais

- Ícone e splash screen personalizados (hoje está no padrão Expo).
- Gráfico OHLC da série recente (o web tem `OhlcChart`; o mobile hoje só traz
  o `PathChart` do horizonte selecionado).
- Persistir a preferência de `EXPO_PUBLIC_API_BASE_URL` numa tela de
  configurações, em vez de variável de ambiente, se o app for distribuído
  fora do controle de quem builda.
