import type { Acao, Cliente, Faixa, FocoAtivo, FocoId } from './types';

/**
 * O score e a faixa vêm sempre do radar.json. O foco da diretoria não recalcula nada:
 * só leva para o topo da fila os clientes que têm uma das ações do foco (em qualquer
 * posição de `acoes`), e essa ação passa a ser a principal exibida.
 */
export const FOCOS: Record<FocoId, { nome: string; acoes: string[]; descricao: string }> = {
  share: {
    nome: 'Ganhar share',
    acoes: [],
    descricao: 'Ordem normal da fila, por score.',
  },
  base: {
    nome: 'Recuperar base',
    acoes: ['Reativar', 'Recuperar volume'],
    descricao: 'Clientes para reativar ou recuperar volume sobem para o topo.',
  },
  pipeline: {
    nome: 'Destravar pipeline',
    acoes: ['Destravar negociação'],
    descricao: 'Clientes com negociação parada no CRM sobem para o topo.',
  },
};

export const FOCO_PADRAO: FocoAtivo = {
  id: 'padrao',
  foco: 'share',
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
  /** Tem ação do foco ativo: sobe para o topo da fila. */
  sobe: boolean;
  /** Ação principal exibida (a do foco, quando houver). */
  acaoPrincipal: string;
  /** Ações na ordem de exibição (a do foco primeiro). */
  acoesExibidas: Acao[];
}

export function aplicarFoco(c: Cliente, foco: FocoId): ClienteFoco {
  const alvo = FOCOS[foco].acoes;
  const destaque = c.score == null ? undefined : c.acoes.find((a) => alvo.includes(a.tipo));
  return {
    ...c,
    sobe: !!destaque,
    acaoPrincipal: destaque?.tipo ?? c.acao_principal,
    acoesExibidas: destaque ? [destaque, ...c.acoes.filter((a) => a !== destaque)] : c.acoes,
  };
}

/** Quem sobe primeiro; dentro de cada grupo, score (e R$ de espaço no empate). */
export function compararFoco(a: ClienteFoco, b: ClienteFoco): number {
  if (a.sobe !== b.sobe) return a.sobe ? -1 : 1;
  return (b.score ?? -1) - (a.score ?? -1) || b.gap_rs - a.gap_rs;
}

/** Foco expirado volta ao padrão. */
export function focoVigente(f: FocoAtivo | null, hojeIso: string): FocoAtivo {
  if (!f) return FOCO_PADRAO;
  if (f.vigencia_ate && f.vigencia_ate < hojeIso.slice(0, 10)) return FOCO_PADRAO;
  return f;
}

/* ---------- "Por que este score" em texto ---------- */

export type Peso = 'pesa muito' | 'pesa' | 'pesa pouco';

export interface Motivo {
  sinal: string;
  texto: string;
  peso: Peso;
  valor: number;
}

const intensidade = (v: number): Peso => (v >= 0.66 ? 'pesa muito' : v >= 0.33 ? 'pesa' : 'pesa pouco');

/** Traduz os componentes do radar.json em frases, do sinal mais forte ao mais fraco. */
export function motivos(c: Cliente, brl: (v: number) => string, diasContato: number | null): Motivo[] {
  const k = c.componentes;
  const lead = (() => {
    const st = c.ult_status_lead;
    if (!st) return 'Nenhum contato registrado no CRM';
    if (st === 'Aberto' || st === 'Em negociação')
      return `${c.ult_assunto ?? 'Negociação'} ${st === 'Aberto' ? 'em aberto' : 'em negociação'}${diasContato != null ? ` há ${diasContato} dias` : ''}`;
    if (st === 'Sem retorno') return 'Último contato ficou sem retorno';
    if (st === 'Perdido') return 'Última negociação foi perdida';
    return 'Última negociação foi ganha';
  })();
  const lista: Motivo[] = [
    {
      sinal: 'Oportunidade',
      texto: c.gap_rs > 0 ? `Espaço de ${brl(c.gap_rs)} até o share de referência` : 'Share já no nível de referência',
      peso: intensidade(k.oportunidade),
      valor: k.oportunidade,
    },
    {
      sinal: 'Queda',
      texto:
        c.var_yoy == null
          ? 'Sem histórico para comparar com 2025'
          : c.var_yoy < 0
            ? `Comprou menos em jan–set 2026 que no mesmo período de 2025 (de ${brl(c.ytd_25)} para ${brl(c.ytd_26)})`
            : 'Compras estáveis ou em alta vs. 2025',
      peso: intensidade(k.queda),
      valor: k.queda,
    },
    {
      sinal: 'Recência',
      texto: c.dias_sem_compra == null ? 'Nunca comprou' : `Última compra há ${c.dias_sem_compra} dias`,
      peso: intensidade(k.recencia),
      valor: k.recencia,
    },
    { sinal: 'Lead', texto: lead, peso: intensidade(k.lead), valor: k.lead },
  ];
  return lista.sort((a, b) => b.valor - a.valor);
}
