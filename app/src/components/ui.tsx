import type { ReactNode } from 'react';
import { classeFaixa } from '../scoring';
import { data } from '../format';
import type { Faixa, FocoAtivo } from '../types';

/** Etiqueta da faixa. O número do score nunca aparece na tela. */
export function FaixaEtiqueta({ faixa }: { faixa: Faixa | null }) {
  return <span className={`etiqueta etiqueta-${classeFaixa(faixa)}`}>{faixa ?? 'Sem compras'}</span>;
}

/** Aviso do foco da diretoria: mensagem para quem lê + quem definiu e até quando. */
export function FocoAviso({ foco, mensagem, onComoFunciona }: { foco: FocoAtivo; mensagem: string; onComoFunciona?: () => void }) {
  const padrao = foco.id === 'padrao';
  return (
    <div className={`foco-selo${foco.foco === 'geral' ? ' foco-geral' : ''}`}>
      <span className="foco-selo-icone" aria-hidden>◎</span>
      <span>
        <span className="foco-selo-texto">{mensagem}</span>
        {!padrao && (
          <span className="foco-selo-meta">
            Definido por {foco.autor} em {data(foco.criado_em)}
            {foco.vigencia_ate && ` · até ${data(foco.vigencia_ate)}`}
            {foco.nota && ` · “${foco.nota}”`}
          </span>
        )}
        {onComoFunciona && (
          <button className="btn-link foco-selo-link" onClick={onComoFunciona}>
            ⓘ Como a fila é montada
          </button>
        )}
      </span>
    </div>
  );
}

export function BotaoInfo({ onClick }: { onClick(): void }) {
  return (
    <button className="btn-info" onClick={onClick} aria-label="Como a fila é montada" title="Como a fila é montada">
      ⓘ
    </button>
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
