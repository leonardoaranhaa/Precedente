export type SyncKind = "watch" | "history";

const SYNC_KINDS: readonly SyncKind[] = ["watch", "history"];

export function isSyncKind(value: unknown): value is SyncKind {
  return typeof value === "string" && (SYNC_KINDS as readonly string[]).includes(value);
}

/**
 * Local storage already caps these lists (24 watch rows, no images; 20
 * history rows, each with a compressed ~1280px-edge JPEG thumb — see
 * `watchlist.ts` / `history.ts` / `compress.ts`). These byte ceilings are a
 * generous multiple of that realistic worst case: they exist to block a
 * genuine abuse payload (a scripted multi-MB blob), not to fine-tune a
 * legitimate one.
 */
export const SYNC_MAX_BYTES: Record<SyncKind, number> = {
  watch: 200_000,
  history: 8_000_000,
};

function byteLength(serialized: string): number {
  return new TextEncoder().encode(serialized).length;
}

export class InvalidSyncPayloadError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "InvalidSyncPayloadError";
  }
}

/** Validates a setSyncData input at runtime — the type is compile-time only otherwise. */
export function assertSyncPayload(kind: unknown, data: unknown): SyncKind {
  if (!isSyncKind(kind)) {
    throw new InvalidSyncPayloadError("Tipo de sincronização inválido.");
  }
  const serialized = JSON.stringify(data) ?? "null";
  if (byteLength(serialized) > SYNC_MAX_BYTES[kind]) {
    throw new InvalidSyncPayloadError("Dados grandes demais para sincronizar.");
  }
  return kind;
}
