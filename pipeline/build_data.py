"""
Terra3 Radar — pipeline de dados.

Lê a base bruta (6 abas), trata inconsistências, calcula o score de prioridade
por cliente e agrega pela hierarquia Cliente > Consultor > Regional > UN > 3tentos.

Saídas (data/processed/):
  - radar.json          -> consumido pelo front
  - clientes.csv        -> tabela plana para auditoria
  - qualidade_dados.json -> log de tudo que foi tratado/descartado

Uso:  python pipeline/build_data.py
"""
from __future__ import annotations

import json
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "Case_Terra3_Base_Dados.xlsx"
OUT = ROOT / "data" / "processed"

# ---------------------------------------------------------------- parâmetros
DATA_CORTE = pd.Timestamp("2026-09-20")      # última transação da base
JANELA_12M = DATA_CORTE - pd.DateOffset(months=12)
DIAS_INATIVO = 180                           # sem compra há mais que isso = inativo de fato
PESOS = {"oportunidade": 0.40, "queda": 0.25, "recencia": 0.15, "lead": 0.20}
FAIXAS = [(60, "Atacar agora"), (40, "Planejar"), (0, "Manter")]
SEGMENTOS = ["Fertilizantes", "Sementes", "Proteção de Cultivos", "Especialidades"]

qualidade: list[dict] = []


def log(fonte, problema, qtd, decisao, impacto=None):
    qualidade.append({"fonte": fonte, "problema": problema, "qtd": int(qtd),
                      "decisao": decisao, "impacto": impacto})


def norm_txt(s: str) -> str:
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().strip().lower()


def parse_valor(v) -> float:
    if isinstance(v, str):
        return float(v.replace("R$", "").replace(".", "").replace(",", ".").strip())
    return float(v)


def brl(v):
    """Formata em pt-BR: R$ 1,2 mi / R$ 350 mil / R$ 90.000,00."""
    if v >= 1e6:
        return f"R$ {v/1e6:.1f} mi".replace(".", ",")
    return f"R$ {v/1e3:.0f} mil"


def brl_full(v):
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def pct(v):
    return "<1%" if v < 0.005 else f"{v:.0%}"


# ---------------------------------------------------------------- leitura
x = pd.read_excel(RAW, sheet_name=None)
estrutura = x["Estrutura_Regionais"]
cons = x["Consultores"]
cad = x["Cadastro_Clientes"].copy()
tr = x["Transacoes"].copy()
crm = x["Interacoes_CRM"].copy()
pot = x["Potencial_Safra"].copy()

# ---------------------------------------------------------------- cadastro
# Cidades com grafias diferentes (acento/caixa): padroniza pela forma mais comum.
cad["_cid"] = cad["Cidade"].map(norm_txt)
canon = (cad.groupby("_cid")["Cidade"]
         .agg(lambda s: max(s.value_counts().index, key=lambda c: (c[:1].isupper(), any(ord(ch) > 127 for ch in c), s.value_counts()[c]))))
n_var = (cad["Cidade"] != cad["_cid"].map(canon)).sum()
cad["Cidade"] = cad["_cid"].map(canon)
log("Cadastro_Clientes", "Mesma cidade escrita de formas diferentes (ex.: Quaraí/quaraí/Quarai)",
    n_var, "Padronizado para a grafia mais comum com acento")

n_area = cad["Área (ha)"].isna().sum()
log("Cadastro_Clientes", "Área (ha) vazia", n_area,
    "Mantido vazio; potencial vem da aba Potencial_Safra, que está completa")

cad["Data Cadastro"] = pd.to_datetime(cad["Data Cadastro"], dayfirst=True)

# ---------------------------------------------------------------- transações
tr["Valor"] = tr["Valor (R$)"].map(parse_valor)
n_txt = tr["Valor (R$)"].map(lambda v: isinstance(v, str)).sum()
log("Transacoes", "Valor como texto ('R$ 7076,94')", n_txt, "Convertido para número")

tr["Data"] = pd.to_datetime(tr["Data"], dayfirst=True)

