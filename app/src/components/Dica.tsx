import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { definicoes, type MetricaId } from '../metricas';
import { useRadar } from '../store';

const LARGURA = 320;

/**
 * Ícone ⓘ que mostra a fórmula da métrica ao passar o mouse (ou focar/tocar).
 * O balão vai para o <body> com posição fixa, para não ser cortado pelas tabelas com rolagem.
 */
export function Dica({ metrica }: { metrica: MetricaId }) {
  const { radar } = useRadar();
  const d = definicoes(radar.meta)[metrica];
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; acima: boolean } | null>(null);

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const largura = Math.min(LARGURA, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - largura / 2), window.innerWidth - largura - 8);
    const acima = r.bottom + 200 > window.innerHeight && r.top > 200;
    setPos({ top: acima ? r.top - 8 : r.bottom + 8, left, acima });
  };
  const fechar = () => setPos(null);

  useEffect(() => {
    if (!pos) return undefined;
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [pos]);

  return (
    <>
      <span
        ref={ref}
        className="dica-icone"
        role="button"
        tabIndex={0}
        aria-label={`Como é calculado: ${d.titulo}`}
        onMouseEnter={abrir}
        onMouseLeave={fechar}
        onFocus={abrir}
        onBlur={fechar}
        onClick={(e) => {
          e.stopPropagation(); // não aciona o card/linha em volta
          abrir(); // fecha ao sair com o mouse, tocar fora (blur) ou rolar
        }}
      >
        ⓘ
      </span>
      {pos &&
        createPortal(
          <div
            className={`dica${pos.acima ? ' dica-acima' : ''}`}
            role="tooltip"
            style={{ top: pos.top, left: pos.left, width: Math.min(LARGURA, window.innerWidth - 16) }}
          >
            <strong className="dica-titulo">{d.titulo}</strong>
            {d.formula.map((f) => (
              <code key={f} className="dica-formula">
                {f}
              </code>
            ))}
            {d.nota?.map((n) => (
              <span key={n} className="dica-nota">
                {n}
              </span>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
