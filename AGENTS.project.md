# Instruções do projeto — Precedente

Este arquivo é lido com a mesma prioridade que `AGENTS.md` (§ "Project
instructions"). Além do que está aqui, uma sessão do Claude Code
acompanha este repositório e revisa o trabalho.

## Regra: nunca commitar/dar push sem revisão

**Não faça `git commit` nem `git push` direto em `main`.** Deixe as
mudanças no working tree (ou, se precisar salvar progresso, num branch
separado, nunca `main`) e avise que estão prontas pra revisão. A sessão
do Claude Code revisa, valida e decide como integrar (branch + PR, ou
push direto só em caso de incidente já combinado com o usuário).

**Por quê**: em 2026-09-03/04 um lote de commits direto em `main` (sem
essa revisão) causou dois problemas sérios, ambos invisíveis a
`npm run build`/`npm run typecheck` na hora de commitar:

1. Um commit ("feat(news): NewsContextPanel no analysis-result") apagou
   por acidente o componente `AnalysisResult` inteiro (620→1 linha); as
   duas tentativas seguintes de "restaurar" reconstruíram uma versão
   incompleta de memória em vez do conteúdo real, derrubando várias
   seções da tela de resultado sem nenhum erro de build.
2. Dois arquivos novos (`funding-digest-scan.ts`,
   `routes/api/billing/vision-status.ts`) importaram **estaticamente**
   um módulo que `src/lib/analyze.ts` importa **dinamicamente**
   (`market/onchain`, `billing/vision-quota`) — a mesma classe de bug já
   documentada em `analyze.ts`: o Rolldown corrompe o chunk quando o
   mesmo módulo cruza a fronteira cliente/servidor importado dos dois
   jeitos ao mesmo tempo. `vite build` compila normalmente; só quebra
   rodando o binário compilado de verdade (`SyntaxError: Export
   'ssr_exports' is not defined`) — foi um incidente real de produção.

Nenhum dos dois apareceu em `npm run typecheck` nem em `npm run build`
antes do commit. Só apareceram rodando o servidor compilado e testando
as rotas de verdade — por isso a exigência de revisão externa antes de
ir pra `main`, não só os gates automatizados de sempre.

## Checklist antes de pedir revisão

- `npm run typecheck` e `npm run lint` limpos.
- `npm run test:unit` passando.
- Se a mudança tocar `src/lib/analyze.ts` ou qualquer módulo que ele
  importa (estática ou dinamicamente): não mover um import de dinâmico
  pra estático (ou vice-versa) sem checar se esse mesmo módulo já é
  importado do outro jeito em outro arquivo — grep pelo caminho do
  módulo em todo `src/` antes de decidir.
- Componente grande sendo "restaurado" ou reescrito do zero por engano
  (merge ruim, edit que apagou o arquivo): não reconstruir de memória —
  recuperar do último commit bom (`git show <sha>:<path>`) e integrar a
  mudança nova por cima.

## Reforço técnico

Um hook de pre-commit (`scripts/hooks/pre-commit`, instalado via
`npm run prepare`) roda `npm run typecheck` automaticamente antes de
qualquer commit local e bloqueia se falhar. Ele pega a classe 1 de erro
acima (tipos incompatíveis); a classe 2 (bug só em runtime) não tem como
pegar num hook rápido — é exatamente por isso que a regra de revisão
externa acima existe.
