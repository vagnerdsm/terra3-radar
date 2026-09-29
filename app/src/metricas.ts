import { pct } from './format';
import type { Radar } from './types';

/**
 * Fórmula de cada métrica das visões de gerente e diretoria (tooltip ⓘ).
 * Os valores (data de corte, referência de share, pesos, faixas) vêm do radar.json,
 * e as regras espelham pipeline/build_data.py e derive.ts. Mudou lá, muda aqui.
 */
export type MetricaId = 'fat_12m' | 'share' | 'na_mesa' | 'atacar' | 'parados';

export interface Definicao {
  titulo: string;
  formula: string[];
  nota?: string[];
}

const br = (iso: string) => iso.split('-').reverse().join('/');
const dec = (v: number) => v.toFixed(2).replace('.', ',');

function diaSeguinteAnoAnterior(corte: string): string {
  const d = new Date(`${corte}T00:00:00`);
  d.setFullYear(d.getFullYear() - 1);
  d.setDate(d.getDate() + 1);
  return br(d.toISOString().slice(0, 10));
}

export function definicoes(meta: Radar['meta']): Record<MetricaId, Definicao> {
  const corte = br(meta.data_corte);
  const [ano, mes, dia] = meta.data_corte.split('-');
  const ref = pct(meta.benchmark_share);
  const p = meta.pesos;
  const faixa = (nome: string) => meta.faixas.find((f) => f.nome === nome)?.min ?? 0;
  const atacar = faixa('Atacar agora');
  const planejar = faixa('Planejar');

  return {
    fat_12m: {
      titulo: 'Faturamento 12 meses',
      formula: [`Fat. 12m = Σ vendas de ${diaSeguinteAnoAnterior(meta.data_corte)} a ${corte}`],
      nota: [
        `Variação = Σ vendas 01/01–${dia}/${mes}/${ano} ÷ Σ vendas 01/01–${dia}/${mes}/${Number(ano) - 1} − 1`,
        'Transações de clientes fora do cadastro ficam de fora.',
      ],
    },
    share: {
      titulo: 'Share of wallet',
      formula: ['Share = Σ Fat. 12m ÷ Σ Potencial da safra'],
      nota: [
        `Referência = ${ref}: share do cliente no percentil 75, entre os clientes com compra.`,
        'O share declarado na planilha não é usado.',
      ],
    },
    na_mesa: {
      titulo: 'Dinheiro na mesa',
      formula: [`Na mesa = Σ máx(0; Potencial × ${ref} − Fat. 12m)`],
      nota: ['Por cliente: quanto falta para chegar ao share de referência. Quem já passou da referência conta 0.'],
    },
    atacar: {
      titulo: 'Atacar agora',
      formula: [
        `Atacar = nº de clientes com score ≥ ${atacar}`,
        `Score = 100 × (${dec(p.oportunidade)} × Oportunidade + ${dec(p.queda)} × Queda + ${dec(p.recencia)} × Tempo sem comprar + ${dec(p.lead)} × Negociação parada)`,
      ],
      nota: [
        `Cada sinal vai de 0 a 1. Planejar: ${planejar} a ${atacar - 1} · Manter: abaixo de ${planejar}.`,
        'Clientes sem nenhuma compra na base ficam fora.',
      ],
    },
    parados: {
      titulo: 'Leads parados',
      formula: [
        `Parados = nº de clientes com último status no CRM = Aberto ou Em negociação e (${corte} − último contato) > 30 dias`,
      ],
      nota: [`Sem comprar há +120 dias = nº de clientes com (${corte} − última compra) > 120 dias.`],
    },
  };
}
