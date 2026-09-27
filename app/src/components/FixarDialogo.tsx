import { useState } from 'react';
import type { ItemFila } from '../derive';

export function FixarDialogo({ c, onConfirmar, onFechar }: { c: ItemFila; onConfirmar(nota: string | null): void; onFechar(): void }) {
  const [nota, setNota] = useState('');
  return (
    <div className="sheet-fundo como-foi-fundo" onClick={onFechar}>
      <form
        className="card modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar(nota.trim() || null);
        }}
      >
        <h3>Fixar na fila de {c.consultor}</h3>
        <p className="texto-sec pequeno">
          <strong>{c.nome}</strong> vai para o topo da fila, acima do score, com o selo “Fixado por você”. Máximo de 3 por consultor.
        </p>
        <label className="campo">
          Nota para o consultor (opcional)
          <textarea autoFocus rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: falar com o filho do produtor, que agora decide as compras" />
        </label>
        <div className="modal-acoes">
          <button type="button" className="btn btn-contorno" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn">
            Fixar
          </button>
        </div>
      </form>
    </div>
  );
}