orf = ~tr["ID_Cliente"].isin(cad["ID_Cliente"])
log("Transacoes", "Transação de cliente inexistente no cadastro (IDs 9xxx)", orf.sum(),
    "Separado em quarentena; não entra em nenhum nível da hierarquia",
    brl_full(tr.loc[orf, 'Valor'].sum()))
tr = tr[~orf]

# Divergência de UN: 'Unidade da Venda' vs UN atual do consultor dono do cliente
tmp = (tr.merge(cad[["ID_Cliente", "Consultor"]], on="ID_Cliente")
         .merge(cons[["Consultor", "Unidade de Negócio"]], on="Consultor"))
div = tmp["Unidade da Venda"] != tmp["Unidade de Negócio"]
log("Transacoes", "Unidade da Venda diverge da UN atual do consultor "
    "(todas na carteira de Diego Fontoura, transferido Sudeste→Sul em ago/2025)", div.sum(),
    "Hierarquia segue a carteira ATUAL (cliente→consultor→regional→UN). "
    "Campo original mantido para auditoria",
    brl_full(tmp.loc[div, 'Valor'].sum()))

# ---------------------------------------------------------------- CRM
crm["Data Contato"] = pd.to_datetime(crm["Data Contato"], dayfirst=True)
orf_c = ~crm["ID_Cliente"].isin(cad["ID_Cliente"])
log("Interacoes_CRM", "Interação de cliente inexistente no cadastro", orf_c.sum(), "Descartado")
crm = crm[~orf_c]
log("Interacoes_CRM", "Clientes sem nenhuma interação registrada",
    (~cad["ID_Cliente"].isin(crm["ID_Cliente"])).sum(),
    "Tratado como 'sem contato' — vira sinal de atenção, não erro")

# ---------------------------------------------------------------- potencial
pot = pot.rename(columns={"Potencial Total (R$)": "Potencial", "Share of Wallet": "SoW_declarado"})
log("Potencial_Safra", "Share of Wallet vazio", pot["SoW_declarado"].isna().sum(),
    "Não usado no score: share é recalculado a partir das compras reais")
_fat12_tmp = tr[tr["Data"] > DATA_CORTE - pd.DateOffset(months=12)].groupby("ID_Cliente")["Valor"].sum()
_corr = (pot.set_index("ID_Cliente")["SoW_declarado"]
         .corr(_fat12_tmp.reindex(pot["ID_Cliente"]).values / pot.set_index("ID_Cliente")["Potencial"]))
log("Potencial_Safra", "Share of Wallet declarado não bate com compras reais / potencial",
    len(pot), f"Correlação {_corr:.2f}. Score usa share calculado das transações; declarado fica só como referência")
p_arroz = pot.merge(cad[["ID_Cliente", "Cultura Principal"]], on="ID_Cliente")
log("Potencial_Safra", "Clientes de arroz com potencial calculado só em área de soja+milho",
    (p_arroz["Cultura Principal"] == "Arroz").sum(),
    "Mantido; sinalizado como premissa a validar com o negócio")

# ---------------------------------------------------------------- métricas por cliente
t12 = tr[tr["Data"] > JANELA_12M]
fat12 = t12.groupby("ID_Cliente")["Valor"].sum()

# YoY comparável: jan → data de corte, 2026 vs 2025 (a base começa em jan/2025)
ytd26 = tr[(tr["Data"] >= "2026-01-01") & (tr["Data"] <= DATA_CORTE)].groupby("ID_Cliente")["Valor"].sum()
ytd25 = tr[(tr["Data"] >= "2025-01-01") & (tr["Data"] <= DATA_CORTE - pd.DateOffset(years=1))].groupby("ID_Cliente")["Valor"].sum()
ult_compra = tr.groupby("ID_Cliente")["Data"].max()
segs12 = t12.groupby("ID_Cliente")["Segmento"].agg(lambda s: sorted(set(s)))

crm_sorted = crm.sort_values("Data Contato")
ult_int = crm_sorted.groupby("ID_Cliente").tail(1).set_index("ID_Cliente")

