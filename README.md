# Terra3 Radar

Priorização de carteira para a força de vendas da 3tentos: **quem atacar primeiro, e por quê.**

Case prático — Consultor de Produtos Digitais · Canais Digitais.

## O problema
O consultor abre a carteira no Terra3 e não sabe por onde começar. A informação existe (cadastro,
transações, CRM, potencial de safra), mas em fontes separadas. O Radar junta tudo numa fila
ordenada por score, com o motivo e a próxima ação de cada cliente — e a mesma lógica somada
para gerente regional e diretoria.

## Estrutura
```
data/raw/            base original (xlsx, 6 abas)
data/processed/      saídas do pipeline
  radar.json         consumido pelo front (árvore da hierarquia + clientes + série mensal)
  clientes.csv       tabela plana para auditoria
  qualidade_dados.json  log de cada problema encontrado e a decisão tomada
pipeline/build_data.py  tratamento, score e agregação
app/                 front-end (Vite + React + TypeScript)
  public/radar.json  cópia do radar.json servida ao app (gerada por scripts/sync-data.mjs)
  supabase/schema.sql  tabelas do estado compartilhado
docs/                one-pager, wireframe, notas
```

## Como rodar

**App** (Node 20+):
```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # gera app/dist (estático)
```
`dev` e `build` rodam antes `scripts/sync-data.mjs`, que copia `data/processed/radar.json` para
`app/public/radar.json`. Se a pasta `data/` não estiver disponível (por exemplo, num deploy só de `app/`),
usa a cópia já commitada em `app/public/`.

**Pipeline** (Python 3.10+):
```bash
pip install -r requirements.txt
python pipeline/build_data.py
```

## Como atualizar a base
1. Substitua `data/raw/Case_Terra3_Base_Dados.xlsx` (mesmas 6 abas e colunas).
2. Rode `python pipeline/build_data.py` e depois `cd app && npm run sync-data` (ou `npm run build`).
3. Commite `data/processed/` e `app/public/radar.json`.

A GitHub Action `.github/workflows/pipeline.yml` faz os passos 2 e 3 sozinha quando a planilha ou o
pipeline mudam no repositório (também pode ser disparada à mão em *Actions → Atualizar radar.json*).

## Deploy (Vercel)
Projeto com **Root Directory = `app`**, framework Vite (detectado automaticamente): build `npm run build`,
saída `dist`. Configure as variáveis do Supabase (abaixo) em *Settings → Environment Variables* para ter
estado compartilhado. Sem elas, o app funciona do mesmo jeito, só que cada navegador guarda o próprio estado.

`app/vercel.json` fixa build e saída, manda qualquer rota para o `index.html` (SPA) e controla o cache:
`index.html` e `radar.json` sempre revalidados (um deploy novo aparece sem F5), `assets/` com cache longo
(os nomes têm hash).

**Tela em branco**: o app tem um `ErrorBoundary` (`src/components/ErrorBoundary.tsx`). Se uma tela quebrar,
ele remonta a tela sozinho uma vez; se quebrar de novo, mostra "Algo deu errado nesta tela" com a mensagem do
erro e um botão "Recarregar", em vez de deixar a página branca. A página também pede ao navegador para não
traduzir automaticamente (`translate="no"`), porque o tradutor altera o HTML por baixo do React.

## Estado compartilhado: Supabase ou localStorage
O app grava quatro coisas: **foco da safra** (diretoria), **clientes fixados** (gerente), **registros de
contato** (consultor) e a **trilha de auditoria** (quem, quando, o quê). Tudo passa por `app/src/storage.ts`,
que tem uma interface e duas implementações:

| Variável | Para quê |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | chave `anon` pública do projeto |

- **Com as duas variáveis** (em `app/.env.local` ou na Vercel): usa o Supabase. Rode antes
  `app/supabase/schema.sql` no SQL Editor do projeto. O app escuta inserções na tabela `auditoria`
  (Realtime) e recarrega quando outro usuário muda algo; também recarrega ao voltar para a aba.
- **Sem elas**: usa `localStorage` do navegador, com sincronização entre abas. O selo `local`/`online`
  no cabeçalho mostra o modo ativo.

As políticas do `schema.sql` liberam leitura e escrita para a chave anon, porque o login é simulado
(tela de seleção de acesso). Em produção, isso seria trocado pela autenticação do Terra3 com RLS por perfil.

