import type { Acao, Cliente, Componente, Faixa, FocoAtivo, FocoId, Pesos } from './types';

/**
 * O score e a faixa vêm sempre do radar.json e nunca aparecem como número na fila.
 * O foco da diretoria não recalcula nada: só leva um grupo de clientes para o topo
 * da fila. Dentro do grupo e no restante, a ordem é o score.
 */
interface DefFoco {
  nome: string;
  /** Como o foco aparece na frase "Foco da diretoria: <tema>." */
  tema: string;
  /** Sai do grupo quem tem esta ação... */
  acoes: string[];
  /** ...na ação principal (true) ou em qualquer posição de `acoes` (false). */
  soPrincipal: boolean;
  /** Troca a ação principal exibida pela do foco. */
  trocaPrincipal: boolean;
  /** Descrição do grupo: singular / plural (ex.: "cliente com negociação parada"). */
  grupo: [string, string];
  /** Frase da diretoria ao escolher: "56 negociações paradas sobem ao topo." */
  resumo: [string, string];
}

export const FOCOS: Record<FocoId, DefFoco> = {
  geral: {
    nome: 'Prioridade geral',
    tema: 'prioridade geral',
    acoes: [],
    soPrincipal: false,
    trocaPrincipal: false,
    grupo: ['cliente', 'clientes'],
    resumo: ['', ''],
  },
  share: {
    nome: 'Ganhar share',
    tema: 'ganhar share',
    acoes: ['Ampliar share'],
    soPrincipal: true,
    trocaPrincipal: false,
    grupo: ['cliente com espaço para ampliar share', 'clientes com espaço para ampliar share'],
    resumo: ['cliente com espaço para ampliar share sobe ao topo', 'clientes com espaço para ampliar share sobem ao topo'],
  },
  base: {
    nome: 'Recuperar base',
    tema: 'recuperar a base',
    acoes: ['Reativar', 'Recuperar volume'],
    soPrincipal: false,
    trocaPrincipal: true,
    grupo: ['cliente parado ou em queda', 'clientes parados ou em queda'],
    resumo: ['cliente parado ou em queda sobe ao topo', 'clientes parados ou em queda sobem ao topo'],
  },
  pipeline: {
    nome: 'Destravar pipeline',
    tema: 'destravar negociações',
    acoes: ['Destravar negociação'],
    soPrincipal: false,
    trocaPrincipal: true,
    grupo: ['cliente com negociação parada', 'clientes com negociação parada'],
    resumo: ['negociação parada sobe ao topo', 'negociações paradas sobem ao topo'],
  },
};

export const ORDEM_FOCOS: FocoId[] = ['geral', 'share', 'base', 'pipeline'];

export const FRASE_GERAL =
  'quem tem mais oportunidade, queda ou negociação parada vem primeiro';

const plural = (n: number, [s, p]: [string, string]) => (n === 1 ? s : p);

/** Mensagem do foco para quem lê, com a contagem do recorte dele. */
export function mensagemFoco(foco: FocoId, n: number, leitor: 'consultor' | 'gerente' | 'diretoria', recorte?: string): string {
  const f = FOCOS[foco];
  if (foco === 'geral') {
    if (leitor === 'consultor') return `Sua fila está na ordem de prioridade geral: ${FRASE_GERAL}.`;
    return `As filas estão na ordem de prioridade geral: ${FRASE_GERAL}.`;
  }
  const inicio = `Foco da diretoria: ${f.tema}.`;
  if (leitor === 'consultor') {
    if (!n) return `${inicio} Nenhum cliente seu se encaixa agora; sua fila segue a prioridade geral.`;
    return n === 1
      ? `${inicio} Seu ${f.grupo[0]} vem primeiro.`
      : `${inicio} Seus ${n} ${f.grupo[1]} vêm primeiro.`;
  }
  const onde = recorte ?? (leitor === 'gerente' ? 'da sua regional' : '');
  if (!n) return `${inicio} Nenhum cliente ${onde} se encaixa agora.`.replace(/\s+/g, ' ');
  return `${inicio} ${n} ${n === 1 ? 'cliente' : 'clientes'} ${onde} ${n === 1 ? 'subiu' : 'subiram'} ao topo das filas.`.replace(/\s+/g, ' ');
}

/** Frase da diretoria ao escolher um foco. */
export function resumoFoco(foco: FocoId, n: number): string {
  if (foco === 'geral') return `Fila na ordem de prioridade geral: ${FRASE_GERAL}.`;
  if (!n) return 'Nenhum cliente se encaixa neste foco agora.';
  return `${n} ${plural(n, FOCOS[foco].resumo)}.`;
}

export const FOCO_PADRAO: FocoAtivo = {
  id: 'padrao',
  foco: 'geral',
  autor: 'Padrão',
  criado_em: '',
  vigencia_ate: null,
  nota: null,
};

export const FAIXAS: Faixa[] = ['Atacar agora', 'Planejar', 'Manter'];

export function classeFaixa(f: Faixa | null): string {
  if (f === 'Atacar agora') return 'atacar';
  if (f === 'Planejar') return 'planejar';
  return 'manter';
}

export interface ClienteFoco extends Cliente {
  /** Está no grupo do foco ativo: sobe para o topo da fila. */
  sobe: boolean;
  /** Ação principal exibida (a do foco, quando o foco troca a principal). */
  acaoPrincipal: string;
  /** Ações na ordem de exibição (a do foco primeiro, quando o foco troca a principal). */
  acoesExibidas: Acao[];
}

