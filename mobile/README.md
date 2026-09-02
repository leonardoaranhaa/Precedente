# Precedente — App Mobile (Expo)

App companion do [Precedente](../src) para Android/iOS: mesmo fluxo do web —
print + ticker + tempo gráfico → estatística real de precedentes (RSI, SMAs,
extremas de 20 barras) — usando a **mesma engine** do app web via
`POST /api/analyze` (`../src/routes/api/analyze.ts`).

## Antes de tudo — aponte pro backend

O backend já está publicado na Railway:

```
https://web-production-ad1b65.up.railway.app
```

Essa URL está embutida nos perfis do `eas.json`, então builds EAS já saem
apontando pra ela. Para desenvolvimento local, rode o web app (`npm run dev`
na raiz do repo) ou aponte para outra instância, configurando a URL:

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
- `src/history.ts`, `src/watchlist.ts` — histórico/watch locais via
  `AsyncStorage` (equivalente ao `localStorage` do web). Conta é opcional;
  sem login tudo fica só no aparelho.
- `src/auth.ts` — login/cadastro por email/senha contra o mesmo Better Auth
  do web (`/api/auth/*`). Sem cookie jar no React Native, guarda o token de
  sessão (plugin `bearer()` do Better Auth) via `expo-secure-store` e manda
  `Authorization: Bearer <token>` em toda chamada autenticada.
- `src/sync.ts`, `src/billing.ts` — clientes das rotas REST
  `/api/sync`, `/api/billing/status|checkout|portal` (a mesma lógica dos
  server functions do web, exposta em REST porque o mobile não fala o
  protocolo interno de server function do TanStack Start).
- `src/screens/AccountScreen.tsx` — login/cadastro e, logado, plano
  atual + assinar/gerenciar (abre o Stripe Checkout/portal no navegador do
  sistema via `Linking.openURL` — sem in-app purchase, o que só vale
  enquanto a distribuição for APK direto, fora de loja de apps).
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
