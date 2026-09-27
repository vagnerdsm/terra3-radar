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
app/                 front-end (próxima etapa)
docs/                one-pager, wireframe, notas
```

## Como rodar
```bash
pip install -r requirements.txt
python pipeline/build_data.py
```

## Score (0–100)
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
