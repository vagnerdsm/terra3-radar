import { useState } from 'react';
import { data, dataHora } from '../format';
import { FOCOS } from '../scoring';
import { useRadar } from '../store';
import type { FocoId } from '../types';
import { FocoSelo } from './ui';

/** Card "Foco da safra": só a diretoria edita. Não muda o score; só reordena as filas de toda a força de vendas. */
export function FocoCard() {
  const { foco, estado, acoes, clientes } = useRadar();
  // quantos clientes da fila (com score) subiriam com cada foco
  const sobem = (id: FocoId) =>
    clientes.filter((c) => c.score != null && c.acoes.some((a) => FOCOS[id].acoes.includes(a.tipo))).length;
  const [escolha, setEscolha] = useState<FocoId>(foco.foco);
  const [vigencia, setVigencia] = useState(foco.vigencia_ate ?? '');
  const [nota, setNota] = useState('');
  const [salvo, setSalvo] = useState(false);
  const mudou = escolha !== foco.foco || (vigencia || null) !== foco.vigencia_ate || nota.trim() !== '';

  return (
    <section className="card foco-card secao">
      <h2>Foco da safra</h2>
      <p className="texto-sec pequeno">Não muda o score: reordena as filas de gerentes e consultores, levando para o topo os clientes com a ação do foco. Aparece como selo em todas as telas.</p>
      <FocoSelo foco={foco} afetados={sobem(foco.foco)} onde="" />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await acoes.definirFoco({ foco: escolha, vigencia_ate: vigencia || null, nota: nota.trim() || null });
          setNota('');
          setSalvo(true);
        }}
      >
        <div className="focos-opcoes" role="radiogroup">
          {(Object.keys(FOCOS) as FocoId[]).map((id) => (
            <label key={id} className={`foco-opcao${escolha === id ? ' ativo' : ''}`}>
              <input type="radio" name="foco" checked={escolha === id} onChange={() => { setEscolha(id); setSalvo(false); }} />
              <span>
                <strong>{FOCOS[id].nome}</strong>
                {id === 'share' && <small>padrão</small>}
                <small>{FOCOS[id].descricao}</small>
                <small className="foco-efeito num">
                  {FOCOS[id].acoes.length ? `${sobem(id)} clientes sobem para o topo das filas` : 'Nenhum cliente muda de posição'}
                </small>
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
        {salvo && <p className="pequeno ok-msg">Foco publicado. Filas reordenadas.</p>}
      </form>
      {estado.focos.length > 0 && (
        <details className="msg-previa">
          <summary>Histórico do foco ({estado.focos.length})</summary>
          <ul className="auditoria">
            {estado.focos.slice(0, 10).map((f) => (
              <li key={f.id}>
                <strong>{FOCOS[f.foco].nome}</strong>
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
