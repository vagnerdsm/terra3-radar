import type { Cliente, Componente, Faixa, FocoAtivo, FocoId, Pesos } from './types';

export const COMPONENTES: { id: Componente; nome: string; ajuda: string }[] = [
  { id: 'oportunidade', nome: 'Oportunidade', ajuda: 'R$ de espaço até o share de referência' },
  { id: 'queda', nome: 'Queda', ajuda: 'Compras 2026 vs. mesmo período de 2025' },
  { id: 'recencia', nome: 'Recência', ajuda: 'Dias sem comprar (pesa após 60 dias)' },
  { id: 'lead', nome: 'Lead parado', ajuda: 'Status do último contato no CRM' },
];

export const FOCOS: Record<FocoId, { nome: string; pesos: Pesos; descricao: string }> = {
  share: {
    nome: 'Ganhar share',
    pesos: { oportunidade: 0.4, queda: 0.25, recencia: 0.15, lead: 0.2 },
    descricao: 'Prioriza quem tem mais espaço de compra até o share de referência.',
  },
  base: {
    nome: 'Recuperar base',
    pesos: { oportunidade: 0.15, queda: 0.4, recencia: 0.35, lead: 0.1 },
    descricao: 'Prioriza clientes que caíram ou pararam de comprar.',
  },
  pipeline: {
    nome: 'Destravar pipeline',
    pesos: { oportunidade: 0.15, queda: 0.15, recencia: 0.1, lead: 0.6 },
    descricao: 'Prioriza negociações abertas e paradas no CRM.',
  },
};

export const FOCO_PADRAO: FocoAtivo = {
  id: 'padrao',
  foco: 'share',
  autor: 'Padrão do pipeline',
  criado_em: '',
  vigencia_ate: null,
  nota: null,
};

export const FAIXAS: Faixa[] = ['Atacar agora', 'Planejar', 'Manter'];

export function faixaDe(score: number): Faixa {
  if (score >= 60) return 'Atacar agora';
  if (score >= 40) return 'Planejar';
  return 'Manter';
}

export function classeFaixa(f: Faixa | null): string {
  if (f === 'Atacar agora') return 'atacar';
  if (f === 'Planejar') return 'planejar';
  return 'manter';
}

export interface ClienteScore extends Cliente {
  scoreFoco: number | null; // null = sem compra na base (fora da fila)
  faixaFoco: Faixa | null;
}

/** score = 100 × Σ(peso_i × componente_i), recalculado com os pesos do foco ativo. */
export function pontuar(c: Cliente, pesos: Pesos): ClienteScore {
  if (c.score == null) return { ...c, scoreFoco: null, faixaFoco: null };
  const s = Math.round(
    100 * COMPONENTES.reduce((acc, k) => acc + pesos[k.id] * c.componentes[k.id], 0),
  );
  return { ...c, scoreFoco: s, faixaFoco: faixaDe(s) };
}

/** Foco expirado volta ao padrão. */
export function focoVigente(f: FocoAtivo | null, hojeIso: string): FocoAtivo {
  if (!f) return FOCO_PADRAO;
  if (f.vigencia_ate && f.vigencia_ate < hojeIso.slice(0, 10)) return FOCO_PADRAO;
  return f;
}
