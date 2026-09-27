import { useState } from 'react';
import { data, dataHora } from '../format';
import { aplicarFoco, FOCOS, mensagemFoco, ORDEM_FOCOS, resumoFoco } from '../scoring';
import { useRadar } from '../store';
import type { FocoId } from '../types';
import { FocoAviso } from './ui';

/** Card "Foco da safra": só a diretoria edita. Nunca muda score nem faixa; só reordena as filas. */
export function FocoCard({ onComoFunciona }: { onComoFunciona(): void }) {
  const { foco, estado, acoes, radar } = useRadar();
  // quantos clientes da fila subiriam com cada foco (3tentos inteira)
  const sobem = (id: FocoId) => radar.clientes.filter((c) => aplicarFoco(c, id).sobe).length;
  const [escolha, setEscolha] = useState<FocoId>(foco.foco);
  const [vigencia, setVigencia] = useState(foco.vigencia_ate ?? '');
  const [nota, setNota] = useState('');
  const [salvo, setSalvo] = useState(false);
  const mudou = escolha !== foco.foco || (vigencia || null) !== foco.vigencia_ate || nota.trim() !== '';

  return (
    <section className="card foco-card secao">
      <h2>Foco da safra</h2>
      <p className="texto-sec pequeno">
        O foco leva um grupo de clientes ao topo das filas de gerentes e consultores. A prioridade de cada cliente não muda.
      </p>
      <FocoAviso foco={foco} mensagem={mensagemFoco(foco.foco, sobem(foco.foco), 'diretoria')} onComoFunciona={onComoFunciona} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await acoes.definirFoco({ foco: escolha, vigencia_ate: vigencia || null, nota: nota.trim() || null });
          setNota('');
          setSalvo(true);
        }}
      >
        <div className="focos-opcoes" role="radiogroup">
          {ORDEM_FOCOS.map((id) => (
            <label key={id} className={`foco-opcao${escolha === id ? ' ativo' : ''}`}>
              <input type="radio" name="foco" checked={escolha === id} onChange={() => { setEscolha(id); setSalvo(false); }} />
              <span>
                <strong>{FOCOS[id].nome}</strong>
                {id === 'geral' && <small>padrão</small>}
                <small className="foco-efeito num">{resumoFoco(id, sobem(id))}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="campos">
          <label className="campo">
            Vigência até (opcional)
            <input type="date" value={vigencia} onChange={(e) => { setVigencia(e.target.value); setSalvo(false); }} />
          </label>
          <label className="campo">
            Recado para a equipe (opcional)
            <input type="text" maxLength={160} value={nota} onChange={(e) => { setNota(e.target.value); setSalvo(false); }} placeholder="Ex.: fechar o trimestre recuperando clientes da Campanha" />
          </label>
        </div>
        <button className="btn largo" disabled={!mudou}>
          Publicar foco
        </button>
        {salvo && <p className="pequeno ok-msg">Foco publicado. As filas já estão na nova ordem.</p>}
      </form>
      {estado.focos.length > 0 && (
        <details className="msg-previa">
          <summary>Histórico do foco ({estado.focos.length})</summary>
          <ul className="auditoria">
            {estado.focos.slice(0, 10).map((f) => (
              <li key={f.id}>
                <strong>{FOCOS[f.foco]?.nome ?? f.foco}</strong>
                <span className="texto-sec">
                  {' '}· {f.autor} · {dataHora(f.criado_em)}
                  {f.vigencia_ate && ` · até ${data(f.vigencia_ate)}`}
                </span>
                {f.nota && <div className="pequeno">“{f.nota}”</div>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