df = (cad.merge(cons[["Consultor", "Regional", "Gerente Regional", "Unidade de Negócio"]], on="Consultor", how="left")
         .merge(pot, on="ID_Cliente", how="left")
         .set_index("ID_Cliente"))
df["fat_12m"] = fat12.reindex(df.index).fillna(0)
df["ytd_26"] = ytd26.reindex(df.index).fillna(0)
df["ytd_25"] = ytd25.reindex(df.index).fillna(0)
df["ult_compra"] = ult_compra.reindex(df.index)
df["dias_sem_compra"] = (DATA_CORTE - df["ult_compra"]).dt.days
df["share_real"] = df["fat_12m"] / df["Potencial"]
df["segmentos_12m"] = segs12.reindex(df.index).apply(lambda v: v if isinstance(v, list) else [])
df["seg_faltantes"] = df["segmentos_12m"].apply(lambda v: [s for s in SEGMENTOS if s not in v])
df["ult_contato"] = ult_int["Data Contato"].reindex(df.index)
df["ult_status_lead"] = ult_int["Status do Lead"].reindex(df.index)
df["ult_assunto"] = ult_int["Assunto"].reindex(df.index)
df["dias_ult_contato"] = (DATA_CORTE - df["ult_contato"]).dt.days

# Benchmark: share que o quartil superior da base já atinge
BENCH = df.loc[df["fat_12m"] > 0, "share_real"].quantile(0.75)
df["gap_rs"] = (df["Potencial"] * BENCH - df["fat_12m"]).clip(lower=0)

# Variação YoY (None quando não havia compra em 2025 no mesmo período)
df["var_yoy"] = np.where(df["ytd_25"] > 0, df["ytd_26"] / df["ytd_25"] - 1, np.nan)

# Status real vs cadastro
df["ativo_real"] = df["dias_sem_compra"].le(DIAS_INATIVO)
conflito = (df["Status"] == "Inativo") & df["ativo_real"]
log("Cadastro_Clientes", "Cliente 'Inativo' no cadastro mas com compra nos últimos 180 dias",
    conflito.sum(), "Considerado ativo (comportamento de compra vence o cadastro); sinalizado na tela")
nunca = df["ult_compra"].isna()
log("Cadastro_Clientes", "Cliente sem nenhuma transação na base", nunca.sum(),
    "Fora da fila de prioridade; listado como 'base inativa'")

# ---------------------------------------------------------------- score
def pct_rank(s):
    return s.rank(pct=True).fillna(0)

s_opp = pct_rank(df["gap_rs"].where(df["gap_rs"] > 0))
s_queda = (-df["var_yoy"]).clip(0, 1).fillna(0)
s_rec = ((df["dias_sem_compra"] - 60) / 240).clip(0, 1).fillna(1)

def lead_score(r):
    st, dias = r["ult_status_lead"], r["dias_ult_contato"]
    if pd.isna(st):
        return 0.4                              # nunca contatado
    if st in ("Aberto", "Em negociação"):
        return float(np.clip(dias / 90, 0.2, 1))  # quanto mais parado, pior
    if st == "Sem retorno":
        return 0.6
    if st == "Perdido":
        return 0.5
    return 0.0                                  # Ganho

s_lead = df.apply(lead_score, axis=1)

df["s_oportunidade"], df["s_queda"], df["s_recencia"], df["s_lead"] = s_opp, s_queda, s_rec, s_lead
df["score"] = (100 * (PESOS["oportunidade"] * s_opp + PESOS["queda"] * s_queda
                      + PESOS["recencia"] * s_rec + PESOS["lead"] * s_lead)).round(0)
df.loc[nunca, "score"] = np.nan
df["faixa"] = df["score"].apply(lambda v: None if pd.isna(v) else next(n for lim, n in FAIXAS if v >= lim))


# ---------------------------------------------------------------- motivo + próxima ação
# O score diz QUEM atacar; a ordem das ações diz O QUE fazer primeiro,
# da mais concreta (negociação parada) para a mais aberta (cross-sell).
ORDEM = ["Destravar negociação", "Reativar", "Recuperar volume", "Ampliar share", "Cross-sell", "Primeiro contato"]

