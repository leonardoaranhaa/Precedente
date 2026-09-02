import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Mark } from "@/components/mark";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Mark className="size-6" />
            <span className="font-display text-lg text-fg">Precedente</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Link>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl text-fg">{title}</h1>
          <p className="text-xs text-subtle">Última atualização: {updatedAt}</p>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-fg [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-base [&_h2]:text-fg [&_p]:text-muted [&_li]:text-muted [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>

        <p className="border-t border-border pt-5 text-xs text-subtle">
          <Link to="/termos" className="underline-offset-4 hover:text-fg hover:underline">
            Termos de uso
          </Link>
          {" · "}
          <Link to="/privacidade" className="underline-offset-4 hover:text-fg hover:underline">
            Privacidade
          </Link>
          {" · "}
          <Link
            to="/aviso-de-risco"
            className="underline-offset-4 hover:text-fg hover:underline"
          >
            Aviso de risco
          </Link>
        </p>
      </div>
    </main>
  );
}
