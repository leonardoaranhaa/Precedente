import * as Haptics from "expo-haptics";

/**
 * Wrapper fino sobre expo-haptics — nunca deve derrubar um fluxo. Falha
 * silenciosa em qualquer plataforma/dispositivo que não suporte (ex.: web,
 * simulador sem motor de vibração).
 */
async function safe(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    /* dispositivo sem suporte a haptics — segue sem vibrar */
  }
}

/** Push de zona de preço/RSI — o alerta mais acionável, vibração mais notável. */
export function hapticZoneAlert(): void {
  void safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Push informativo (amostra fraca, drawdown do caminho, extremo de 20 barras). */
export function hapticInfoAlert(): void {
  void safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** "Reavaliar todos" concluído — confirmação leve, não é um alerta. */
export function hapticRefreshDone(): void {
  void safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Crosshair do gráfico mudou de vela — tique bem leve, guia o dedo sem distrair. */
export function hapticCrosshairTick(): void {
  void safe(() => Haptics.selectionAsync());
}

const ZONE_KINDS = new Set(["price_zone", "rsi_zone"]);

/** Escolhe o haptic certo a partir do `kind` que vem no payload do push (ver src/lib/push/expo-send.ts). */
export function hapticForPushKind(kind: unknown): void {
  if (typeof kind === "string" && ZONE_KINDS.has(kind)) {
    hapticZoneAlert();
  } else {
    hapticInfoAlert();
  }
}