def acoes(r):
    out = []
    if r["ult_status_lead"] in ("Aberto", "Em negociação") and r["dias_ult_contato"] > 30:
        st = "em aberto" if r["ult_status_lead"] == "Aberto" else "em negociação"
        out.append(("Destravar negociação",
                    f"{r['ult_assunto']} {st} há {int(r['dias_ult_contato'])} dias sem avanço"))
    if r["dias_sem_compra"] > DIAS_INATIVO:
        out.append(("Reativar", f"Sem comprar há {int(r['dias_sem_compra'])} dias"))
    if not pd.isna(r["var_yoy"]) and r["var_yoy"] <= -0.25:
        out.append(("Recuperar volume", f"Compras caíram {abs(r['var_yoy']):.0%} vs. mesmo período de 2025"))
    if r["gap_rs"] > 0:
        out.append(("Ampliar share", f"Compra {pct(r['share_real'])} do potencial; espaço de {brl(r['gap_rs'])}"))
    if len(r["seg_faltantes"]) >= 2 and r["fat_12m"] > 0:
        out.append(("Cross-sell", "Não compra " + ", ".join(r["seg_faltantes"])))
    if pd.isna(r["ult_status_lead"]):
        out.append(("Primeiro contato", "Nenhuma interação registrada no CRM"))
    out.sort(key=lambda t: ORDEM.index(t[0]))
    return [{"tipo": t, "texto": s} for t, s in out[:3]]


df["acoes"] = df.apply(acoes, axis=1)
df["acao_principal"] = df["acoes"].apply(lambda a: a[0]["tipo"] if a else "Manter relacionamento")

# ---------------------------------------------------------------- agregações
def agrega(g: pd.DataFrame) -> dict:
    fila = g[g["score"].notna()]
    return {
        "clientes": int(len(g)),
        "fat_12m": round(g["fat_12m"].sum(), 2),
        "potencial": round(float(g["Potencial"].sum()), 2),
        "share_real": round(g["fat_12m"].sum() / g["Potencial"].sum(), 4),
        "gap_rs": round(g["gap_rs"].sum(), 2),
        "ytd_26": round(g["ytd_26"].sum(), 2),
        "ytd_25": round(g["ytd_25"].sum(), 2),
        "atacar_agora": int((fila["faixa"] == "Atacar agora").sum()),
        "leads_parados": int(((g["ult_status_lead"].isin(["Aberto", "Em negociação"])) & (g["dias_ult_contato"] > 30)).sum()),
        "sem_compra_120d": int((g["dias_sem_compra"] > 120).sum()),
        "score_medio_top5": round(fila["score"].nlargest(5).mean(), 1) if len(fila) else None,
    }


def cliente_json(cid, r):
    def d(v):
        return None if pd.isna(v) else v.strftime("%Y-%m-%d")
    return {
        "id": int(cid), "nome": r["Razão Social"], "cnpj": r["CNPJ"], "cidade": r["Cidade"],
        "cultura": r["Cultura Principal"], "area_ha": None if pd.isna(r["Área (ha)"]) else float(r["Área (ha)"]),
        "status_cadastro": r["Status"], "ativo_real": bool(r["ativo_real"]),
        "consultor": r["Consultor"], "regional": r["Regional"], "un": r["Unidade de Negócio"],
        "potencial": float(r["Potencial"]), "fat_12m": round(float(r["fat_12m"]), 2),
        "share_real": round(float(r["share_real"]), 4),
        "sow_declarado": None if pd.isna(r["SoW_declarado"]) else float(r["SoW_declarado"]),
        "gap_rs": round(float(r["gap_rs"]), 2),
        "ytd_26": round(float(r["ytd_26"]), 2), "ytd_25": round(float(r["ytd_25"]), 2),
        "var_yoy": None if pd.isna(r["var_yoy"]) else round(float(r["var_yoy"]), 4),
        "ult_compra": d(r["ult_compra"]),
        "dias_sem_compra": None if pd.isna(r["dias_sem_compra"]) else int(r["dias_sem_compra"]),
        "segmentos_12m": r["segmentos_12m"], "seg_faltantes": r["seg_faltantes"],
        "ult_contato": d(r["ult_contato"]), "ult_status_lead": None if pd.isna(r["ult_status_lead"]) else r["ult_status_lead"],
        "ult_assunto": None if pd.isna(r["ult_assunto"]) else r["ult_assunto"],
        "score": None if pd.isna(r["score"]) else int(r["score"]), "faixa": r["faixa"],
        "componentes": {k: round(float(r[f"s_{k}"]), 3) for k in PESOS},
        "acao_principal": r["acao_principal"], "acoes": r["acoes"],
        "alertas": ([ "Cadastro diz Inativo, mas comprou nos últimos 180 dias"] if (r["Status"] == "Inativo" and r["ativo_real"]) else [])
                   + (["Cliente transferido com o consultor (Sudeste → Sul)"] if r["Consultor"] == "Diego Fontoura" else []),
    }


