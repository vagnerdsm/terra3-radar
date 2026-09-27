export type Componente = 'oportunidade' | 'queda' | 'recencia' | 'lead';
export type Pesos = Record<Componente, number>;
export type Faixa = 'Atacar agora' | 'Planejar' | 'Manter';

export interface Acao {
  tipo: string;
  texto: string;
}

export interface Cliente {
  id: number;
  nome: string;
  cnpj: string;
  cidade: string;
  cultura: string;
  area_ha: number | null;
  status_cadastro: string;
  ativo_real: boolean;
  consultor: string;
  regional: string;
  un: string;
  potencial: number;
  fat_12m: number;
  share_real: number;
  sow_declarado: number | null;
  gap_rs: number;
  ytd_26: number;
  ytd_25: number;
  var_yoy: number | null;
  ult_compra: string | null;
  dias_sem_compra: number | null;
  segmentos_12m: string[];
  seg_faltantes: string[];
  ult_contato: string | null;
  ult_status_lead: string | null;
  ult_assunto: string | null;
  score: number | null;
  faixa: Faixa | null;
  componentes: Pesos;
  acao_principal: string;
  acoes: Acao[];
  alertas: string[];
}

export interface Agregado {
  nome: string;
  clientes: number;
  fat_12m: number;
  potencial: number;
  share_real: number;
  gap_rs: number;
  ytd_26: number;
  ytd_25: number;
  atacar_agora: number;
  leads_parados: number;
  sem_compra_120d: number;
  score_medio_top5: number | null;
}

export interface NoConsultor extends Agregado {}
export interface NoRegional extends Agregado {
  gerente: string;
  consultores: NoConsultor[];
}
export interface NoUN extends Agregado {
  regionais: NoRegional[];
}
export interface Arvore extends Agregado {
  uns: NoUN[];
}

export interface Usuario {
  nome: string;
  perfil: 'diretoria' | 'gerente' | 'consultor';
  escopo: string | null;
}

export interface Qualidade {
  fonte: string;
  problema: string;
  qtd: number;
  decisao: string;
  impacto: string | null;
}

export interface Radar {
  meta: {
    data_corte: string;
    benchmark_share: number;
    pesos: Pesos;
    faixas: { min: number; nome: Faixa }[];
    dias_inativo: number;
  };
  arvore: Arvore;
  usuarios: Usuario[];
  clientes: Cliente[];
  mensal: { id: number; mes: string; valor: number }[];
  qualidade: Qualidade[];
}

/* ---------- estado salvo pelo app (storage.ts) ---------- */

export type FocoId = 'share' | 'base' | 'pipeline';

export interface FocoAtivo {
  id: string;
  foco: FocoId;
  autor: string;
  criado_em: string; // ISO
  vigencia_ate: string | null; // YYYY-MM-DD
  nota: string | null;
}

export interface Fixado {
  id: string;
  cliente_id: number;
  consultor: string;
  gerente: string;
  nota: string | null;
  criado_em: string;
}

export type Resultado = 'contatado' | 'agendado' | 'sem_sucesso';

export interface Registro {
  id: string;
  cliente_id: number;
  consultor: string;
  autor: string;
  resultado: Resultado;
  canal: string | null;
  nota: string | null;
  criado_em: string;
}

export interface EventoAuditoria {
  id: string;
  quem: string;
  perfil: string;
  acao: string;
  detalhe: string;
  criado_em: string;
}
