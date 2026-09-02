import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertSyncPayload, isSyncKind, type SyncKind } from "@/lib/sync-limits";

export type { SyncKind };

/** Lê o blob sincronizado do usuário (ou null se nunca sincronizou esse tipo). */
export const getSyncData = createServerFn({ method: "GET" })
  .validator((kind: unknown): SyncKind => {
    if (!isSyncKind(kind)) throw new Error("Tipo de sincronização inválido.");
    return kind;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: kind }) => {
    const sql = await getSql();
    const rows = await sql.query<{ data: unknown }>(
      "select data from user_sync_data where user_id = $1 and kind = $2",
      [context.userId, kind],
    );
    return rows[0]?.data ?? null;
  });

/** Substitui o blob sincronizado do usuário por inteiro (mesmo padrão do localStorage). */
export const setSyncData = createServerFn({ method: "POST" })
  .validator((input: { kind: unknown; data: unknown }) => ({
    kind: assertSyncPayload(input?.kind, input?.data),
    data: input?.data,
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data: input }) => {
    const sql = await getSql();
    await sql.query(
      `insert into user_sync_data (user_id, kind, data, updated_at)
       values ($1, $2, $3::jsonb, now())
       on conflict (user_id, kind)
       do update set data = excluded.data, updated_at = excluded.updated_at`,
      [context.userId, input.kind, JSON.stringify(input.data)],
    );
  });