## O app
- **Seleção de acesso**: Diretoria, 4 gerentes e 11 consultores (`usuarios`). "Trocar acesso" fica sempre no topo.
- **Consultor** (mobile-first): card "Atacar agora: N clientes" com as negociações paradas abaixo, aviso do foco,
  chips por faixa e "Sua fila", com cards que mostram a **etiqueta da faixa** (o número do score não aparece em
  nenhuma tela) e o último registro de contato (ex.: "Contatado em 27/09"). O detalhe abre como *bottom sheet*
  no celular e painel lateral no desktop, com WhatsApp, "O que fazer", contexto, "Por que está no topo" (motivos
  em texto) e o registro do contato. Ao voltar do WhatsApp, o app pergunta "Como foi?".
- **Como a fila é montada**: aberta pelo ⓘ ao lado do título da fila (e pelo link no aviso do foco, para
  gerente e diretoria). Tela cheia no celular, painel lateral no desktop. Explica os quatro sinais em pontos,
  as etiquetas, o foco e mostra o exemplo da Lajeado Sementes calculado do `radar.json`.
- **Gerente**: GUN e Gerente travados, Consultor livre. KPIs da regional, tabela de consultores, Top 5 com
  **Fixar** (máx. 3 por consultor, com nota). Clicar num consultor abre a fila dele.
