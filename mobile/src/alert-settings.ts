import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "precedente.alerts.v1";

export type AlertRules = {
  enabled: boolean;
  sampleWeak: boolean;
  sampleRegime: boolean;
  drawdownPath: boolean;
  drawdownThresholdPct: number;
  extreme20: boolean;
  fundingExtreme: boolean;
  fundingThreshold: number;
  volumeAnomaly: boolean;
  volumeMultiple: number;
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
  volumeAnomaly: true,
  volumeMultiple: 3,
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
