import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { analyze, fetchTopTraded } from "./src/api";
import {
  DEFAULT_ALERT_RULES,
  loadAlertRules,
  saveAlertRules,
  type AlertRules,
} from "./src/alert-settings";
import { Mark } from "./src/components/Mark";
import type { PipelineStep } from "./src/components/Pipeline";
import { ScenarioAssistant } from "./src/components/ScenarioAssistant";
import { fonts, useAppFonts } from "./src/fonts";
import { toAnalysisDataUrl, toThumbDataUrl } from "./src/image";
import { loadHistory, pushHistory } from "./src/history";
import {
  registerForPushAsync,
  requestPushScan,
  syncPushSubscription,
} from "./src/notifications";
import { AlertsScreen } from "./src/screens/AlertsScreen";
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

type Screen = "home" | "history" | "result" | "watch" | "alerts";

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
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [topTraded, setTopTraded] = useState<string[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);

  const [alertRules, setAlertRules] = useState<AlertRules>(DEFAULT_ALERT_RULES);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushSyncing, setPushSyncing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const historyRef = useRef(history);
  const watchRef = useRef(watch);
  historyRef.current = history;
  watchRef.current = watch;

  const syncPush = useCallback(
    async (rules: AlertRules, watches: WatchItem[], token: string | null) => {
      setPushSyncing(true);
      const res = await syncPushSubscription({ token, watches, rules });
      setPushSyncing(false);
      if (!res.ok) setPushStatus(res.error ?? "Falha ao sincronizar.");
      else if (rules.enabled && token) setPushStatus("Watch sincronizada com o backend.");
      else if (!rules.enabled) setPushStatus("Alertas desativados.");
    },
    [],
  );

  useEffect(() => {
    loadHistory().then(setHistory);
    loadWatchlist().then(setWatch);
    loadAlertRules().then(async (rules) => {
      setAlertRules(rules);
      if (rules.enabled) {
        const token = await registerForPushAsync();
        setPushToken(token);
        const watches = await loadWatchlist();
        await syncPush(rules, watches, token);
      }
    });
  }, [syncPush]);

  useEffect(() => {
    fetchTopTraded(12)
      .then((pairs) => setTopTraded(pairs.map((p) => p.base)))
      .catch(() => {});
  }, []);

  if (!fontsLoaded) return null;

  function touchFocus(id: string) {
    setFocusIds((current) => [id, ...current.filter((x) => x !== id)].slice(0, 8));
  }

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
        void syncPush(alertRules, nextWatch, pushToken);
      }
      touchFocus(`${stored.ticker}:${stored.timeframe}`);
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
    let next: WatchItem[];
    if (isWatched(watchRef.current, analysis)) {
      next = await removeWatch(watchRef.current, `${analysis.ticker}:${analysis.timeframe}`);
    } else {
      next = await upsertWatch(watchRef.current, analysis);
    }
    setWatch(next);
    watchRef.current = next;
    void syncPush(alertRules, next, pushToken);
  }

  async function refreshWatchItem(
    item: WatchItem,
    opts?: { openResult?: boolean; silent?: boolean; showProgress?: boolean },
  ): Promise<StoredAnalysis | null> {
    const showProgress = opts?.showProgress || !opts?.silent;
    if (showProgress) {
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
      void syncPush(alertRules, nextWatch, pushToken);
      if (opts?.openResult) {
        setResult(stored);
        setView("result");
      }
      return stored;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao reavaliar este par.";
      if (!opts?.silent) setWatchError(`${item.displayTicker}: ${message}`);
      return null;
    } finally {
      if (showProgress) setRefreshingId(null);
    }
  }

  async function refreshAllWatch() {
    if (watchRef.current.length === 0 || refreshingAll) return;
    setWatchError(null);
    setRefreshingAll(true);
    const list = [...watchRef.current];
    const failed: string[] = [];
    for (const item of list) {
      const stored = await refreshWatchItem(item, {
        silent: true,
        showProgress: true,
      });
      if (!stored) {
        failed.push(item.displayTicker.split("/")[0] ?? item.displayTicker);
      }
    }
    setRefreshingAll(false);
    setRefreshingId(null);
    if (failed.length > 0) {
      setWatchError(
        failed.length === list.length
          ? `Nenhum par reavaliado. Confira a rede e o backend. (${failed.join(", ")})`
          : `Falhou: ${failed.join(", ")}. Os demais foram atualizados.`,
      );
    }
  }

  function openFromWatch(item: WatchItem) {
    touchFocus(item.id);
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

  async function handleAlertRulesChange(next: AlertRules) {
    setAlertRules(next);
    await saveAlertRules(next);
    let token = pushToken;
    if (next.enabled && !token) {
      token = await registerForPushAsync();
      setPushToken(token);
      if (!token) {
        setPushStatus("Sem token de push. Use aparelho físico e aceite a permissão.");
      }
    }
    await syncPush(next, watchRef.current, token);
  }

  async function handleRequestPermission() {
    const token = await registerForPushAsync();
    setPushToken(token);
    if (!token) {
      setPushStatus("Permissão negada ou token indisponível neste ambiente.");
      return;
    }
    setPushStatus("Token obtido.");
    if (alertRules.enabled) {
      await syncPush(alertRules, watchRef.current, token);
    }
  }

  async function handleScanNow() {
    setPushSyncing(true);
    setPushStatus("Solicitando scan no backend…");
    await syncPush(alertRules, watchRef.current, pushToken);
    await requestPushScan();
    setPushSyncing(false);
    setPushStatus("Scan solicitado. Se houver condição, o push chega em instantes.");
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
          <Mark size={22} />
          <Text style={styles.brandText}>Precedente</Text>
        </Pressable>
        <View style={styles.tabs}>
          <Tab active={view === "home"} onPress={() => setView("home")} label="Analisar" />
          <Tab active={view === "watch"} onPress={() => setView("watch")} label="Watch" />
          <Tab active={view === "alerts"} onPress={() => setView("alerts")} label="Alertas" />
          <Tab active={view === "history"} onPress={() => setView("history")} label="Hist." />
        </View>
      </View>

      <View style={styles.body}>
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
            focusIds={focusIds}
            refreshingId={refreshingId}
            refreshingAll={refreshingAll}
            error={watchError}
            onOpen={openFromWatch}
            onRemove={(id) =>
              void removeWatch(watchRef.current, id).then((next) => {
                setWatch(next);
                watchRef.current = next;
                void syncPush(alertRules, next, pushToken);
              })
            }
            onRefresh={(item) => void refreshWatchItem(item, { openResult: true })}
            onRefreshAll={() => void refreshAllWatch()}
          />
        ) : view === "alerts" ? (
          <AlertsScreen
            rules={alertRules}
            pushToken={pushToken}
            watchCount={watch.length}
            syncing={pushSyncing}
            statusMessage={pushStatus}
            onChange={(next) => void handleAlertRulesChange(next)}
            onRequestPermission={() => void handleRequestPermission()}
            onScanNow={() => void handleScanNow()}
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

        {result ? <ScenarioAssistant analysis={result} /> : null}
      </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  brandText: { fontFamily: fonts.display, fontSize: 16, color: colors.fg },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 2,
    flexShrink: 1,
  },
  tab: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 10, fontWeight: "500", color: colors.muted },
  body: { flex: 1 },
});
