import { useEffect, useRef, useState } from "react";
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { analyze, fetchTopTraded } from "./src/api";
import { Mark } from "./src/components/Mark";
import type { PipelineStep } from "./src/components/Pipeline";
import { fonts, useAppFonts } from "./src/fonts";
import { toAnalysisDataUrl, toThumbDataUrl } from "./src/image";
import { loadHistory, pushHistory } from "./src/history";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { HomeScreen, type PickedImage } from "./src/screens/HomeScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { WatchScreen } from "./src/screens/WatchScreen";
import { colors } from "./src/theme";
import { normalizeTicker } from "./src/format";
import type { StoredAnalysis, Timeframe } from "./src/types";
import {
  isWatched,
  loadWatchlist,
  removeWatch,
  upsertWatch,
  type WatchItem,
} from "./src/watchlist";

type Screen = "home" | "history" | "result" | "watch";

export default function App() {
  const [fontsLoaded] = useAppFonts();

  const [view, setView] = useState<Screen>("home");
  const [ticker, setTicker] = useState("BTC");
  const [timeframe, setTimeframe] = useState<Timeframe>("4h");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<PipelineStep>("ohlc");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoredAnalysis | null>(null);
  const [history, setHistory] = useState<StoredAnalysis[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [topTraded, setTopTraded] = useState<string[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);

  // Refs para refresh em sequência sem ler estado React obsoleto.
  const historyRef = useRef(history);
  const watchRef = useRef(watch);
  historyRef.current = history;
  watchRef.current = watch;

  useEffect(() => {
    loadHistory().then(setHistory);
    loadWatchlist().then(setWatch);
  }, []);

  useEffect(() => {
    fetchTopTraded(12)
      .then((pairs) => setTopTraded(pairs.map((p) => p.base)))
      .catch(() => {});
  }, []);

  if (!fontsLoaded) return null;

  async function run() {
    setError(null);
    setBusy(true);
    setStep("ohlc");
    const t1 = setTimeout(() => setStep("stats"), 600);
    const t2 = setTimeout(() => setStep(image ? "vision" : "stats"), 1400);
    try {
      const imageDataUrl = image
        ? await toAnalysisDataUrl(image.uri, image.width, image.height)
        : null;
      const payload = await analyze({
        ticker: normalizeTicker(ticker),
        timeframe,
        imageDataUrl,
      });
      const thumbUri = image
        ? await toThumbDataUrl(image.uri, image.width, image.height)
        : null;
      const stored: StoredAnalysis = {
        ...payload,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        hasImage: Boolean(image),
        thumbUri,
      };
      setResult(stored);
      const nextHistory = await pushHistory(historyRef.current, stored);
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      if (isWatched(watchRef.current, stored)) {
        const nextWatch = await upsertWatch(watchRef.current, stored);
        setWatch(nextWatch);
        watchRef.current = nextWatch;
      }
      setStep("done");
      setView("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a análise.");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setBusy(false);
    }
  }

  async function toggleWatch(analysis: StoredAnalysis) {
    if (isWatched(watchRef.current, analysis)) {
      const next = await removeWatch(
        watchRef.current,
        `${analysis.ticker}:${analysis.timeframe}`,
      );
      setWatch(next);
      watchRef.current = next;
    } else {
      const next = await upsertWatch(watchRef.current, analysis);
      setWatch(next);
      watchRef.current = next;
    }
  }

  /** Reavalia um par da watch via API (sem print). */
  async function refreshWatchItem(
    item: WatchItem,
    opts?: { openResult?: boolean; silent?: boolean },
  ): Promise<StoredAnalysis | null> {
    if (!opts?.silent) {
      setWatchError(null);
      setRefreshingId(item.id);
    }
    try {
      const payload = await analyze({
        ticker: item.ticker,
        timeframe: item.timeframe,
        imageDataUrl: null,
      });
      const stored: StoredAnalysis = {
        ...payload,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        hasImage: false,
        thumbUri: null,
      };
      const nextHistory = await pushHistory(historyRef.current, stored);
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      const nextWatch = await upsertWatch(watchRef.current, stored);
      setWatch(nextWatch);
      watchRef.current = nextWatch;
      if (opts?.openResult) {
        setResult(stored);
        setView("result");
      }
      return stored;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao reavaliar este par.";
      if (!opts?.silent) setWatchError(message);
      return null;
    } finally {
      if (!opts?.silent) setRefreshingId(null);
    }
  }

  async function refreshAllWatch() {
    if (watchRef.current.length === 0 || refreshingAll) return;
    setWatchError(null);
    setRefreshingAll(true);
    const list = [...watchRef.current];
    let failed = 0;
    for (const item of list) {
      const stored = await refreshWatchItem(item, { silent: true });
      if (!stored) failed += 1;
    }
    setRefreshingAll(false);
    if (failed > 0) {
      setWatchError(
        failed === list.length
          ? "Não foi possível reavaliar nenhum par. Confira a rede e o backend."
          : `${failed} par(es) falharam na reavaliação.`,
      );
    }
  }

  function openFromWatch(item: WatchItem) {
    const fromHistory = historyRef.current.find(
      (h) => h.ticker === item.ticker && h.timeframe === item.timeframe,
    );
    if (fromHistory) {
      setResult(fromHistory);
      setView("result");
      return;
    }
    void refreshWatchItem(item, { openResult: true });
  }

  const resultWatched = result ? isWatched(watch, result) : false;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <Pressable
          style={styles.brand}
          onPress={() => {
            setView("home");
            setError(null);
          }}
        >
          <Mark size={24} />
          <Text style={styles.brandText}>Precedente</Text>
        </Pressable>
        <View style={styles.tabs}>
          <Tab active={view === "home"} onPress={() => setView("home")} label="Analisar" />
          <Tab active={view === "watch"} onPress={() => setView("watch")} label="Watch" />
          <Tab active={view === "history"} onPress={() => setView("history")} label="Histórico" />
        </View>
      </View>

      {view === "result" && result ? (
        <ResultScreen
          analysis={result}
          onBack={() => setView("home")}
          watched={resultWatched}
          onToggleWatch={() => void toggleWatch(result)}
        />
      ) : view === "watch" ? (
        <WatchScreen
          items={watch}
          refreshingId={refreshingId}
          refreshingAll={refreshingAll}
          error={watchError}
          onOpen={openFromWatch}
          onRemove={(id) =>
            void removeWatch(watchRef.current, id).then((next) => {
              setWatch(next);
              watchRef.current = next;
            })
          }
          onRefresh={(item) => void refreshWatchItem(item, { openResult: true })}
          onRefreshAll={() => void refreshAllWatch()}
        />
      ) : view === "history" ? (
        <HistoryScreen
          items={history}
          onOpen={(item) => {
            setResult(item);
            setView("result");
          }}
        />
      ) : (
        <HomeScreen
          ticker={ticker}
          timeframe={timeframe}
          image={image}
          busy={busy}
          step={step}
          error={error}
          topTraded={topTraded}
          onTicker={setTicker}
          onTimeframe={setTimeframe}
          onImage={setImage}
          onSubmit={() => void run()}
        />
      )}
    </SafeAreaView>
  );
}

function Tab({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: colors.bgElevated }]}
    >
      <Text style={[styles.tabText, active && { color: colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  brandText: { fontFamily: fonts.display, fontSize: 17, color: colors.fg },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 3,
    flexShrink: 0,
  },
  tab: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 11, fontWeight: "500", color: colors.muted },
});
