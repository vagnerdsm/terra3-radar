import { useEffect, useState } from 'react';
import { lerSaida, limparSaida } from '../contato';
import { useRadar } from '../store';
import { Registrar } from './Detalhe';

/** Ao voltar do WhatsApp para o app, pergunta como foi o contato. */
export function ComoFoi() {
  const { porId, acoes } = useRadar();
  const [clienteId, setClienteId] = useState<number | null>(null);

  useEffect(() => {
    const checar = () => {
      if (document.visibilityState !== 'visible') return;
      const id = lerSaida();
      if (id != null) setClienteId(id);
    };
    // pequena espera: o clique abre o WhatsApp e só depois a aba perde o foco
    const aoVoltar = () => setTimeout(checar, 300);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, []);

  const c = clienteId != null ? porId.get(clienteId) : undefined;
  if (!c) return null;
  const fechar = () => {
    limparSaida();
    setClienteId(null);
  };

  return (
    <div className="sheet-fundo como-foi-fundo" onClick={fechar}>
      <div className="card como-foi" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Como foi?</h3>
        <p className="texto-sec">Contato com {c.nome} pelo WhatsApp</p>
        <Registrar
          onRegistrar={async (r, nota) => {
            await acoes.registrar(c.id, r, nota, 'WhatsApp');
            fechar();
          }}
        />
        <button className="btn btn-link" onClick={fechar}>
          Agora não
        </button>
      </div>
    </div>
  );
}
