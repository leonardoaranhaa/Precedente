import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { analyze, fetchTopTraded } from "./src/api";
import {
  DEFAULT_ALERT_RULES,
  loadAlertRules,
  saveAlertRules,
  type AlertRules,
} from "./src/alert-settings";
import { getStoredUser, signIn, signOut, signUp, updateName, type AuthUser } from "./src/auth";
import { openBillingPortal, startPremiumCheckout } from "./src/billing";
import { Mark } from "./src/components/Mark";
import type { PipelineStep } from "./src/components/Pipeline";
import { ScenarioAssistant } from "./src/components/ScenarioAssistant";
import { fonts, useAppFonts } from "./src/fonts";
import { toAnalysisDataUrl, toThumbDataUrl } from "./src/image";
import { loadHistory, pushHistory, saveHistory } from "./src/history";
import {
  registerForPushAsync,
  requestPushScan,
  syncPushSubscription,
} from "./src/notifications";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { HomeScreen, type PickedImage } from "./src/screens/HomeScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { WatchScreen } from "./src/screens/WatchScreen";
import { initSentry } from "./src/sentry";
import { hapticRefreshDone } from "./src/haptics";
import { getSyncData, setSyncData } from "./src/sync";

initSentry();
import { colors } from "./src/theme";
import { normalizeTicker } from "./src/format";
import type { StoredAnalysis, Timeframe, WatchRefreshMinutes } from "./src/types";
import {
  loadWatchRefreshMinutes,
  saveWatchRefreshMinutes,
} from "./src/watch-refresh";
import {
  isWatched,
  loadWatchlist,
  removeWatch,
  saveWatchlist,
  updateZone,
  upsertWatch,
  type PriceZone,
  type RsiZone,
  type WatchItem,
} from "./src/watchlist";
import { ZoneModal } from "./src/components/ZoneModal";

type Screen = "home" | "history" | "result" | "watch" | "alerts" | "account";

