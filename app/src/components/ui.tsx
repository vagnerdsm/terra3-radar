import type { ReactNode } from 'react';
import { classeFaixa, FOCOS } from '../scoring';
import { data } from '../format';
import type { Faixa, FocoAtivo } from '../types';

export function ScoreCirculo({ score, faixa, tamanho = 48 }: { score: number | null; faixa: Faixa | null; tamanho?: number }) {
  return (
    <div
      className={`score ${classeFaixa(faixa)}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
      aria-label={score == null ? 'Sem score' : `Score ${score}, ${faixa}`}
      title={faixa ?? 'Sem compras na base'}
    >
      {score ?? '—'}
    </div>
  );
}

/** Selo do foco da diretoria. `afetados` = clientes do recorte que sobem para o topo. */
export function FocoSelo({ foco, afetados, onde }: { foco: FocoAtivo; afetados?: number; onde?: string }) {
  const f = FOCOS[foco.foco];
  const padrao = foco.id === 'padrao';
  const efeito = !f.acoes.length
    ? 'fila na ordem normal, por score'
    : afetados == null
      ? null
      : afetados === 0
        ? `nenhum cliente ${onde ?? ''} é afetado`
        : `${afetados} ${afetados === 1 ? 'cliente' : 'clientes'} ${onde ?? ''} ${afetados === 1 ? 'sobe' : 'sobem'} para o topo${onde ? '' : ' das filas'}`;
  return (
    <div className="foco-selo" title={f.descricao}>
      <span className="foco-selo-icone" aria-hidden>◎</span>
      <span>
        <strong>Foco da safra: {f.nome}</strong>
        <span className="foco-selo-meta">
          {padrao ? ' · padrão' : ` · por ${foco.autor} em ${data(foco.criado_em)}`}
          {foco.vigencia_ate && ` · até ${data(foco.vigencia_ate)}`}
        </span>
        {efeito && <span className="foco-selo-efeito">{efeito.replace(/\s+/g, ' ')}</span>}
      </span>
    </div>
  );
}

export function Kpi({ rotulo, valor, sub, destaque }: { rotulo: string; valor: ReactNode; sub?: ReactNode; destaque?: boolean }) {
  return (
    <div className={`kpi${destaque ? ' kpi-destaque' : ''}`}>
      <div className="kpi-rotulo">{rotulo}</div>
      <div className="kpi-valor num">{valor}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export interface Opcao {
  valor: string;
  rotulo: string;
}

export function Filtro({
  rotulo,
  valor,
  opcoes,
  travado,
  onChange,
}: {
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  travado?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <label className={`filtro${travado ? ' travado' : ''}`}>
      <span className="filtro-rotulo">
        {rotulo} {travado && <span aria-label="travado" title="Definido pelo seu acesso">🔒</span>}
      </span>
      <select value={valor} disabled={travado} onChange={(e) => onChange?.(e.target.value)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Barra({ valor, max = 1, classe = '' }: { valor: number; max?: number; classe?: string }) {
  const w = Math.max(0, Math.min(1, max ? valor / max : 0)) * 100;
  return (
    <div className="barra">
      <div className={`barra-fill ${classe}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Execucao({ feitas, total }: { feitas: number; total: number }) {
  const p = total ? feitas / total : 0;
  return (
    <div className="execucao" title={`${feitas} de ${total} ações da fila registradas nesta semana`}>
      <Barra valor={p} classe={p >= 0.7 ? 'ok' : p >= 0.3 ? 'medio' : 'baixo'} />
      <span className="num">
        {feitas}/{total}
      </span>
    </div>
  );
}
