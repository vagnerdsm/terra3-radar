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
   - Topo enxuto: nome, "X de Y ações feitas na semana", aviso do foco da diretoria (mensagem para o consultor, ver "Foco da diretoria").
   - Título da fila com ícone ⓘ que abre a tela "Como a fila é montada".
   - Filtros em chips: Todos · Atacar agora · Planejar · Manter.
   - Fila de cards grandes: **etiqueta da faixa** (nunca o número do score), nome, cidade · cultura, ação principal + motivo em uma linha, R$ de espaço. Selo "Fixado por <gerente>" quando houver.
   - Indicadores (fat. 12m, share, dinheiro na mesa) recolhidos num bloco expansível.
3. **Detalhe do cliente** (bottom sheet no celular, painel lateral no desktop), nesta ordem:
   - Etiqueta da faixa no topo (sem número de score).
   - Botões de contato: **WhatsApp**, Ligar, E-mail.
   - "O que fazer": as até 3 ações de `acoes` (a do foco primeiro, quando o foco troca a principal).
   - Contexto: compras 12m, potencial, share, última compra, último contato do CRM (`ult_status_lead`, `ult_assunto`), **"Por que está no topo"** como lista de motivos em texto com os dados do cliente (ex.: "Negociação de pós-venda parada há 425 dias", "Sem comprar há 259 dias"; sem barras nem pontos), `alertas` (texto curto, visual discreto: linha pequena em cinza, sem bloco colorido).
   - Registrar: Contatado · Agendado · Sem sucesso (+ nota opcional). Ao voltar do WhatsApp para o app, mostrar "Como foi?" com esses botões.
4. **Gerente** (desktop-first, responsivo): filtros GUN e Gerente travados (cadeado), Consultor livre. Aviso do foco da diretoria (com link para "Como a fila é montada"). KPIs da regional. Tabela de consultores (clientes, fat. 12m, share, na mesa, atacar, parados, **execução da fila** vinda dos registros). Top 5 da regional (com etiqueta da faixa, sem score) e botão **Fixar** (máx. 3 por consultor, com nota). Clique no consultor abre a fila dele.
5. **Diretoria** (desktop-first, responsivo): filtros em cascata GUN → Gerente → Consultor. KPIs da 3tentos, cards das UNs, tabela de regionais. Card **Foco da safra** (só diretoria edita; link para "Como a fila é montada"). Painel "O que merece atenção". **Sem** painel de qualidade dos dados: o tratamento da base fica documentado no README (seção "Tratamento dos dados").
6. **Como a fila é montada**: aberta pelo ⓘ ao lado do título da fila do consultor e pelo link no aviso do foco (gerente e diretoria). Tela cheia com botão de voltar no celular; painel lateral no desktop. Linguagem simples, sempre em **pontos, nunca em percentual**:
   - a) "Sua fila combina quatro sinais para mostrar primeiro quem precisa mais de você."
   - b) Os quatro sinais, com o máximo de pontos vindo de `meta.pesos` × 100: Oportunidade (até 40 pts, quanto o cliente ainda pode comprar comparado aos 25% melhores da base), Queda (até 25 pts, jan–set 2026 vs. jan–set 2025), Tempo sem comprar (até 15 pts, começa a contar após 60 dias), Negociação parada (até 20 pts, negociação aberta no CRM sem avanço).
   - c) Etiquetas: Atacar agora (60 pontos ou mais), Planejar (40 a 59), Manter (abaixo de 40), de `meta.faixas`.
   - d) Como o foco da diretoria reordena a fila (fixados primeiro, depois o grupo do foco, depois o resto).
   - e) Exemplo real da **Lajeado Sementes**, calculado do `radar.json` (componente × peso × 100, arredondado por maiores restos para a soma bater com o `score`): "Oportunidade 39 + Queda 20 + Tempo sem comprar 12 + Negociação parada 20 = 91 pontos → Atacar agora". Nunca fixar os números no código.

## Score fora da tela
- A ordem da fila é sempre o score, mas o **número do score não aparece em nenhuma tela** (fila, Top 5, listas da diretoria, detalhe). A única exceção é o exemplo da tela "Como a fila é montada".
- No lugar do número, etiqueta da faixa: **Atacar agora** fundo `#FFE4E3` texto `#B0282B` · **Planejar** fundo `#FFECBF` texto `#5F4714` · **Manter** fundo `#F0F0F0` texto `#595959`.

