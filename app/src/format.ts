const nf = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const n0 = nf(0, 0);
const n1 = nf(1, 1);

/** R$ 1,2 mi · R$ 350 mil · R$ 820 */
export function brl(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const a = Math.abs(v);
  const sinal = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sinal}R$ ${n1.format(a / 1e6)} mi`;
  if (a >= 1e3) return `${sinal}R$ ${n0.format(a / 1e3)} mil`;
  return `${sinal}R$ ${n0.format(a)}`;
}

/** 0,092 -> 9,2% */
export function pct(v: number | null | undefined, casas = 1): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${nf(casas, casas).format(v * 100)}%`;
}

export function int(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return n0.format(v);
}

export function data(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function dataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function diasEntre(deIso: string, ateIso: string): number {
  return Math.round((Date.parse(ateIso.slice(0, 10)) - Date.parse(deIso.slice(0, 10))) / 86_400_000);
}

export function primeiroNome(nome: string): string {
  return nome.split(' ')[0];
}

export function iniciais(nome: string): string {
  const p = nome.split(/[\s/]+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
