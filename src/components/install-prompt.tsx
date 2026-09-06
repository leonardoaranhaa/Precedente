import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISSED_KEY = "precedente:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    dismiss();
  };

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
      <Download className="size-4 shrink-0 text-accent" />
      <p className="flex-1 text-xs text-muted">
        Instale o Precedente para acesso rápido direto da tela inicial.
      </p>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-medium text-bg transition-opacity hover:opacity-80"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-muted hover:text-fg"
        aria-label="Fechar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
