import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "precedente.alerts.v1";

export type AlertRules = {
  enabled: boolean;
  sampleWeak: boolean;
  /** Transição de regime ok↔small↔tiny. */
  sampleRegime: boolean;
  drawdownPath: boolean;
  drawdownThresholdPct: number;
  extreme20: boolean;
  /** |funding| acima do limiar. */
  fundingExtreme: boolean;
  /** Fração (0.0005 = 0,05%). */
  fundingThreshold: number;
  /** Digest diário da watch (+ movers). */
  digestEnabled: boolean;
  digestHourUtc: number;
  includeMovers: boolean;
};

export const DEFAULT_ALERT_RULES: AlertRules = {
  enabled: false,
  sampleWeak: true,
  sampleRegime: true,
  drawdownPath: true,
  drawdownThresholdPct: 5,
  extreme20: true,
  fundingExtreme: true,
  fundingThreshold: 0.0005,
  digestEnabled: false,
  digestHourUtc: 12,
  includeMovers: true,
};

export async function loadAlertRules(): Promise<AlertRules> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ALERT_RULES };
    const parsed = JSON.parse(raw) as Partial<AlertRules>;
    return { ...DEFAULT_ALERT_RULES, ...parsed };
  } catch {
    return { ...DEFAULT_ALERT_RULES };
  }
}

export async function saveAlertRules(rules: AlertRules): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(rules));
}
