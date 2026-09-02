import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/aviso-de-risco")({ component: AvisoDeRisco });

function AvisoDeRisco() {
  return (
    <LegalPage title="Aviso de risco" updatedAt="setembro de 2026">
      <p className="rounded-md bg-down/10 px-4 py-3 text-sm leading-relaxed text-fg">
        <strong>O Precedente não é recomendação de investimento, sinal de compra
        ou venda, nem consultoria financeira.</strong> Ele mostra estatística
        descritiva sobre o passado de um par — não uma previsão sobre o futuro.
        Leia este aviso inteiro antes de usar qualquer número deste app pra
        embasar uma decisão.
      </p>

      <h2>1. O que os números significam</h2>
      <p>
        Quando o app mostra "58% subiu em N barras", isso descreve o que
        aconteceu em ocasiões passadas parecidas com a condição atual — não a
        probabilidade de o preço subir agora. O passado de um mercado não
        garante seu comportamento futuro, especialmente em cripto, onde
        volatilidade e regime de mercado mudam rápido.
      </p>

      <h2>2. Amostra e confiabilidade</h2>
      <p>
        Quanto menor a amostra (número de ocorrências parecidas encontradas),
        menos essa estatística deveria pesar em qualquer decisão. O app
        sinaliza isso explicitamente (amostra "razoável", "limitada" ou
        "poucos casos") — leve essa sinalização a sério.
      </p>

      <h2>3. A leitura de print</h2>
      <p>
        Quando você envia um print, a leitura descreve só o que está
        visivelmente no print — não valida se aquilo reflete o mercado real
        no momento em que você lê, nem prevê o que vem a seguir.
      </p>

      <h2>4. Risco de cripto</h2>
      <p>
        Criptoativos são altamente voláteis, negociados 24/7, e podem perder
        valor rapidamente. Alavancagem (inclusive em simulações de cenário
        dentro do app) amplia tanto ganhos quanto perdas — um cenário
        simulado com alavancagem alta pode zerar ou inverter o resultado
        rapidamente. Nunca opere com dinheiro que você não pode perder.
      </p>

      <h2>5. Decisão é sua</h2>
      <p>
        Toda decisão de comprar, vender ou manter qualquer ativo é
        exclusivamente sua. Considere consultar um profissional habilitado
        antes de tomar decisões financeiras relevantes.
      </p>
    </LegalPage>
  );
}