// Espera de inatividade antes de sincronizar watch/history com o servidor —
// absorve rajadas de mudanças (ex.: "Reavaliar todos") numa única escrita.
const SYNC_DEBOUNCE_MS = 1500;

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppInner() {
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
  const [autoRefreshMin, setAutoRefreshMin] = useState<WatchRefreshMinutes>(0);
  const [zoneItem, setZoneItem] = useState<WatchItem | null>(null);

  const [alertRules, setAlertRules] = useState<AlertRules>(DEFAULT_ALERT_RULES);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushSyncing, setPushSyncing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  const historyRef = useRef(history);
  const watchRef = useRef(watch);
  const refreshingAllRef = useRef(refreshingAll);
  const refreshAllFnRef = useRef<() => void>(() => {});
  historyRef.current = history;
  watchRef.current = watch;
  refreshingAllRef.current = refreshingAll;

  const syncPush = useCallback(
    async (rules: AlertRules, watches: WatchItem[], token: string | null) => {
      setPushSyncing(true);
      const res = await syncPushSubscription({ token, watches, rules });
      setPushSyncing(false);
      if (!res.ok) setPushStatus(res.error ?? "Falha ao sincronizar.");
      else if (rules.enabled && token) setPushStatus("Watch sincronizada.");
      else if (!rules.enabled) setPushStatus("Alertas desativados.");
    },
    [],
  );

  useEffect(() => {
    loadHistory().then(setHistory);
    loadWatchlist().then(setWatch);
    loadWatchRefreshMinutes().then(setAutoRefreshMin);
    getStoredUser().then(setUser);
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

  // Sincronização opcional: só entra em ação com login. Sem conta, tudo
  // continua 100% local, exatamente como antes — nenhuma chamada extra.
  useEffect(() => {
    if (!user || syncedUserIdRef.current === user.id) return;
    const userId = user.id;
    let cancelled = false;
    (async () => {
      const [serverWatch, serverHistory] = await Promise.all([getSyncData("watch"), getSyncData("history")]);
      if (cancelled) return;
      if (serverWatch == null && serverHistory == null) {
        // Primeiro login: sobe o que já existe só neste aparelho.
        void setSyncData("watch", watchRef.current);
        void setSyncData("history", historyRef.current);
      } else {
        // Já sincronizou antes (neste ou noutro aparelho): a conta manda.
        const nextWatch = (serverWatch as WatchItem[] | null) ?? [];
        const nextHistory = (serverHistory as StoredAnalysis[] | null) ?? [];
        setWatch(nextWatch);
        setHistory(nextHistory);
        watchRef.current = nextWatch;
        historyRef.current = nextHistory;
        await saveWatchlist(nextWatch);
        await saveHistory(nextHistory);
      }
      syncedUserIdRef.current = userId;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara na transição de login, não a cada mudança de watch/history
  }, [user?.id]);

  // Debounced: watch/history mudam em rajada (ex.: "Reavaliar todos"), e cada
  // mutação reescreveria o blob inteiro no servidor sem isso.
  useEffect(() => {
    if (!user || syncedUserIdRef.current !== user.id) return;
    const id = setTimeout(() => void setSyncData("watch", watch), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [user, watch]);

  useEffect(() => {
    if (!user || syncedUserIdRef.current !== user.id) return;
    const id = setTimeout(() => void setSyncData("history", history), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [user, history]);

  useEffect(() => {
    if (autoRefreshMin <= 0) return;
    const ms = autoRefreshMin * 60_000;
    const id = setInterval(() => {
      if (refreshingAllRef.current || watchRef.current.length === 0) return;
      refreshAllFnRef.current();
    }, ms);
    return () => clearInterval(id);
  }, [autoRefreshMin]);

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

  async function changeTimeframe(tf: Timeframe) {
    setTimeframe(tf);
    if (view !== "result" || !result) return;
    if (tf === result.timeframe) return;
    setError(null);
    setBusy(true);
    setStep("ohlc");
    try {
      const payload = await analyze({
        ticker: result.ticker,
        timeframe: tf,
        imageDataUrl: null,
      });
      const stored: StoredAnalysis = {
        ...payload,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        hasImage: false,
        thumbUri: null,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reanalisar.");
    } finally {
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
    if (watchRef.current.length === 0 || refreshingAllRef.current) return;
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
          ? `Nenhum par reavaliado. Confira sua conexão e tente de novo. (${failed.join(", ")})`
          : `Falhou: ${failed.join(", ")}. Os demais foram atualizados.`,
      );
    }
    // Confirmação tátil só quando algo de fato terminou bem — numa falha total
    // não é "sucesso" pra vibrar, seria feedback enganoso.
    if (failed.length < list.length) hapticRefreshDone();
  }

  refreshAllFnRef.current = () => {
    void refreshAllWatch();
  };

  function setAutoRefresh(v: WatchRefreshMinutes) {
    setAutoRefreshMin(v);
    void saveWatchRefreshMinutes(v);
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
        setPushStatus("Não deu pra ativar notificações. Use um aparelho físico e aceite a permissão.");
      }
    }
    await syncPush(next, watchRef.current, token);
  }

  async function handleRequestPermission() {
    const token = await registerForPushAsync();
    setPushToken(token);
    if (!token) {
      setPushStatus("Permissão negada, ou notificações indisponíveis neste aparelho.");
      return;
    }
    setPushStatus("Notificações ativadas.");
    if (alertRules.enabled) {
      await syncPush(alertRules, watchRef.current, token);
    }
  }

  async function handleScanNow() {
    setPushSyncing(true);
    setPushStatus("Verificando sua Watch…");
    await syncPush(alertRules, watchRef.current, pushToken);
    await requestPushScan();
    setPushSyncing(false);
    setPushStatus("Verificação feita. Se houver alerta, o push chega em instantes.");
  }

  async function handleSignIn(email: string, password: string) {
    setAuthError(null);
    setAuthBusy(true);
    const result = await signIn(email, password);
    setAuthBusy(false);
    if (!result.ok) {
      setAuthError(result.error);
      return;
    }
    setUser(result.user);
  }

  async function handleSignUp(name: string, email: string, password: string) {
    setAuthError(null);
    setAuthBusy(true);
    const result = await signUp(name, email, password);
    setAuthBusy(false);
    if (!result.ok) {
      setAuthError(result.error);
      return;
    }
    setUser(result.user);
  }

  async function handleUpdateName(name: string) {
    const result = await updateName(name);
    if (result.ok) setUser((u) => (u ? { ...u, name } : u));
    return result;
  }

  async function handleSignOut() {
    await signOut();
    syncedUserIdRef.current = null;
    setUser(null);
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
          <Tab active={view === "account"} onPress={() => setView("account")} label="Conta" />
        </View>
      </View>

      <View style={styles.body}>
        {view === "result" && result ? (
          <ResultScreen
            analysis={result}
            onBack={() => setView("home")}
            watched={resultWatched}
            onToggleWatch={() => void toggleWatch(result)}
            onChangeTimeframe={(tf) => void changeTimeframe(tf)}
            reanalyzing={busy && view === "result"}
            reanalyzeError={view === "result" ? error : null}
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
            onOpenZone={setZoneItem}
            onRefreshAll={() => void refreshAllWatch()}
            autoRefreshMin={autoRefreshMin}
            onAutoRefreshMin={setAutoRefresh}
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
            signedIn={Boolean(user)}
            onOpen={(item) => {
              setResult(item);
              setView("result");
            }}
          />
        ) : view === "account" ? (
          <AccountScreen
            user={user}
            busy={authBusy}
            error={authError}
            onSignIn={(email, password) => void handleSignIn(email, password)}
            onSignUp={(name, email, password) => void handleSignUp(name, email, password)}
            onSignOut={() => void handleSignOut()}
            onCheckout={startPremiumCheckout}
            onManage={openBillingPortal}
            onUpdateName={handleUpdateName}
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

        {view === "result" && result ? <ScenarioAssistant analysis={result} /> : null}
      </View>

      <ZoneModal
        visible={zoneItem != null}
        item={zoneItem}
        onClose={() => setZoneItem(null)}
        onSave={(zones: { priceZone: PriceZone; rsiZone: RsiZone }) => {
          if (!zoneItem) return;
          void updateZone(watchRef.current, zoneItem.id, zones).then((next) => {
            setWatch(next);
            watchRef.current = next;
            void syncPush(alertRules, next, pushToken);
          });
        }}
      />
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
