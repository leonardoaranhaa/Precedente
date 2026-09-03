import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ExternalLink, Layers } from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatInt, formatPct } from "../format";
import type { OnchainContext } from "../types";

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatFunding(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  const pct = rate * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4).replace(".", ",")}%`;
}

function formatAge(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 48) return `~${Math.round(hours)}h`;
  return `~${Math.round(hours / 24)}d`;
}

export function OnchainCard({ onchain }: { onchain: OnchainContext }) {
  const hasDeriv = onchain.fundingRate != null || onchain.openInterest != null;
  const hasDex = onchain.liquidityUsd != null || onchain.volume24hUsd != null;
  if (!hasDeriv && !hasDex) return null;

  const buys = onchain.buys24h ?? 0;
  const sells = onchain.sells24h ?? 0;
  const buys6 = onchain.buys6h;
  const sells6 = onchain.sells6h;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Layers size={13} color={colors.muted} />
          <Text style={styles.eyebrow}>Contexto on-chain</Text>
        </View>
        <Text style={styles.sources}>{onchain.sources.join(" · ") || "—"}</Text>
      </View>

      {hasDeriv ? (
        <View style={styles.block}>
          <Text style={styles.sub}>Derivativos perp</Text>
          <Row label="Funding" value={formatFunding(onchain.fundingRate)} />
          <Row
            label="Open interest"
            value={
              onchain.openInterest != null
                ? formatInt(Math.round(onchain.openInterest))
                : "—"
            }
          />
          <Text style={styles.hint}>
            Funding extremo descreve pressão de alavancagem — não direção no spot.
          </Text>
        </View>
      ) : null}

      {hasDex ? (
        <View style={[styles.block, hasDeriv && styles.blockBorder]}>
          <Text style={styles.sub}>
            Liquidez DEX
            {onchain.chainId ? ` · ${onchain.chainId}` : ""}
            {onchain.dexId ? ` · ${onchain.dexId}` : ""}
          </Text>
          <Row label="Liquidez" value={formatUsd(onchain.liquidityUsd)} />
          <Row label="Vol 24h" value={formatUsd(onchain.volume24hUsd)} />
          {onchain.volume6hUsd != null ? (
            <Row label="Vol 6h" value={formatUsd(onchain.volume6hUsd)} />
          ) : null}
          {onchain.volume1hUsd != null ? (
            <Row label="Vol 1h" value={formatUsd(onchain.volume1hUsd)} />
          ) : null}
          {onchain.priceChange24hPct != null ? (
            <Row label="Δ 24h" value={formatPct(onchain.priceChange24hPct)} />
          ) : null}
          {onchain.priceChange6hPct != null ? (
            <Row label="Δ 6h" value={formatPct(onchain.priceChange6hPct)} />
          ) : null}
          {onchain.priceChange1hPct != null ? (
            <Row label="Δ 1h" value={formatPct(onchain.priceChange1hPct)} />
          ) : null}
          {buys + sells > 0 ? (
            <Row label="Txns 24h" value={`${formatInt(buys)}B / ${formatInt(sells)}S`} />
          ) : null}
          {buys6 != null && sells6 != null ? (
            <Row label="Txns 6h" value={`${formatInt(buys6)}B / ${formatInt(sells6)}S`} />
          ) : null}
          {onchain.pairAgeHours != null ? (
            <Row label="Idade do par" value={formatAge(onchain.pairAgeHours)} />
          ) : null}
          {onchain.pairUrl ? (
            <Pressable
              onPress={() => void Linking.openURL(onchain.pairUrl!)}
              style={styles.link}
            >
              <Text style={styles.linkText}>Abrir no DexScreener</Text>
              <ExternalLink size={12} color={colors.muted} />
            </Pressable>
          ) : null}
          <Text style={styles.hint}>
            Vol/txns curtos e par novo aumentam risco de escorregamento — fragilidade, não entrada.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.mono}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  sources: { fontSize: 10, color: colors.subtle },
  block: { padding: 14, gap: 8 },
  blockBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  sub: {
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.subtle,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  muted: { fontSize: 12, color: colors.muted },
  mono: { fontSize: 13, color: colors.fg, fontVariant: ["tabular-nums"] },
  hint: { fontSize: 11, lineHeight: 15, color: colors.subtle, marginTop: 4 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  linkText: { fontSize: 11, color: colors.muted },
});
