import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "precedente.alerts.v1";

export type AlertRules = {
  enabled: boolean;
  sampleWeak: boolean;
  drawdownPath: boolean;
  drawdownThresholdPct: number;
  extreme20: boolean;
};

export const DEFAULT_ALERT_RULES: AlertRules = {
  enabled: false,
  sampleWeak: true,
  drawdownPath: true,
  drawdownThresholdPct: 5,
  extreme20: true,
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
