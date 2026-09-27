import { useMemo, useState } from 'react';
import { ComoFunciona } from '../components/ComoFunciona';
import { FocoCard } from '../components/FocoCard';
import { KpisBloco } from '../components/KpisBloco';
import { TabelaConsultores } from '../components/TabelaConsultores';
import { Execucao, Filtro } from '../components/ui';
import { kpis } from '../derive';
import { brl, dataHora, int, pct } from '../format';
import { useFilas } from '../hooks';
import { useRadar } from '../store';
import type { NoRegional } from '../types';
import { Consultor } from './Consultor';

interface Ponto {
  nivel: 'alta' | 'media' | 'info';
  texto: string;
}

export function Diretoria() {
  const { radar, clientes, estado } = useRadar();
  const { filas, exec } = useFilas();
  const corte = radar.meta.data_corte;
  const [un, setUn] = useState('');
  const [regional, setRegional] = useState('');
  const [consultor, setConsultor] = useState('');
  const [filaAberta, setFilaAberta] = useState<string | null>(null);
  const [comoFunciona, setComoFunciona] = useState(false);

  const uns = radar.arvore.uns;
  const regionais: NoRegional[] = uns.filter((u) => !un || u.nome === un).flatMap((u) => u.regionais);
  const noReg = regionais.find((r) => r.nome === regional);
  const consultoresEscopo = noReg ? noReg.consultores.map((c) => c.nome) : regionais.flatMap((r) => r.consultores.map((c) => c.nome));
  const escopo = consultor ? [consultor] : consultoresEscopo;
  const cliEscopo = clientes.filter((c) => escopo.includes(c.consultor));
  const k = kpis(cliEscopo, corte);
  const titulo = consultor || (noReg ? `Regional ${noReg.nome}` : un ? `UN ${un}` : '3tentos');

  const atencao = useMemo<Ponto[]>(() => {
    const p: Ponto[] = [];
    const cons = consultoresEscopo.map((n) => ({ n, ...exec([n]) })).filter((x) => x.total > 0);
    const regs = regionais.map((r) => ({ r, k: kpis(clientes.filter((c) => c.regional === r.nome), corte) }));

    const semToque = escopo.flatMap((n) => filas.get(n) ?? []).filter((c) => (c.fixado || c.faixa === 'Atacar agora') && !c.ultimoRegistro);
    if (semToque.length) {
      const gap = semToque.reduce((a, c) => a + c.gap_rs, 0);
      p.push({ nivel: 'alta', texto: `${semToque.length} clientes da fila (Atacar agora + fixados) ainda sem contato registrado nesta semana — ${brl(gap)} de espaço.` });
    }
    const pior = cons.slice().sort((a, b) => a.feitas / a.total - b.feitas / b.total)[0];
    if (pior && cons.length > 1)
      p.push({ nivel: 'media', texto: `Menor execução da fila: ${pior.n} (${pior.feitas} de ${pior.total} ações na semana).` });
    const maisParados = regs.slice().sort((a, b) => b.k.leads_parados - a.k.leads_parados)[0];
    if (maisParados && maisParados.k.leads_parados)
      p.push({ nivel: 'media', texto: `${k.leads_parados} leads em aberto/negociação sem contato há mais de 30 dias; a regional ${maisParados.r.nome} concentra ${maisParados.k.leads_parados}.` });
    const menorShare = regs.slice().sort((a, b) => a.k.share - b.k.share)[0];
    if (menorShare && regs.length > 1)
      p.push({ nivel: 'media', texto: `Menor share: regional ${menorShare.r.nome} com ${pct(menorShare.k.share)} (referência ${pct(radar.meta.benchmark_share)}), ${brl(menorShare.k.gap_rs)} na mesa.` });
    if (k.sem_compra_120d) p.push({ nivel: 'media', texto: `${k.sem_compra_120d} clientes sem comprar há mais de 120 dias.` });
    const transf = cliEscopo.filter((c) => c.alertas.some((a) => a.includes('transferido')));
    if (transf.length)
      p.push({ nivel: 'info', texto: `${transf.length} clientes vieram com Diego Fontoura na transferência Sudeste → Sul: histórico de vendas está na UN antiga.` });
    const inativos = cliEscopo.filter((c) => c.alertas.some((a) => a.startsWith('Cadastro diz Inativo')));
    if (inativos.length) p.push({ nivel: 'info', texto: `${inativos.length} clientes marcados como Inativos no cadastro compraram nos últimos 180 dias — atualizar o cadastro.` });
    if (k.base_inativa) p.push({ nivel: 'info', texto: `${k.base_inativa} clientes sem nenhuma compra na base ficam fora da fila (base inativa).` });
    return p;
  }, [consultoresEscopo, escopo, exec, filas, regionais, clientes, corte, k, cliEscopo, radar.meta.benchmark_share]);

  if (filaAberta) return <Consultor nome={filaAberta} onVoltar={() => setFilaAberta(null)} />;

  return (
    <main className="pagina painel">
      <div className="painel-topo">
        <div>
          <h1>{titulo}</h1>
          <span className="texto-sec">Visão da diretoria · base com corte em {corte.split('-').reverse().join('/')}</span>
        </div>
      </div>

      <div className="filtros">
        <Filtro
          rotulo="GUN"
          valor={un}
          onChange={(v) => { setUn(v); setRegional(''); setConsultor(''); }}
          opcoes={[{ valor: '', rotulo: 'Todas as UNs' }, ...uns.map((u) => ({ valor: u.nome, rotulo: `UN ${u.nome}` }))]}
        />
        <Filtro
          rotulo="Gerente"
          valor={regional}
          onChange={(v) => { setRegional(v); setConsultor(''); }}
          opcoes={[{ valor: '', rotulo: 'Todos os gerentes' }, ...regionais.map((r) => ({ valor: r.nome, rotulo: `${r.gerente} · ${r.nome}` }))]}
        />
        <Filtro
          rotulo="Consultor"
          valor={consultor}
          onChange={setConsultor}
          opcoes={[{ valor: '', rotulo: 'Todos os consultores' }, ...consultoresEscopo.map((n) => ({ valor: n, rotulo: n }))]}
        />
      </div>

      <KpisBloco k={k} exec={exec(escopo)} />

      <div className="uns">
        {uns.map((u) => {
          const ku = kpis(clientes.filter((c) => c.un === u.nome), corte);
          return (
            <button
              key={u.nome}
              className={`card un-card${un === u.nome ? ' ativo' : ''}`}
              onClick={() => { setUn(un === u.nome ? '' : u.nome); setRegional(''); setConsultor(''); }}
            >
              <h3>UN {u.nome}</h3>
              <dl>
                <div><dt>Fat. 12m</dt><dd>{brl(ku.fat_12m)}</dd></div>
                <div><dt>Share</dt><dd>{pct(ku.share)}</dd></div>
                <div><dt>Na mesa</dt><dd>{brl(ku.gap_rs)}</dd></div>
                <div><dt>Atacar</dt><dd>{int(ku.atacar)}</dd></div>
              </dl>
            </button>
          );
        })}
      </div>

      <section className="secao">
        <div className="secao-titulo">
          <h2>{noReg ? `Consultores · ${noReg.nome}` : 'Regionais'}</h2>
          <span className="texto-sec pequeno">{noReg ? 'Clique para abrir a fila' : 'Clique para detalhar'}</span>
        </div>
        {noReg ? (
          <TabelaConsultores nomes={noReg.consultores.map((c) => c.nome)} selecionado={consultor} onAbrir={setFilaAberta} />
        ) : (
          <div className="card tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Regional</th>
                  <th>Gerente</th>
                  <th className="n">Clientes</th>
                  <th className="n">Fat. 12m</th>
                  <th className="n">Share</th>
                  <th className="n">Na mesa</th>
                  <th className="n">Atacar</th>
                  <th className="n">Parados</th>
                  <th>Execução da fila</th>
                </tr>
              </thead>
              <tbody>
                {regionais.map((r) => {
                  const kr = kpis(clientes.filter((c) => c.regional === r.nome), corte);
                  return (
                    <tr key={r.nome} className="clicavel" onClick={() => { setRegional(r.nome); setConsultor(''); }}>
                      <td><span className="link">{r.nome}</span></td>
                      <td>{r.gerente}</td>
                      <td className="n">{int(kr.clientes)}</td>
                      <td className="n">{brl(kr.fat_12m)}</td>
                      <td className="n">{pct(kr.share)}</td>
                      <td className="n">{brl(kr.gap_rs)}</td>
                      <td className="n">{kr.atacar}</td>
                      <td className="n">{kr.leads_parados}</td>
                      <td><Execucao {...exec(r.consultores.map((c) => c.nome))} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grade-2">
        <div>
          <section className="secao">
            <div className="secao-titulo">
              <h2>O que merece atenção</h2>
            </div>
            <ul className="card atencao">
              {atencao.map((a, i) => (
                <li key={i}>
                  <span className={`atencao-icone ${a.nivel}`} aria-label={a.nivel === 'alta' ? 'alta' : a.nivel === 'media' ? 'média' : 'informação'}>
                    {a.nivel === 'info' ? 'i' : '!'}
                  </span>
                  <span>{a.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <FocoCard onComoFunciona={() => setComoFunciona(true)} />
          <section className="secao">
            <div className="secao-titulo">
              <h2>Mudanças recentes</h2>
              <span className="texto-sec pequeno">Quem, quando, o quê</span>
            </div>
            <ul className="card auditoria">
              {estado.auditoria.slice(0, 12).map((e) => (
                <li key={e.id}>
                  <strong>{e.acao}</strong> · {e.detalhe}
                  <div className="texto-sec pequeno num">
                    {e.quem} · {dataHora(e.criado_em)}
                  </div>
                </li>
              ))}
              {!estado.auditoria.length && <li className="texto-sec">Nenhuma mudança registrada ainda.</li>}
            </ul>
          </section>
        </div>
      </div>

      {comoFunciona && <ComoFunciona onFechar={() => setComoFunciona(false)} />}
    </main>
  );
}
