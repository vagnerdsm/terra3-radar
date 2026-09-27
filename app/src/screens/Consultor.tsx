import { useState } from 'react';
import { ClienteCard } from '../components/ClienteCard';
import { ComoFoi } from '../components/ComoFoi';
import { Detalhe } from '../components/Detalhe';
import { Barra, FocoSelo } from '../components/ui';
import { execucao, kpis } from '../derive';
import { brl, int, pct } from '../format';
import { useFilas, useHierarquia } from '../hooks';
import { FAIXAS } from '../scoring';
import { useRadar } from '../store';
import type { Faixa } from '../types';

type Chip = 'Todos' | Faixa;

export function Consultor({ nome, onVoltar }: { nome: string; onVoltar?: () => void }) {
  const { radar, foco, clientes, usuario } = useRadar();
  const { filas } = useFilas();
  const { regionalDoConsultor } = useHierarquia();
  const [chip, setChip] = useState<Chip>('Todos');
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const fila = filas.get(nome) ?? [];
  const proprio = usuario?.perfil === 'consultor' && usuario.nome === nome;
  const exec = execucao(fila);
  const k = kpis(
    clientes.filter((c) => c.consultor === nome),
    radar.meta.data_corte,
  );
  const cont = (f: Chip) => (f === 'Todos' ? fila.length : fila.filter((c) => c.faixaFoco === f).length);
  const visiveis = chip === 'Todos' ? fila : fila.filter((c) => c.faixaFoco === chip);
  const LIMITE = 25;
  const lista = mostrarTodos ? visiveis : visiveis.slice(0, LIMITE);
  const aberto = abertoId != null ? fila.find((c) => c.id === abertoId) : undefined;

  return (
    <main className="pagina consultor">
      {onVoltar && (
        <button className="btn btn-link voltar" onClick={onVoltar}>
          ← Voltar
        </button>
      )}
      <section className="consultor-topo">
        <div className="consultor-nome">
          <h1>{nome}</h1>
          <span className="texto-sec pequeno">{regionalDoConsultor.get(nome)}</span>
        </div>
        <div className="consultor-exec">
          <span>
            <strong className="num">
              {exec.feitas} de {exec.total}
            </strong>{' '}
            ações feitas na semana
          </span>
          <Barra valor={exec.total ? exec.feitas / exec.total : 0} classe="primaria" />
        </div>
        <FocoSelo foco={foco} />
      </section>

      <details className="card indicadores">
        <summary>Indicadores da carteira</summary>
        <div className="indicadores-grade">
          <div>
            <span className="kpi-rotulo">Fat. 12m</span>
            <strong className="num">{brl(k.fat_12m)}</strong>
          </div>
          <div>
            <span className="kpi-rotulo">Share</span>
            <strong className="num">{pct(k.share)}</strong>
            <small className="texto-sec">ref. {pct(radar.meta.benchmark_share)}</small>
          </div>
          <div>
            <span className="kpi-rotulo">Dinheiro na mesa</span>
            <strong className="num">{brl(k.gap_rs)}</strong>
          </div>
          <div>
            <span className="kpi-rotulo">Clientes</span>
            <strong className="num">{int(k.clientes)}</strong>
          </div>
        </div>
        {k.base_inativa > 0 && (
          <p className="pequeno texto-sec">
            {k.base_inativa} {k.base_inativa === 1 ? 'cliente sem nenhuma compra' : 'clientes sem nenhuma compra'} na base: fora da fila (base inativa).
          </p>
        )}
      </details>

      <div className="chips" role="tablist" aria-label="Filtrar fila">
        {(['Todos', ...FAIXAS] as Chip[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={chip === f}
            className={`chip${chip === f ? ' ativo' : ''}`}
            onClick={() => {
              setChip(f);
              setMostrarTodos(false);
            }}
          >
            {f} <span className="num">{cont(f)}</span>
          </button>
        ))}
      </div>

      <div className="fila">
        {lista.map((c) => (
          <ClienteCard key={c.id} c={c} onAbrir={() => setAbertoId(c.id)} />
        ))}
        {!lista.length && <p className="texto-sec vazio">Nenhum cliente nesta faixa.</p>}
        {visiveis.length > lista.length && (
          <button className="btn btn-contorno largo" onClick={() => setMostrarTodos(true)}>
            Ver mais {visiveis.length - lista.length} clientes
          </button>
        )}
      </div>

      {aberto && <Detalhe c={aberto} podeRegistrar={proprio} onFechar={() => setAbertoId(null)} />}
      {proprio && <ComoFoi />}
    </main>
  );
}
