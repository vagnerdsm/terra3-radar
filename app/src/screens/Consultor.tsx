import { useState } from 'react';
import { ClienteCard } from '../components/ClienteCard';
import { ComoFoi } from '../components/ComoFoi';
import { Detalhe } from '../components/Detalhe';
import { ComoFunciona } from '../components/ComoFunciona';
import { BotaoInfo, FocoAviso } from '../components/ui';
import { kpis } from '../derive';
import { brl, int, pct, primeiroNome } from '../format';
import { useFilas, useHierarquia } from '../hooks';
import { FAIXAS, mensagemFoco } from '../scoring';
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
  const [comoFunciona, setComoFunciona] = useState(false);

  const fila = filas.get(nome) ?? [];
  const sobem = fila.filter((c) => c.sobe).length;
  const proprio = usuario?.perfil === 'consultor' && usuario.nome === nome;
  const k = kpis(
    clientes.filter((c) => c.consultor === nome),
    radar.meta.data_corte,
  );
  const cont = (f: Chip) => (f === 'Todos' ? fila.length : fila.filter((c) => c.faixa === f).length);
  const visiveis = chip === 'Todos' ? fila : fila.filter((c) => c.faixa === chip);
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
        <div className="consultor-resumo">
          <span>
            Atacar agora:{' '}
            <strong className="num">
              {k.atacar} {k.atacar === 1 ? 'cliente' : 'clientes'}
            </strong>
          </span>
          <span className="texto-sec pequeno num">
            {k.leads_parados} {k.leads_parados === 1 ? 'negociação parada' : 'negociações paradas'}
          </span>
        </div>
        <FocoAviso
          foco={foco}
          mensagem={
            proprio
              ? mensagemFoco(foco.foco, sobem, 'consultor')
              : mensagemFoco(foco.foco, sobem, 'gerente', `da carteira de ${primeiroNome(nome)}`)
          }
        />
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

      <div className="fila-titulo">
        <h2>{proprio ? 'Sua fila' : `Fila de ${primeiroNome(nome)}`}</h2>
        <BotaoInfo onClick={() => setComoFunciona(true)} />
      </div>

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
      {comoFunciona && <ComoFunciona onFechar={() => setComoFunciona(false)} />}
      {proprio && <ComoFoi />}
    </main>
  );
}