- **Diretoria**: filtros em cascata GUN → Gerente → Consultor, KPIs, cards das UNs, tabela de regionais,
  **Foco da safra** (com vigência e recado), "O que merece atenção" e mudanças recentes. O tratamento da base
  não aparece no app: está documentado em [Tratamento dos dados](#tratamento-dos-dados).

**Registros de contato** (Contatado, Agendado, Sem sucesso): o app mostra só o último registro de cada cliente,
com a data, no card e no detalhe. Não há recorte por período nem totais de execução.

## Foco da safra
O score e a faixa de cada cliente vêm sempre do `radar.json`; o front não recalcula nada. O foco da diretoria
só **reordena as filas**:

| Foco | Grupo que vai ao topo |
|---|---|
| Prioridade geral (padrão) | Nenhum: a fila segue o score |
| Ganhar share | Clientes cuja ação principal é "Ampliar share" |
| Recuperar base | Clientes com "Reativar" ou "Recuperar volume" em qualquer posição de `acoes`; essa ação vira a principal exibida |
| Destravar pipeline | Clientes com "Destravar negociação" em qualquer posição de `acoes`; essa ação vira a principal exibida |

Ordem da fila: fixados pelo gerente → grupo do foco → o resto, sempre por score dentro de cada grupo. A mensagem
do foco fala com quem lê, com a contagem do recorte dele (ex.: consultor: "Seus 8 clientes com negociação parada
vêm primeiro."; gerente: "20 clientes da sua regional subiram ao topo das filas."; diretoria ao escolher:
"56 negociações paradas sobem ao topo."). Um foco com vigência vencida volta sozinho para "Prioridade geral".

Quem já usa o Supabase precisa rodar de novo o `schema.sql`: ele atualiza a restrição de `foco_historico`
para aceitar o novo foco `geral`.

## Score (0–100, calculado no pipeline)
| Sinal | Peso | Medida |
|---|---|---|
| Oportunidade | 40% | R$ até o cliente atingir o share do quartil superior da base (19,3% do potencial) |
| Queda | 25% | Compras jan–set 2026 vs. jan–set 2025 |
| Recência | 15% | Dias sem comprar (pesa após 60 dias) |
| Lead parado | 20% | Último status no CRM e há quanto tempo |

Faixas: **Atacar agora** ≥ 60 · **Planejar** 40–59 · **Manter** < 40.
Ação principal, da mais concreta para a mais aberta: Destravar negociação → Reativar →
Recuperar volume → Ampliar share → Cross-sell → Primeiro contato.

## Hierarquia
Cliente → Consultor → Regional → UN → 3tentos. A hierarquia segue a **carteira atual**
(ver [Tratamento dos dados](#tratamento-dos-dados) sobre a transferência de Diego Fontoura).

## Data de corte
20/09/2026 (última transação da base).

## Tratamento dos dados
Inconsistências encontradas na planilha pelo pipeline e a decisão tomada em cada uma. Fonte:
`data/processed/qualidade_dados.json` (regenerado a cada execução do pipeline; os números abaixo são da base atual).

| Aba | Inconsistência | Qtd. | Decisão | Impacto |
|---|---|---:|---|---:|
| Cadastro_Clientes | Mesma cidade escrita de formas diferentes (ex.: Quaraí/quaraí/Quarai) | 25 | Padronizado para a grafia mais comum com acento | — |
| Cadastro_Clientes | Área (ha) vazia | 21 | Mantido vazio; potencial vem da aba Potencial_Safra, que está completa | — |
| Cadastro_Clientes | Cliente "Inativo" no cadastro mas com compra nos últimos 180 dias | 11 | Considerado ativo (comportamento de compra vence o cadastro); sinalizado no detalhe do cliente | — |
| Cadastro_Clientes | Cliente sem nenhuma transação na base | 8 | Fora da fila de prioridade; tratado como "base inativa" | — |
| Transacoes | Valor como texto ('R$ 7076,94') | 8 | Convertido para número | — |
| Transacoes | Transação de cliente inexistente no cadastro (IDs 9xxx) | 6 | Separado em quarentena; não entra em nenhum nível da hierarquia | R$ 90.000,00 |
| Transacoes | Unidade da Venda diverge da UN atual do consultor (todas na carteira de Diego Fontoura, transferido Sudeste→Sul em ago/2025) | 166 | Hierarquia segue a carteira atual (cliente→consultor→regional→UN); campo original mantido para auditoria | R$ 4.629.138,60 |
| Interacoes_CRM | Interação de cliente inexistente no cadastro | 3 | Descartado | — |
| Interacoes_CRM | Clientes sem nenhuma interação registrada | 24 | Tratado como "sem contato": vira sinal de atenção, não erro | — |
| Potencial_Safra | Share of Wallet vazio | 22 | Não usado no score: share é recalculado a partir das compras reais | — |
| Potencial_Safra | Share of Wallet declarado não bate com compras reais / potencial | 205 | Correlação 0,06. Score usa o share calculado das transações; declarado fica só como referência | — |
| Potencial_Safra | Clientes de arroz com potencial calculado só em área de soja+milho | 50 | Mantido; premissa a validar com o negócio | — |

No app, o que afeta um cliente específico aparece de forma discreta no detalhe dele (campo `alertas` do
`radar.json`): "Inativo no cadastro, mas comprou nos últimos 180 dias" e "Veio na transferência Sudeste → Sul".

## Decisões de dados no app
- **Tudo vem do `radar.json`** ou do estado salvo. Os KPIs são somados a partir de `clientes`, com os mesmos
  critérios do pipeline, e batem com `arvore`.
- **Score fora da tela**: a fila é ordenada pelo score, mas a tela mostra só a etiqueta da faixa. A única
  exceção é o exemplo da tela "Como a fila é montada".
- **"Por que está no topo"** no detalhe lista, em frases com os dados do cliente, os sinais que mais contam
  (componente × peso do `radar.json`); sinais fracos (componente < 0,33) ficam de fora.
- **Pontos por sinal** (tela "Como a fila é montada"): componente × peso × 100, arredondado pelo método dos
  maiores restos para que a soma bata exatamente com o score do `radar.json`. Na Lajeado Sementes os valores
  brutos são 38,5 + 20,0 + 12,4 + 20,0 = 90,9 (score 91); o arredondamento simples daria 38 + 20 + 12 + 20 = 90,
  por isso a tela mostra 39 + 20 + 12 + 20 = 91.
- **Contatos**: a base não tem telefone nem e-mail. O WhatsApp abre `https://wa.me/?text=…` **sem número**,
  com mensagem pré-escrita conforme a ação principal. Ligar e E-mail aparecem desabilitados ("viria do Terra3").
- **Clientes sem nenhuma compra** (8) têm `score` nulo: ficam fora da fila e aparecem como "base inativa".
- **`NaN` no JSON**: o pipeline grava `NaN` literal em `faixa` desses 8 clientes, o que não é JSON válido
  no navegador. `sync-data.mjs` troca por `null` na cópia do app; o pipeline não foi alterado.
- Datas de "há N dias" usam a data de corte da base (20/09/2026); a data dos registros de contato é a data real
  em que foram feitos.
