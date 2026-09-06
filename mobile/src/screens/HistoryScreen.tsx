import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Minus,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import { Badge } from "../components/Badge";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import { formatPct, formatWhen, timeframeLabel } from "../format";
import { TIMEFRAMES, type StoredAnalysis, type Timeframe } from "../types";

type SortKey = "date" | "signal";
type SortDir = "desc" | "asc";
type DirFilter = "all" | "up" | "down" | "flat";

const TF_ALL = "all" as const;
type TfFilter = Timeframe | typeof TF_ALL;

function signalDirection(a: StoredAnalysis): { dir: "up" | "down" | "flat"; pct: number } {
  const h = a.precedent.horizons;
  const mid = h.find((x) => x.bars === 10) ?? h[Math.min(1, h.length - 1)] ?? h[0];
  if (!mid) return { dir: "flat", pct: 0 };
  if (mid.medianPct > 0.15) return { dir: "up", pct: mid.medianPct };
  if (mid.medianPct < -0.15) return { dir: "down", pct: mid.medianPct };
  return { dir: "flat", pct: mid.medianPct };
}

export function HistoryScreen({
  items,
  signedIn,
  onOpen,
  onDelete,
  onClearAll,
}: {
  items: StoredAnalysis[];
  signedIn: boolean;
  onOpen: (item: StoredAnalysis) => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tfFilter, setTfFilter] = useState<TfFilter>(TF_ALL);
  const [dirFilter, setDirFilter] = useState<DirFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let list = items;

    if (query.trim()) {
      const q = query.trim().toUpperCase();
      list = list.filter(
        (a) =>
          a.displayTicker.toUpperCase().includes(q) ||
          a.ticker.toUpperCase().includes(q),
      );
    }

    if (tfFilter !== TF_ALL) {
      list = list.filter((a) => a.timeframe === tfFilter);
    }

    if (dirFilter !== "all") {
      list = list.filter((a) => signalDirection(a).dir === dirFilter);
    }

    const sign = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortKey === "signal") {
        return (signalDirection(a).pct - signalDirection(b).pct) * sign;
      }
      return (a.createdAt - b.createdAt) * sign;
    });

    return list;
  }, [items, query, tfFilter, dirFilter, sortKey, sortDir]);

  const hasFilters = query.trim() !== "" || tfFilter !== TF_ALL || dirFilter !== "all";

  if (items.length === 0) {
    return (
      <View style={s.empty}>
        <Clock size={22} color={colors.subtle} />
        <Text style={s.emptyTitle}>Nenhuma análise ainda.</Text>
        <Text style={s.emptyHint}>
          {signedIn
            ? "Suas análises sincronizam com sua conta entre aparelhos."
            : "As análises ficam neste aparelho. Entre na sua conta pra sincronizar."}
        </Text>
      </View>
    );
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <View style={s.wrapper}>
      <View style={s.headerArea}>
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Histórico</Text>
            <Text style={s.countHint}>
              {hasFilters
                ? `${filtered.length} de ${items.length}`
                : `${items.length} análises`}
            </Text>
          </View>
          {onClearAll && items.length > 0 ? (
            <Pressable
              style={s.clearAllBtn}
              onPress={() =>
                Alert.alert(
                  "Limpar histórico",
                  `Apagar ${items.length} análise${items.length > 1 ? "s" : ""}? Essa ação não pode ser desfeita.`,
                  [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Apagar tudo", style: "destructive", onPress: onClearAll },
                  ],
                )
              }
            >
              <Trash2 size={13} color={colors.down} />
              <Text style={s.clearAllText}>Limpar tudo</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Search bar */}
        <View style={s.searchRow}>
          <Search size={14} color={colors.subtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar par…"
            placeholderTextColor={colors.subtle}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.searchInput}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <X size={14} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Timeframe chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          <Chip
            label="Todos"
            active={tfFilter === TF_ALL}
            onPress={() => setTfFilter(TF_ALL)}
          />
          {TIMEFRAMES.map((tf) => (
            <Chip
              key={tf}
              label={timeframeLabel(tf)}
              active={tfFilter === tf}
              onPress={() => setTfFilter(tf === tfFilter ? TF_ALL : tf)}
            />
          ))}
        </ScrollView>

        {/* Direction chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          <Chip label="Todos" active={dirFilter === "all"} onPress={() => setDirFilter("all")} />
          <DirChip dir="up" active={dirFilter === "up"} onPress={() => setDirFilter(dirFilter === "up" ? "all" : "up")} />
          <DirChip dir="flat" active={dirFilter === "flat"} onPress={() => setDirFilter(dirFilter === "flat" ? "all" : "flat")} />
          <DirChip dir="down" active={dirFilter === "down"} onPress={() => setDirFilter(dirFilter === "down" ? "all" : "down")} />
        </ScrollView>

        {/* Sort toggles */}
        <View style={s.sortRow}>
          <SortButton
            label="Data"
            active={sortKey === "date"}
            dir={sortKey === "date" ? sortDir : undefined}
            onPress={() => toggleSort("date")}
          />
          <SortButton
            label="Sinal"
            active={sortKey === "signal"}
            dir={sortKey === "signal" ? sortDir : undefined}
            onPress={() => toggleSort("signal")}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={s.emptyFilter}>
          <Text style={s.emptyTitle}>Nenhum resultado.</Text>
          <Pressable
            onPress={() => {
              setQuery("");
              setTfFilter(TF_ALL);
              setDirFilter("all");
            }}
          >
            <Text style={s.clearLink}>Limpar filtros</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const sig = signalDirection(item);
            const DirIcon =
              sig.dir === "up" ? ArrowUp : sig.dir === "down" ? ArrowDown : Minus;
            const dirColor =
              sig.dir === "up" ? colors.up : sig.dir === "down" ? colors.down : colors.subtle;
            return (
              <View style={s.row}>
                <Pressable style={s.rowMain} onPress={() => onOpen(item)}>
                  {item.thumbUri ? (
                    <Image source={{ uri: item.thumbUri }} style={s.thumb} />
                  ) : (
                    <View style={s.thumbFallback}>
                      <Text style={s.thumbFallbackText}>
                        {item.displayTicker.split("/")[0]}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={s.rowTitleInner}>
                      <Text style={s.rowTitle} numberOfLines={1}>
                        {item.displayTicker}
                        <Text style={s.mutedText}>
                          {" "}
                          · {timeframeLabel(item.timeframe)}
                        </Text>
                      </Text>
                      <Badge
                        label={item.precedent.sampleNote.toUpperCase()}
                        accent={item.precedent.sampleNote === "ok"}
                        warn={item.precedent.sampleNote !== "ok"}
                      />
                    </View>
                    <Text style={s.subtitle}>
                      {item.precedent.matches} precedentes · {formatWhen(item.createdAt)}
                    </Text>
                  </View>
                  <View style={s.signal}>
                    <DirIcon size={14} color={dirColor} />
                    <Text style={[s.signalPct, { color: dirColor }]}>
                      {formatPct(sig.pct, 1)}
                    </Text>
                  </View>
                </Pressable>
                {onDelete ? (
                  <Pressable
                    style={s.deleteBtn}
                    onPress={() => onDelete(item.id)}
                    hitSlop={8}
                    accessibilityLabel={`Remover ${item.displayTicker}`}
                  >
                    <Trash2 size={14} color={colors.subtle} />
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function DirChip({
  dir,
  active,
  onPress,
}: {
  dir: "up" | "down" | "flat";
  active: boolean;
  onPress: () => void;
}) {
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const label = dir === "up" ? "Alta" : dir === "down" ? "Baixa" : "Neutro";
  const tint = dir === "up" ? colors.up : dir === "down" ? colors.down : colors.muted;
  return (
    <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress}>
      <Icon size={12} color={active ? colors.accentFg : tint} />
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SortButton({
  label,
  active,
  dir,
  onPress,
}: {
  label: string;
  active: boolean;
  dir?: SortDir;
  onPress: () => void;
}) {
  const SortIcon = dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <Pressable style={s.sortBtn} onPress={onPress}>
      <Text style={[s.sortLabel, active && { color: colors.fg }]}>{label}</Text>
      {active ? <SortIcon size={12} color={colors.fg} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  headerArea: { padding: 16, paddingBottom: 0, gap: 8 },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.fg,
  },
  countHint: { fontSize: 11, color: colors.subtle },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.fg,
    fontSize: 14,
    paddingVertical: 0,
  },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  chipTextActive: { color: colors.accentFg },
  sortRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortLabel: { fontSize: 11, fontWeight: "600", color: colors.subtle },
  list: { padding: 16, paddingTop: 8, gap: 6, paddingBottom: 40 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 80,
  },
  emptyFilter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 14, color: colors.muted },
  emptyHint: {
    fontSize: 12,
    color: colors.subtle,
    textAlign: "center",
    maxWidth: 260,
  },
  clearLink: {
    fontSize: 13,
    color: colors.accent,
    textDecorationLine: "underline",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "rgba(193,123,106,0.12)",
    marginTop: 4,
  },
  clearAllText: { fontSize: 11, fontWeight: "500", color: colors.down },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: { padding: 8 },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbFallbackText: { fontSize: 11, color: colors.muted },
  rowTitleInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { fontSize: 14, fontWeight: "500", color: colors.fg, flex: 1 },
  mutedText: { color: colors.muted, fontWeight: "400" },
  subtitle: { fontSize: 12, color: colors.muted },
  signal: { alignItems: "center", gap: 2, width: 42 },
  signalPct: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
});
