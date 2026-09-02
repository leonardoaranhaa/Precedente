import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/termos")({ component: Termos });

function Termos() {
  return (
    <LegalPage title="Termos de uso" updatedAt="setembro de 2026">
      <p>
        Estes termos regem o uso do Precedente (o "app"). Ao usar o app, você concorda
        com eles. Se não concordar, não use o app.
      </p>

      <h2>1. O que o Precedente é</h2>
      <p>
        O Precedente é uma ferramenta de estatística descritiva sobre mercado cripto:
        ele busca, no histórico de preço de um par, condições parecidas com a
        atual e mostra o que costumou acontecer depois — frequência, caminho e
        drawdown. Opcionalmente, também descreve o que está visível num print de
        gráfico que você envia.
      </p>
      <p>
        O Precedente <strong>não é</strong> uma recomendação de investimento, não
        emite sinais de compra ou venda, e não executa ordens em nenhuma corretora
        ou exchange. Tudo que ele mostra é sobre o passado — não é previsão do
        futuro. Leia o{" "}
        <a href="/aviso-de-risco" className="text-fg underline underline-offset-4">
          aviso de risco
        </a>{" "}
        antes de usar os números pra qualquer decisão.
      </p>

      <h2>2. Conta e uso aceitável</h2>
      <p>
        Criar conta é opcional — ela existe só para sincronizar sua watchlist e
        histórico entre aparelhos. Você é responsável por manter sua senha em
        segurança e por tudo que acontecer na sua conta.
      </p>
      <ul>
        <li>Não use o app para automatizar abuso da nossa infraestrutura ou das APIs de terceiros que consumimos (Binance, DexScreener, Anthropic).</li>
        <li>Não tente contornar limites de uso, autenticação ou os controles anti-abuso do app.</li>
        <li>Não envie, via leitura de print, conteúdo que não seja um gráfico de mercado.</li>
      </ul>

      <h2>3. Plano premium e cobrança</h2>
      <p>
        Alguns recursos podem ser oferecidos como assinatura paga, processada
        pelo Stripe. Ao assinar, você autoriza cobranças recorrentes até
        cancelar — o cancelamento pode ser feito a qualquer momento pelo portal
        de cobrança, dentro do próprio app. Não damos reembolso de período já
        cobrado, salvo exigência legal.
      </p>

      <h2>4. Sem garantias</h2>
      <p>
        O app é fornecido "como está". Dados de mercado vêm de fontes externas
        (Binance, DexScreener) e podem atrasar, falhar ou conter erro — não
        garantimos disponibilidade contínua, exatidão ou completude dos dados
        ou das leituras geradas. Você usa o app por sua conta e risco.
      </p>

      <h2>5. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida por lei, o Precedente e seus responsáveis
        não respondem por perdas financeiras, diretas ou indiretas, decorrentes
        de decisões de investimento tomadas com base no app.
      </p>

      <h2>6. Alterações</h2>
      <p>
        Podemos atualizar estes termos. Mudanças relevantes serão refletidas
        nesta página, com a data de atualização no topo.
      </p>

      <h2>7. Contato</h2>
      <p>Dúvidas sobre estes termos podem ser enviadas pelos canais de suporte do app.</p>
    </LegalPage>
  );
}