Hierarquia: cliente → consultor → regional → UN → 3tentos. Cada perfil só enxerga o seu recorte; níveis acima do seu aparecem travados.

## Foco da diretoria (interação entre níveis)
O score e as faixas vêm **sempre** do `radar.json` (`score`, `faixa`); o front **não recalcula** nada. O foco **nunca altera o score nem as faixas**, só a ordem: leva um grupo de clientes ao topo da fila; dentro do grupo e no restante, a ordem é o score.

| Foco (id) | Grupo que vai ao topo |
|---|---|
| **Prioridade geral** (`geral`, padrão) | Nenhum: a fila fica na ordem do score |
| Ganhar share (`share`) | Clientes cuja **ação principal** é "Ampliar share" |
| Recuperar base (`base`) | Clientes com "Reativar" ou "Recuperar volume" em **qualquer posição** de `acoes`; essa ação vira a principal exibida |
| Destravar pipeline (`pipeline`) | Clientes com "Destravar negociação" em **qualquer posição** de `acoes`; essa ação vira a principal exibida |

Ordem da fila: fixados pelo gerente → grupo do foco → o resto (score dentro de cada grupo).

**Mensagem do foco**: nunca textos técnicos ("ordem normal, por score", pesos, percentuais). Descreve o efeito para quem lê, com a contagem do recorte dele:
- Consultor: "Foco da diretoria: destravar negociações. Seus 8 clientes com negociação parada vêm primeiro."
- Gerente: "Foco da diretoria: destravar negociações. 20 clientes da sua regional subiram ao topo das filas."
- Diretoria, ao escolher: "56 negociações paradas sobem ao topo."
- Prioridade geral: "Sua fila está na ordem de prioridade geral: quem tem mais oportunidade, queda ou negociação parada vem primeiro."

O foco tem autor, data e vigência (vencido, volta para "Prioridade geral"); aparece como aviso para gerente e consultor. Toda mudança fica registrada (quem, quando, o quê). No Supabase, `foco_historico.foco` aceita `geral`, `share`, `base`, `pipeline`.

Teste de referência (375px): com o foco "Destravar pipeline", a fila de Cléber Minuzzi começa por Lajeado Sementes, Cerro Azul Cerealista e Tarumã Sementes.

## Contatos
A base **não tem** telefone nem e-mail. Decisão: o botão de WhatsApp abre `https://wa.me/?text=<mensagem>` **sem número** (o usuário escolhe o contato), com mensagem pré-escrita conforme a ação principal. Ex.: "Olá! Aqui é o Cléber, da 3tentos. Queria retomar a conversa sobre o pós-venda, tem um tempinho essa semana?". Ligar/E-mail aparecem desabilitados com a legenda "dado não disponível na base — viria do Terra3". Nunca usar números que possam ser reais.

## Padrão visual (extraído do Figma do Terra3)
- Cores: primária `#19294B` (azul 3tentos), secundária `#B0282B` (vermelho), fundo `#F5F5F5`, cards `#FFFFFF`, texto `#3E3E3E`, texto secundário `#676767`, labels `#595959`, bordas `#D8D8D8`, neutro `#F0F0F0`, azul claro `#E0E7F5`, vermelho claro `#FFE4E3`, âmbar `#FFECBF`/`#5F4714`, amarelo `#F3D381`.
- Etiqueta da faixa (no lugar do score): Atacar agora = fundo `#FFE4E3` texto `#B0282B` · Planejar = fundo `#FFECBF` texto `#5F4714` · Manter = fundo `#F0F0F0` texto `#595959`.
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
- README deve explicar: como rodar, como atualizar a base, variáveis do Supabase, decisões de dados, e ter a seção **"Tratamento dos dados"** com as inconsistências e decisões (fonte: `data/processed/qualidade_dados.json`; atualizar a tabela quando o pipeline mudar).

## Fluxo de entrega
- Depois de cada rodada de alterações: commit, push na branch de trabalho, **abrir o PR para a `main` e fazer o merge** quando ele estiver mergeável (sem conflito e com checks verdes). Se não der para fazer o merge, avisar o motivo.
- Após o merge, a próxima rodada começa da `main` atualizada (recriar a branch de trabalho a partir de `origin/main`).