export function aplicarFoco(c: Cliente, foco: FocoId): ClienteFoco {
  const f = FOCOS[foco];
  const base = { ...c, sobe: false, acaoPrincipal: c.acao_principal, acoesExibidas: c.acoes };
  if (c.score == null || !f.acoes.length) return base;
  if (f.soPrincipal) return { ...base, sobe: f.acoes.includes(c.acao_principal) };
  const destaque = c.acoes.find((a) => f.acoes.includes(a.tipo));
  if (!destaque) return base;
  return {
    ...base,
    sobe: true,
    acaoPrincipal: f.trocaPrincipal ? destaque.tipo : c.acao_principal,
    acoesExibidas: f.trocaPrincipal ? [destaque, ...c.acoes.filter((a) => a !== destaque)] : c.acoes,
  };
}

/** Quem está no grupo do foco primeiro; dentro de cada grupo, score (e R$ de espaço no empate). */
export function compararFoco(a: ClienteFoco, b: ClienteFoco): number {
  if (a.sobe !== b.sobe) return a.sobe ? -1 : 1;
  return (b.score ?? -1) - (a.score ?? -1) || b.gap_rs - a.gap_rs;
}

/** Foco expirado volta ao padrão. Focos gravados com id desconhecido também. */
export function focoVigente(f: FocoAtivo | null, hojeIso: string): FocoAtivo {
  if (!f || !(f.foco in FOCOS)) return FOCO_PADRAO;
  if (f.vigencia_ate && f.vigencia_ate < hojeIso.slice(0, 10)) return FOCO_PADRAO;
  return f;
}

/* ---------- sinais do score (explicação e motivos) ---------- */

export const SINAIS: { id: Componente; nome: string; explicacao: string }[] = [
  { id: 'oportunidade', nome: 'Oportunidade', explicacao: 'quanto o cliente ainda pode comprar, comparado aos 25% melhores da base.' },
  { id: 'queda', nome: 'Queda', explicacao: 'compras de jan–set 2026 comparadas com jan–set 2025.' },
  { id: 'recencia', nome: 'Tempo sem comprar', explicacao: 'começa a contar após 60 dias.' },
  { id: 'lead', nome: 'Negociação parada', explicacao: 'negociação aberta no CRM sem avanço.' },
];

/**
 * Pontos de cada sinal (componente × peso × 100), arredondados de forma que a soma
 * bata exatamente com o score do radar.json (maiores restos).
 */
export function pontosPorSinal(c: Cliente, pesos: Pesos): Record<Componente, number> {
  const brutos = SINAIS.map((s) => ({ id: s.id, v: 100 * pesos[s.id] * c.componentes[s.id] }));
  const pts = Object.fromEntries(brutos.map((b) => [b.id, Math.floor(b.v)])) as Record<Componente, number>;
  const alvo = c.score ?? Math.round(brutos.reduce((a, b) => a + b.v, 0));
  let falta = alvo - Object.values(pts).reduce((a, b) => a + b, 0);
  for (const b of brutos.slice().sort((x, y) => (y.v % 1) - (x.v % 1))) {
    if (falta <= 0) break;
    pts[b.id] += 1;
    falta -= 1;
  }
  return pts;
}

/**
 * "Por que está no topo": frases com os dados do cliente, dos sinais que mais contam
 * (componente × peso do radar.json) para os que menos contam. Sinais fracos ficam de fora.
 */
export function motivos(c: Cliente, pesos: Pesos, brl: (v: number) => string, diasContato: number | null): string[] {
  const k = c.componentes;
  const frase: Record<Componente, string | null> = {
    oportunidade: c.gap_rs > 0 ? `Pode comprar mais ${brl(c.gap_rs)} para chegar ao nível dos melhores clientes` : null,
    queda:
      c.var_yoy != null && c.var_yoy < 0
        ? `Compras caíram de ${brl(c.ytd_25)} para ${brl(c.ytd_26)} (jan–set 2025 → 2026)`
        : null,
    recencia: c.dias_sem_compra != null ? `Sem comprar há ${c.dias_sem_compra} dias` : null,
    lead: (() => {
      const st = c.ult_status_lead;
      if (!st) return 'Nenhum contato registrado no CRM';
      const assunto = c.ult_assunto ? ` de ${c.ult_assunto.toLowerCase()}` : '';
      if (st === 'Em negociação') return `Negociação${assunto} parada${diasContato != null ? ` há ${diasContato} dias` : ''}`;
      if (st === 'Aberto') return `Proposta${assunto} em aberto${diasContato != null ? ` há ${diasContato} dias` : ''}`;
      if (st === 'Sem retorno') return 'Último contato ficou sem retorno';
      if (st === 'Perdido') return 'Última negociação foi perdida';
      return null;
    })(),
  };
  const ordenados = SINAIS.map((s) => ({ id: s.id, forca: k[s.id], contrib: pesos[s.id] * k[s.id] }))
    .filter((s) => frase[s.id])
    .sort((a, b) => b.contrib - a.contrib);
  const fortes = ordenados.filter((s) => s.forca >= 0.33);
  return (fortes.length ? fortes : ordenados.slice(0, 1)).map((s) => frase[s.id]!);
}
