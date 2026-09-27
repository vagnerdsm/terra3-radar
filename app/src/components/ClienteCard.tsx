import type { ItemFila } from '../derive';
import { brl, primeiroNome } from '../format';
import { ROTULO_RESULTADO } from '../store';
import { ScoreCirculo } from './ui';

export function ClienteCard({ c, onAbrir }: { c: ItemFila; onAbrir(): void }) {
  const motivo = c.acoes[0]?.texto;
  return (
    <button className={`card cliente-card${c.fixado ? ' fixado' : ''}`} onClick={onAbrir}>
      <ScoreCirculo score={c.scoreFoco} faixa={c.faixaFoco} tamanho={52} />
      <div className="cliente-card-corpo">
        {(c.fixado || c.ultimoRegistro) && (
          <div className="cliente-card-selos">
            {c.fixado && <span className="selo selo-fixado">📌 Fixado por {primeiroNome(c.fixado.gerente)}</span>}
            {c.ultimoRegistro && (
              <span className={`selo selo-reg-${c.ultimoRegistro.resultado}`}>✓ {ROTULO_RESULTADO[c.ultimoRegistro.resultado]}</span>
            )}
          </div>
        )}
        <div className="cliente-card-nome">{c.nome}</div>
        <div className="cliente-card-local">
          {c.cidade} · {c.cultura}
        </div>
        <div className="cliente-card-acao">
          <strong>{c.acao_principal}</strong>
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
