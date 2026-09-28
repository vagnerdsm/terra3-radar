import type { ItemFila } from '../derive';
import { brl, primeiroNome } from '../format';
import { FOCOS } from '../scoring';
import { useRadar } from '../store';
import { FaixaEtiqueta, SeloRegistro } from './ui';

export function ClienteCard({ c, onAbrir }: { c: ItemFila; onAbrir(): void }) {
  const motivo = c.acoesExibidas[0]?.texto;
  const { foco } = useRadar();
  return (
    <button className={`card cliente-card${c.fixado ? ' fixado' : ''}`} onClick={onAbrir}>
      <div className="cliente-card-corpo">
        <div className="cliente-card-selos">
          <FaixaEtiqueta faixa={c.faixa} />
          {c.fixado && <span className="selo selo-fixado">📌 Fixado por {primeiroNome(c.fixado.gerente)}</span>}
          {c.sobe && <span className="selo selo-foco">◎ {FOCOS[foco.foco].nome}</span>}
          {c.ultimoRegistro && <SeloRegistro r={c.ultimoRegistro} />}
        </div>
        <div className="cliente-card-nome">{c.nome}</div>
        <div className="cliente-card-local">
          {c.cidade} · {c.cultura}
        </div>
        <div className="cliente-card-acao">
          <strong>{c.acaoPrincipal}</strong>
          {motivo && <span> — {motivo}</span>}
        </div>
      </div>
      <div className="cliente-card-espaco">
        {c.gap_rs > 0 ? (
          <>
            <span className="num">{brl(c.gap_rs)}</span>
            <small>de espaço</small>
          </>
        ) : (
          <small>share já no nível de referência</small>
        )}
      </div>
    </button>
  );
}
