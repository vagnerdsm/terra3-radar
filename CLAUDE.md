# Terra3 Radar — briefing do projeto

App de priorização de carteira para a força de vendas da 3tentos (case prático, Canais Digitais).
Pergunta que o app responde: **"Quem eu ataco esta semana, e por quê?"**
É um app à parte do Terra3 (não é uma tela dentro dele): segue o padrão visual do Terra3, sem copiar o layout.

## Estado atual do repositório
- `data/raw/Case_Terra3_Base_Dados.xlsx` — base original (6 abas).
- `pipeline/build_data.py` — trata a base, calcula o score e gera `data/processed/radar.json`. Rodar: `pip install -r requirements.txt && python pipeline/build_data.py`.
- `data/processed/radar.json` — **fonte única de dados do app**. Contém: `meta` (data de corte, benchmark, pesos, faixas), `arvore` (3tentos → UN → regional → consultor, já agregada), `usuarios`, `clientes` (com score, componentes, ações, alertas), `mensal` (série por cliente), `qualidade` (log de tratamento).
- `app/` — app Vite + React + TS (telas: seleção de acesso, consultor, gerente, diretoria). `npm run dev` / `npm run build` dentro de `app/`. Estado em `src/storage.ts` (Supabase ou localStorage); schema em `app/supabase/schema.sql`.

Não altere a lógica do pipeline sem pedir. Não invente números: tudo que aparece na tela vem do `radar.json` ou do estado salvo pelo app.

## Stack
- Vite + React + TypeScript, CSS simples (ou Tailwind). Deploy na Vercel (build estático, `app/` como raiz).
- O app lê `radar.json` como arquivo estático (copiar para `app/public/` no build ou importar).
- Estado compartilhado (foco da diretoria, clientes fixados, registros de contato): **Supabase** quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` existirem; sem elas, cair para `localStorage` com a mesma interface (`storage.ts`). O app tem de funcionar nos dois modos.
- Opcional: GitHub Action que roda o pipeline quando a planilha em `data/raw/` mudar e commita o `radar.json`.

## Telas
1. **Seleção de acesso** (abertura): cards para escolher quem está acessando — Diretoria/GUN, os 4 gerentes regionais, os 11 consultores (lista em `usuarios`). Botão "Trocar acesso" sempre visível no topo (é simulação de login para a demo).
2. **Consultor — mobile-first** (prioridade máxima; ele abre o link no celular):
   - Topo enxuto: nome, "X de Y ações feitas na semana", selo do foco da diretoria.
   - Filtros em chips: Todos · Atacar agora · Planejar · Manter.
   - Fila de cards grandes: score (círculo), nome, cidade · cultura, ação principal + motivo em uma linha, R$ de espaço. Selo "Fixado por <gerente>" quando houver.
   - Indicadores (fat. 12m, share, dinheiro na mesa) recolhidos num bloco expansível.
3. **Detalhe do cliente** (bottom sheet no celular, painel lateral no desktop), nesta ordem:
   - Botões de contato: **WhatsApp**, Ligar, E-mail.
   - "O que fazer": as até 3 ações de `acoes`.
   - Contexto: compras 12m, potencial, share, última compra, último contato do CRM (`ult_status_lead`, `ult_assunto`), "Por que este score" como lista de motivos em texto (a partir de `componentes` e dos dados do cliente), `alertas`.
   - Registrar: Contatado · Agendado · Sem sucesso (+ nota opcional). Ao voltar do WhatsApp para o app, mostrar "Como foi?" com esses botões.
4. **Gerente** (desktop-first, responsivo): filtros GUN e Gerente travados (cadeado), Consultor livre. Aviso do foco da diretoria. KPIs da regional. Tabela de consultores (clientes, fat. 12m, share, na mesa, atacar, parados, **execução da fila** vinda dos registros). Top 5 da regional com botão **Fixar** (máx. 3 por consultor, com nota). Clique no consultor abre a fila dele.
5. **Diretoria** (desktop-first, responsivo): filtros em cascata GUN → Gerente → Consultor. KPIs da 3tentos, cards das UNs, tabela de regionais. Card **Foco da safra** (só diretoria edita). Painel "O que merece atenção" e **Qualidade dos dados** (lista de `qualidade`, com problema, quantidade e decisão).

Hierarquia: cliente → consultor → regional → UN → 3tentos. Cada perfil só enxerga o seu recorte; níveis acima do seu aparecem travados.

## Foco da diretoria (interação entre níveis)
O score e as faixas vêm **sempre** do `radar.json` (`score`, `faixa`); o front **não recalcula** nada. O foco só **reordena a fila**:

| Foco | Efeito na fila |
|---|---|
| Ganhar share (padrão) | Ordem normal, por score |
| Recuperar base | Clientes com ação "Reativar" ou "Recuperar volume" (em qualquer posição de `acoes`) vão para o topo, e essa ação vira a principal exibida |
| Destravar pipeline | O mesmo, com "Destravar negociação" |

Dentro de cada grupo (quem sobe / o resto), ordenar por score. Na tela **não mostrar percentuais nem pesos**: a diretoria vê "N clientes sobem para o topo das filas"; gerente e consultor veem o foco com a contagem de clientes afetados no seu recorte. No detalhe do cliente, "Por que este score" é uma lista de motivos em texto (não barras).

O foco tem autor, data e vigência; aparece como selo para gerente e consultor. Clientes fixados pelo gerente ficam no topo da fila, acima do score. Toda mudança fica registrada (quem, quando, o quê).

## Contatos
A base **não tem** telefone nem e-mail. Decisão: o botão de WhatsApp abre `https://wa.me/?text=<mensagem>` **sem número** (o usuário escolhe o contato), com mensagem pré-escrita conforme a ação principal. Ex.: "Olá! Aqui é o Cléber, da 3tentos. Queria retomar a conversa sobre o pós-venda, tem um tempinho essa semana?". Ligar/E-mail aparecem desabilitados com a legenda "dado não disponível na base — viria do Terra3". Nunca usar números que possam ser reais.

