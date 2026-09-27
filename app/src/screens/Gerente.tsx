import { useMemo, useState } from 'react';
import { FixarDialogo } from '../components/FixarDialogo';
import { KpisBloco } from '../components/KpisBloco';
import { TabelaConsultores } from '../components/TabelaConsultores';
import { FocoSelo, Filtro, ScoreCirculo } from '../components/ui';
import { kpis, type ItemFila } from '../derive';
import { brl, primeiroNome } from '../format';
import { useFilas, useHierarquia } from '../hooks';
import { compararFoco } from '../scoring';
import { useRadar } from '../store';
import { Consultor } from './Consultor';

const MAX_FIXADOS = 3;

export function Gerente() {
  const { radar, usuario, foco, clientes, estado, acoes } = useRadar();
  const { filas, exec } = useFilas();
  const { unDaRegional } = useHierarquia();
  const regional = usuario!.escopo!;
  const un = unDaRegional.get(regional) ?? '';
  const noRegional = radar.arvore.uns.flatMap((u) => u.regionais).find((r) => r.nome === regional)!;
  const nomes = noRegional.consultores.map((c) => c.nome);

  const [consultor, setConsultor] = useState('');
  const [filaAberta, setFilaAberta] = useState<string | null>(null);
  const [fixando, setFixando] = useState<ItemFila | null>(null);

  const escopo = consultor ? [consultor] : nomes;
  const k = kpis(clientes.filter((c) => escopo.includes(c.consultor)), radar.meta.data_corte);
  const fixadosPor = (n: string) => estado.fixados.filter((f) => f.consultor === n);

  const top5 = useMemo(
    () =>
      escopo
        .flatMap((n) => filas.get(n) ?? [])
        .filter((c) => !c.fixado)
        .sort(compararFoco)
        .slice(0, 5),
    [escopo, filas],
  );
  const fixadosRegiao = escopo.flatMap((n) => (filas.get(n) ?? []).filter((c) => c.fixado));

  if (filaAberta) return <Consultor nome={filaAberta} onVoltar={() => setFilaAberta(null)} />;

  return (
    <main className="pagina painel">
      <div className="painel-topo">
        <div>
          <h1>Regional {regional}</h1>
          <span className="texto-sec">Gerente {usuario!.nome}</span>
        </div>
      </div>

      <div className="filtros">
        <Filtro rotulo="GUN" valor={un} travado opcoes={[{ valor: un, rotulo: `UN ${un}` }]} />
        <Filtro rotulo="Gerente" valor={usuario!.nome} travado opcoes={[{ valor: usuario!.nome, rotulo: usuario!.nome }]} />
        <Filtro
          rotulo="Consultor"
          valor={consultor}
          onChange={setConsultor}
          opcoes={[{ valor: '', rotulo: 'Todos os consultores' }, ...nomes.map((n) => ({ valor: n, rotulo: n }))]}
        />
      </div>

      <div className="aviso-foco">
        <FocoSelo
          foco={foco}
          afetados={escopo.flatMap((n) => filas.get(n) ?? []).filter((c) => c.sobe).length}
          onde={consultor ? `da carteira de ${primeiroNome(consultor)}` : 'da regional'}
        />
        {foco.nota && <span className="texto-sec pequeno">“{foco.nota}”</span>}
      </div>

      <KpisBloco k={k} exec={exec(escopo)} />

      <section className="secao">
        <div className="secao-titulo">
          <h2>Consultores</h2>
          <span className="texto-sec pequeno">Clique para abrir a fila do consultor</span>
        </div>
        <TabelaConsultores nomes={nomes} selecionado={consultor} onAbrir={setFilaAberta} />
      </section>

      <div className="grade-2">
        <section className="secao">
          <div className="secao-titulo">
            <h2>Top 5 {consultor ? `de ${primeiroNome(consultor)}` : 'da regional'}</h2>
            <span className="texto-sec pequeno">Ordem da fila com o foco atual</span>
          </div>
          <ul className="card top5">
            {top5.map((c) => {
              const cheio = fixadosPor(c.consultor).length >= MAX_FIXADOS;
              return (
                <li key={c.id}>
                  <ScoreCirculo score={c.score} faixa={c.faixa} tamanho={40} />
                  <div className="top5-info">
                    <strong>{c.nome}</strong>
                    <span>
                      {c.consultor} · {c.acaoPrincipal} · {brl(c.gap_rs)}
                    </span>
                  </div>
                  <button
                    className="btn btn-pequeno"
                    disabled={cheio}
                    title={cheio ? `${c.consultor} já tem ${MAX_FIXADOS} clientes fixados` : 'Colocar no topo da fila do consultor'}
                    onClick={() => setFixando(c)}
                  >
                    📌 Fixar
                  </button>
                </li>
              );
            })}
            {!top5.length && <li className="texto-sec">Nenhum cliente elegível.</li>}
          </ul>
        </section>

        <section className="secao">
          <div className="secao-titulo">
            <h2>Fixados</h2>
            <span className="texto-sec pequeno">Máx. {MAX_FIXADOS} por consultor</span>
          </div>
          <ul className="card top5">
            {fixadosRegiao.map((c) => (
              <li key={c.id}>
                <ScoreCirculo score={c.score} faixa={c.faixa} tamanho={40} />
                <div className="top5-info">
                  <strong>{c.nome}</strong>
                  <span>
                    {c.consultor} · por {primeiroNome(c.fixado!.gerente)}
                    {c.ultimoRegistro ? ' · ✓ trabalhado na semana' : ''}
                  </span>
                  {c.fixado!.nota && <div className="top5-nota">“{c.fixado!.nota}”</div>}
                </div>
                <button className="btn btn-pequeno btn-contorno" onClick={() => acoes.desafixar(c.fixado!)}>
                  Desafixar
                </button>
              </li>
            ))}
            {!fixadosRegiao.length && <li className="texto-sec pequeno">Nenhum cliente fixado. Use “Fixar” no Top 5.</li>}
          </ul>
        </section>
      </div>

      {fixando && (
        <FixarDialogo
          c={fixando}
          onFechar={() => setFixando(null)}
          onConfirmar={async (nota) => {
            setFixando(null);
            await acoes.fixar(fixando.id, nota);
          }}
        />
      )}
    </main>
  );
}
