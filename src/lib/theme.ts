export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "precedente.theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : "dark";
  } catch {
    return "dark";
  }
}

function systemPrefersLight(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

function resolvedTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (systemPrefersLight() ? "light" : "dark") : theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolvedTheme(theme));
}

export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* melhor esforço — o tema ainda se aplica só nesta sessão */
  }
  applyTheme(theme);
}

/**
 * Script inline embutido no <head>, executado antes do primeiro paint, pra
 * aplicar o tema salvo sem o flash de "escuro por um instante, depois claro".
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = window.localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || "dark";
    var light = t === "light" || (t === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
  } catch (e) {}
})();
`;