arvore = {"nome": "3tentos", **agrega(df), "uns": []}
for un, g_un in df.groupby("Unidade de Negócio"):
    n_un = {"nome": un, **agrega(g_un), "regionais": []}
    for reg, g_reg in g_un.groupby("Regional"):
        n_reg = {"nome": reg, "gerente": g_reg["Gerente Regional"].iloc[0], **agrega(g_reg), "consultores": []}
        for c, g_c in g_reg.groupby("Consultor"):
            n_reg["consultores"].append({"nome": c, **agrega(g_c)})
        n_un["regionais"].append(n_reg)
    arvore["uns"].append(n_un)

# Usuários simulados (troca de perfil no front)
usuarios = [{"nome": "Diretoria / GUN", "perfil": "diretoria", "escopo": None}]
for _, r in estrutura.iterrows():
    usuarios.append({"nome": r["Gerente Regional"], "perfil": "gerente", "escopo": r["Regional"]})
for _, r in cons.iterrows():
    usuarios.append({"nome": r["Consultor"], "perfil": "consultor", "escopo": r["Consultor"]})

# Série mensal (para tendência) por cliente -> agregada no front
mensal = (tr.assign(mes=tr["Data"].dt.strftime("%Y-%m"))
            .groupby(["ID_Cliente", "mes"])["Valor"].sum().round(2).reset_index())

OUT.mkdir(parents=True, exist_ok=True)
radar = {
    "meta": {
        "data_corte": DATA_CORTE.strftime("%Y-%m-%d"),
        "benchmark_share": round(float(BENCH), 4),
        "pesos": PESOS, "faixas": [{"min": m, "nome": n} for m, n in FAIXAS],
        "dias_inativo": DIAS_INATIVO,
    },
    "arvore": arvore,
    "usuarios": usuarios,
    "clientes": [cliente_json(cid, r) for cid, r in df.sort_values("score", ascending=False).iterrows()],
    "mensal": mensal.rename(columns={"ID_Cliente": "id", "Valor": "valor"}).to_dict("records"),
    "qualidade": qualidade,
}
(OUT / "radar.json").write_text(json.dumps(radar, ensure_ascii=False, default=str), encoding="utf-8")
(OUT / "qualidade_dados.json").write_text(json.dumps(qualidade, ensure_ascii=False, indent=2), encoding="utf-8")
df.drop(columns=["_cid", "acoes"]).to_csv(OUT / "clientes.csv", encoding="utf-8-sig")

print(f"Benchmark de share (p75): {BENCH:.1%}")
print(f"Clientes: {len(df)} | na fila: {df['score'].notna().sum()} | Atacar agora: {(df['faixa']=='Atacar agora').sum()}")
for q in qualidade:
    print(f"- [{q['fonte']}] {q['problema']}: {q['qtd']}  -> {q['decisao']}" + (f"  ({q['impacto']})" if q['impacto'] else ""))
