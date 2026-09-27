import { diasEntre } from './format';
import { compararFoco, type ClienteFoco } from './scoring';
import type { Fixado, Registro } from './types';

/** Segunda-feira 00:00 da semana corrente (horário local). */
export function inicioDaSemana(d = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - dow);
  return x;
}

export function registrosDaSemana(registros: Registro[]): Registro[] {
  const ini = inicioDaSemana().getTime();
  return registros.filter((r) => Date.parse(r.criado_em) >= ini);
}

export interface ItemFila extends ClienteFoco {
  fixado: Fixado | null;
  ultimoRegistro: Registro | null; // desta semana
}

/** Fixados no topo (ordem de fixação), depois quem o foco ativo faz subir, depois o resto; score dentro de cada grupo. Sem compra na base fica fora. */
export function montarFila(clientes: ClienteFoco[], fixados: Fixado[], registrosSemana: Registro[]): ItemFila[] {
  const fix = new Map(fixados.map((f) => [f.cliente_id, f]));
  const reg = new Map<number, Registro>();
  for (const r of registrosSemana) {
    const atual = reg.get(r.cliente_id);
    if (!atual || r.criado_em > atual.criado_em) reg.set(r.cliente_id, r);
  }
  return clientes
    .filter((c) => c.score != null)
    .map((c) => ({ ...c, fixado: fix.get(c.id) ?? null, ultimoRegistro: reg.get(c.id) ?? null }))
    .sort((a, b) => {
      if (a.fixado && b.fixado) return a.fixado.criado_em.localeCompare(b.fixado.criado_em);
      if (a.fixado) return -1;
      if (b.fixado) return 1;
      return compararFoco(a, b);
    });
}

/** Fila da semana = fixados + "Atacar agora". Feita = teve registro nesta semana. */
export function execucao(fila: ItemFila[]): { feitas: number; total: number } {
  const alvo = fila.filter((c) => c.fixado || c.faixa === 'Atacar agora');
  return { feitas: alvo.filter((c) => c.ultimoRegistro).length, total: alvo.length };
}

export function leadParado(c: ClienteFoco, dataCorte: string): boolean {
  return (
    (c.ult_status_lead === 'Aberto' || c.ult_status_lead === 'Em negociação') &&
    c.ult_contato != null &&
    diasEntre(c.ult_contato, dataCorte) > 30
  );
}

export interface Kpis {
  clientes: number;
  fat_12m: number;
  potencial: number;
  share: number;
  gap_rs: number;
  ytd_26: number;
  ytd_25: number;
  atacar: number;
  planejar: number;
  leads_parados: number;
  sem_compra_120d: number;
  base_inativa: number;
}

export function kpis(cs: ClienteFoco[], dataCorte: string): Kpis {
  const soma = (f: (c: ClienteFoco) => number) => cs.reduce((a, c) => a + f(c), 0);
  const fat = soma((c) => c.fat_12m);
  const pot = soma((c) => c.potencial);
  return {
    clientes: cs.length,
    fat_12m: fat,
    potencial: pot,
    share: pot ? fat / pot : 0,
    gap_rs: soma((c) => c.gap_rs),
    ytd_26: soma((c) => c.ytd_26),
    ytd_25: soma((c) => c.ytd_25),
    atacar: cs.filter((c) => c.faixa === 'Atacar agora').length,
    planejar: cs.filter((c) => c.faixa === 'Planejar').length,
    leads_parados: cs.filter((c) => leadParado(c, dataCorte)).length,
    sem_compra_120d: cs.filter((c) => (c.dias_sem_compra ?? 0) > 120).length,
    base_inativa: cs.filter((c) => c.score == null).length,
  };
}
