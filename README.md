# Terra3 Radar

Priorização de carteira para a força de vendas da 3tentos: **quem atacar esta semana, e por quê.**

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
- **Consultor** (mobile-first): quantas ações da semana já fez, selo do foco, chips por faixa, fila de cards
  (fixados no topo, depois score). O detalhe abre como *bottom sheet* no celular e painel lateral no desktop,
  com WhatsApp, "O que fazer", contexto, "Por que este score" e o registro do contato. Ao voltar do WhatsApp,
  o app pergunta "Como foi?".
- **Gerente**: GUN e Gerente travados, Consultor livre. KPIs da regional, tabela de consultores com
  execução da fila, Top 5 com **Fixar** (máx. 3 por consultor, com nota). Clicar num consultor abre a fila dele.
- **Diretoria**: filtros em cascata GUN → Gerente → Consultor, KPIs, cards das UNs, tabela de regionais,
  **Foco da safra** (com vigência e recado), "O que merece atenção", mudanças recentes e **Qualidade dos dados**.

**Execução da fila** = fila da semana (clientes fixados + "Atacar agora" com o foco ativo) que tem ao menos
um registro de contato desde segunda-feira.

## Foco da safra
O front recalcula `score = 100 × Σ(peso × componente)` com os `componentes` do `radar.json` e os pesos do foco
ativo (mesmas faixas: ≥ 60 / 40–59 / < 40). Com o foco padrão, o resultado bate com o `score` do pipeline em
todos os clientes. Um foco com vigência vencida volta sozinho para o padrão.

| Foco | Oportunidade | Queda | Recência | Lead |
|---|---|---|---|---|
| Ganhar share (padrão) | 40% | 25% | 15% | 20% |
| Recuperar base | 15% | 40% | 35% | 10% |
| Destravar pipeline | 15% | 15% | 10% | 60% |

## Score (0–100, pesos do foco padrão)
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
(ver `qualidade_dados.json` sobre a transferência de Diego Fontoura).

## Data de corte
20/09/2026 (última transação da base).

## Decisões de dados no app
- **Tudo vem do `radar.json`** ou do estado salvo. Os KPIs são somados a partir de `clientes`, com os mesmos
  critérios do pipeline; com o foco padrão, os totais batem com `arvore`. "Atacar agora" é recontado pelo foco ativo.
- **Contatos**: a base não tem telefone nem e-mail. O WhatsApp abre `https://wa.me/?text=…` **sem número**,
  com mensagem pré-escrita conforme a ação principal. Ligar e E-mail aparecem desabilitados ("viria do Terra3").
- **Clientes sem nenhuma compra** (8) têm `score` nulo: ficam fora da fila e aparecem como "base inativa".
- **`NaN` no JSON**: o pipeline grava `NaN` literal em `faixa` desses 8 clientes, o que não é JSON válido
  no navegador. `sync-data.mjs` troca por `null` na cópia do app; o pipeline não foi alterado.
- Datas de "há N dias" usam a data de corte da base (20/09/2026); a semana dos registros usa a data real.