## Padrão visual (extraído do Figma do Terra3)
- Cores: primária `#19294B` (azul 3tentos), secundária `#B0282B` (vermelho), fundo `#F5F5F5`, cards `#FFFFFF`, texto `#3E3E3E`, texto secundário `#676767`, labels `#595959`, bordas `#D8D8D8`, neutro `#F0F0F0`, azul claro `#E0E7F5`, vermelho claro `#FFE4E3`, âmbar `#FFECBF`/`#5F4714`, amarelo `#F3D381`.
- Score: Atacar = círculo `#B0282B` texto branco · Planejar = `#F3D381` texto `#5F4714` · Manter = `#F0F0F0` texto `#595959`.
- Tipografia: títulos **Ubuntu** Bold (28/22/18), texto **Source Sans 3** (16/14/12).
- Cards: raio 4px, sombra `0 1px 4px rgba(0,0,0,.12)`. Selects: altura 40px, borda `#D8D8D8`, raio 4px.
- Sem barra lateral (o app é independente do Terra3). Cabeçalho com selo "3t" + "Radar de Carteira".
- Toque mínimo de 44px no celular; números com `tabular-nums`; formatação pt-BR (R$ 1,2 mi · R$ 350 mil · 9,2%).

## Referências
- Wireframe das três visões: https://claude.ai/artifact/6vw2T6y8oN7SuSiZs66myf
- One-pager do problema: https://claude.ai/code/artifact/8ea2b428-14cb-47b8-b02a-474c3ba81c9a
- Figma: https://www.figma.com/design/B9s795stKlFmGNCGtj83fn/Terra3

## Qualidade
- Checar no celular (375px) a fila do consultor e o detalhe do cliente antes de qualquer outra tela.
- README deve explicar: como rodar, como atualizar a base, variáveis do Supabase, decisões de dados.
