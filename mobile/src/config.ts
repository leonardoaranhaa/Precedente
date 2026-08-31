// URL pública do backend do Precedente (o app web em src/routes/api/analyze.ts).
//
// - Em desenvolvimento com Expo Go, `localhost` aponta pro próprio celular,
//   não pro seu computador. Defina EXPO_PUBLIC_API_BASE_URL com o IP da sua
//   máquina na rede local, ex.: EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080
// - Em produção (APK/build), aponte para o domínio publicado do web app,
//   ex.: EXPO_PUBLIC_API_BASE_URL=https://precedente.vercel.app
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const ANALYZE_ENDPOINT = `${API_BASE_URL}/api/analyze`;
