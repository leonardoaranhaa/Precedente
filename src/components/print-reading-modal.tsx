import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PatternRegion } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thumb: string;
  padrao: string | null;
  region: PatternRegion | null;
};

/**
 * Print em tamanho grande com a região aproximada do padrão desenhada por
 * cima. A imagem é renderizada em `width:100% height:auto` (nunca
 * `object-cover`) de propósito: `region` vem em frações 0..1 relativas à
 * imagem inteira, então qualquer corte visual quebraria o alinhamento da
 * caixa. Sem `region`, só mostra o print ampliado — a IA não força uma
 * localização em que não confia.
 */
export function PrintReadingModal({ open, onOpenChange, thumb, padrao, region }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{padrao ?? "Print enviado"}</DialogTitle>
        <div className="relative mt-3 overflow-hidden rounded-lg bg-bg">
          <img src={thumb} alt="Print enviado, em tamanho ampliado" className="block w-full h-auto" />
          {region ? (
            <div
              className={cn(
                "absolute rounded-sm border-2 border-accent",
                "shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]",
              )}
              style={{
                left: `${region.x * 100}%`,
                top: `${region.y * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            />
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          {region
            ? "Região aproximada de onde a leitura visual identificou o padrão — estimativa da IA sobre o print, não uma anotação exata nem sinal de entrada."
            : "A leitura visual não localizou uma região específica com confiança suficiente neste print."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
