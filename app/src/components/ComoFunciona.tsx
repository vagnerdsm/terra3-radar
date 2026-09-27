import { useEffect } from 'react';
import { FOCOS, ORDEM_FOCOS, pontosPorSinal, SINAIS } from '../scoring';
import { useRadar } from '../store';
import type { FocoId } from '../types';
import { FaixaEtiqueta } from './ui';

const COMO_O_FOCO_MUDA: Record<FocoId, string> = {
  geral: 'a fila segue só a pontuação.',
  share: 'sobem os clientes cuja ação principal é ampliar share.',
  base: 'sobem os clientes para reativar ou recuperar volume; essa ação passa a ser a principal do card.',
  pipeline: 'sobem os clientes com negociação parada; essa ação passa a ser a principal do card.',
};

/** Tela "Como a fila é montada": tela cheia no celular, painel lateral no desktop. */
export function ComoFunciona({ onFechar }: { onFechar(): void }) {
  const { radar, foco } = useRadar();
  const pesos = radar.meta.pesos;
  const faixas = radar.meta.faixas.slice().sort((a, b) => b.min - a.min);
  const exemplo =
    radar.clientes.find((c) => c.nome === 'Lajeado Sementes' && c.score != null) ??
    radar.clientes.filter((c) => c.score != null).sort((a, b) => b.score! - a.score!)[0];
  const pts = exemplo ? pontosPorSinal(exemplo, pesos) : null;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    document.body.classList.add('sem-rolagem');
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.classList.remove('sem-rolagem');
    };
  }, [onFechar]);

  const rotuloFaixa = (i: number) => {
    const f = faixas[i];
    if (i === 0) return `${f.min} pontos ou mais`;
    if (f.min === 0) return `abaixo de ${faixas[i - 1].min}`;
    return `${f.min} a ${faixas[i - 1].min - 1}`;
  };

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <aside className="sheet sheet-tela" role="dialog" aria-modal="true" aria-label="Como a fila é montada" onClick={(e) => e.stopPropagation()}>
        <header className="tela-topo">
          <button className="btn-link" onClick={onFechar}>
            ← Voltar
          </button>
        </header>
        <div className="sheet-corpo como-funciona">
          <h2>Como a fila é montada</h2>
          <p>Sua fila combina quatro sinais para mostrar primeiro quem precisa mais de você.</p>

          <h3>Os quatro sinais</h3>
          <ul className="lista-pontos">
            {SINAIS.map((s) => (
              <li key={s.id}>
                <strong>
                  {s.nome} (até {Math.round(pesos[s.id] * 100)} pts):
                </strong>{' '}
                {s.explicacao}
              </li>
            ))}
          </ul>
          <p className="texto-sec pequeno">A soma dos quatro vai de 0 a 100 pontos.</p>

          <h3>O que significam as etiquetas</h3>
          <ul className="lista-etiquetas">
            {faixas.map((f, i) => (
              <li key={f.nome}>
                <FaixaEtiqueta faixa={f.nome} />
                <span>{rotuloFaixa(i)}</span>
              </li>
            ))}
          </ul>

          <h3>Como o foco da diretoria reordena a fila</h3>
          <p>
            Clientes fixados pelo gerente vêm sempre primeiro. Depois, o foco da diretoria pode levar um grupo de clientes ao topo;
            dentro do grupo e no restante, vale a pontuação. O foco nunca muda os pontos nem as etiquetas.
          </p>
          <ul className="lista-pontos">
            {ORDEM_FOCOS.map((id) => (
              <li key={id} className={foco.foco === id ? 'foco-atual' : undefined}>
                <strong>{FOCOS[id].nome}:</strong> {COMO_O_FOCO_MUDA[id]}
                {foco.foco === id && <span className="selo selo-foco">em vigor</span>}
              </li>
            ))}
          </ul>

          {exemplo && pts && (
            <>
              <h3>Exemplo: {exemplo.nome}</h3>
              <table className="tabela-exemplo">
                <tbody>
                  {SINAIS.map((s) => (
                    <tr key={s.id}>
                      <td>{s.nome}</td>
                      <td className="n">{pts[s.id]} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="conta num">
                {SINAIS.map((s) => `${s.nome} ${pts[s.id]}`).join(' + ')} = <strong>{exemplo.score} pontos</strong> →{' '}
                <FaixaEtiqueta faixa={exemplo.faixa} />
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
