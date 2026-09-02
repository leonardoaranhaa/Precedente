import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacidade")({ component: Privacidade });

function Privacidade() {
  return (
    <LegalPage title="Privacidade" updatedAt="setembro de 2026">
      <p>
        Esta página explica quais dados o Precedente coleta, para que servem e
        quais direitos você tem sobre eles, em linha com a Lei Geral de Proteção
        de Dados (LGPD).
      </p>

      <h2>1. Uso sem conta</h2>
      <p>
        Você pode usar o app inteiro sem criar conta. Nesse caso, watchlist e
        histórico de análises ficam só no seu aparelho (localStorage no
        navegador, armazenamento local no app mobile) — nada disso chega aos
        nossos servidores além da própria chamada de análise.
      </p>

      <h2>2. Dados que coletamos com conta</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, email e senha (a senha nunca é guardada em texto puro — só o hash).</li>
        <li><strong>Sincronização:</strong> watchlist e histórico de análises, incluindo miniaturas de print que você tenha anexado, pra sincronizar entre aparelhos.</li>
        <li><strong>Assinatura:</strong> se você assinar o plano pago, o Stripe processa o pagamento — guardamos só o identificador do cliente/assinatura no Stripe, nunca dados de cartão.</li>
        <li><strong>Uso técnico:</strong> endereço IP, usado só para limitar abuso (rate limiting), sem guardar histórico de navegação; e um log técnico por análise (par, tempo gráfico, se teve print, duração) usado pra entender custo e uso do serviço.</li>
      </ul>

      <h2>3. Compartilhamento com terceiros</h2>
      <ul>
        <li><strong>Anthropic (Claude):</strong> quando você anexa um print, a imagem é enviada pra leitura visual. Não enviamos seu email, nome ou qualquer identificador pessoal junto com o print.</li>
        <li><strong>Stripe:</strong> processa pagamentos da assinatura; recebe email e dados de pagamento diretamente de você, nunca por nós.</li>
        <li><strong>Binance / DexScreener:</strong> consultamos preço e dados de mercado público desses provedores — nenhum dado seu é enviado a eles.</li>
      </ul>
      <p>Não vendemos dados pessoais a ninguém.</p>

      <h2>4. Retenção</h2>
      <p>
        Dados de conta e sincronização ficam guardados enquanto sua conta
        existir. Você pode pedir a exclusão a qualquer momento (seção 6).
      </p>

      <h2>5. Segurança</h2>
      <p>
        Senhas são hasheadas, sessões são assinadas e cookies de sessão usam
        prefixo <code>__Host-</code> com <code>Secure</code>/<code>HttpOnly</code>.
        Nenhum sistema é 100% livre de risco, mas seguimos práticas padrão de
        mercado para proteger seus dados.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Sob a LGPD, você pode pedir acesso, correção, portabilidade ou exclusão
        dos seus dados a qualquer momento pelos canais de suporte do app. Excluir
        a conta remove seu cadastro, watchlist e histórico sincronizados dos
        nossos servidores.
      </p>

      <h2>7. Contato</h2>
      <p>Pedidos relacionados a dados pessoais podem ser feitos pelos canais de suporte do app.</p>
    </LegalPage>
  );
}
