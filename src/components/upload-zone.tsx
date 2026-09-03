import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { fileToDataUrl } from "@/lib/compress";
import { PLAN_LIMITS } from "@/lib/billing/plan-limits";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
};

export function UploadZone({ value, onChange, disabled }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingest = useCallback(
    async (file: Blob) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Envie uma imagem do gráfico.");
        return;
      }
      if (file.size > 8_000_000) {
        setError("Arquivo grande demais. Recorte o print.");
        return;
      }
      try {
        const url = await fileToDataUrl(file);
        onChange(url);
      } catch {
        setError("Não foi possível ler essa imagem.");
      }
    },
    [onChange],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const item = [...(e.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void ingest(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, ingest]);

  return (
    <div className="space-y-2" data-testid="upload-zone">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        data-testid="print-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void ingest(file);
          e.target.value = "";
        }}
      />
      {value ? (
        <div
          className="relative overflow-hidden rounded-xl bg-surface p-1.5 shadow-[var(--shadow-border)]"
          data-testid="print-preview"
        >
          <img
            src={value}
            alt="Print do gráfico"
            className="chart-print max-h-56 w-full rounded-lg object-contain"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-md bg-bg/80 text-fg shadow-[var(--shadow-border)]"
            aria-label="Remover print"
            data-testid="print-remove"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          data-testid="print-drop-label"
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void ingest(file);
          }}
          className={cn(
            "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl bg-surface px-4 py-8 text-center shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150",
            drag && "shadow-[var(--shadow-border-hover)] bg-bg-elevated",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-md bg-bg shadow-[var(--shadow-border)]">
            <ImagePlus className="size-5 text-accent" />
          </span>
          <span className="space-y-1">
            <span className="block text-sm font-medium text-fg">
              Envie o print do gráfico
            </span>
            <span className="block text-xs text-muted">
              Toque, solte o arquivo ou cole com Ctrl+V. Opcional — a estatística usa o OHLC real.
            </span>
            <span className="block text-[11px] leading-relaxed text-subtle">
              Leitura visual: até {PLAN_LIMITS.free.visionPerDay}/dia no plano gratuito (com
              conta); Premium amplia para {PLAN_LIMITS.premium.visionPerDay}/dia. Nunca é ordem
              de compra ou venda.
            </span>
          </span>
        </label>
      )}
      {error ? (
        <p className="text-xs text-down" data-testid="print-upload-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
