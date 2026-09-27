import { useEffect, useState } from 'react';
import { linkWhatsApp, marcarSaida, mensagemWhatsApp } from '../contato';
import type { ItemFila } from '../derive';
import { brl, data, dataHora, diasEntre, pct } from '../format';
import { motivos } from '../scoring';
import { ROTULO_RESULTADO, useRadar } from '../store';
import type { Resultado } from '../types';
import { FaixaEtiqueta } from './ui';

export function Detalhe({ c, podeRegistrar, onFechar }: { c: ItemFila; podeRegistrar: boolean; onFechar(): void }) {
  const { radar, estado, acoes } = useRadar();
  const corte = radar.meta.data_corte;
  const historico = estado.registros.filter((r) => r.cliente_id === c.id).slice().reverse();
  const msg = mensagemWhatsApp(c, c.consultor);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    document.body.classList.add('sem-rolagem');
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.classList.remove('sem-rolagem');
    };
  }, [onFechar]);

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={c.nome} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-alca" aria-hidden />
        <header className="sheet-topo">
          <div className="sheet-titulo">
            <FaixaEtiqueta faixa={c.faixa} />
            <h2>{c.nome}</h2>
            <div className="texto-sec">
              {c.cidade} · {c.cultura}
              {c.area_ha ? ` · ${c.area_ha.toLocaleString('pt-BR')} ha` : ''}
            </div>
            <div className="texto-sec pequeno">CNPJ {c.cnpj}</div>
          </div>
          <button className="btn-icone" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="sheet-corpo">
          {c.fixado && (
            <div className="aviso aviso-fixado">
              📌 <strong>Fixado por {c.fixado.gerente}</strong>
              {c.fixado.nota && <> — “{c.fixado.nota}”</>}
            </div>
          )}

          {/* 1. Contato */}
          <section className="bloco">
            <div className="contatos">
              <a
                className="btn btn-whats"
                href={linkWhatsApp(msg)}
                target="_blank"
                rel="noreferrer"
                onClick={() => podeRegistrar && marcarSaida(c.id)}
              >
                WhatsApp
              </a>
              <button className="btn btn-contorno" disabled>
                Ligar
              </button>
              <button className="btn btn-contorno" disabled>
                E-mail
              </button>
            </div>
            <p className="legenda">Telefone e e-mail: dado não disponível na base — viria do Terra3. O WhatsApp abre sem número, para você escolher o contato.</p>
            <details className="msg-previa">
              <summary>Mensagem que será enviada</summary>
              <p>{msg}</p>
            </details>
          </section>

          {/* 2. O que fazer */}
          <section className="bloco">
            <h3>O que fazer</h3>
            {c.acoesExibidas.length ? (
              <ol className="lista-acoes">
                {c.acoesExibidas.map((a, i) => (
                  <li key={i}>
                    <strong>{a.tipo}</strong>
                    <span>{a.texto}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="texto-sec">Manter relacionamento: nenhum sinal de risco ou oportunidade forte.</p>
            )}
          </section>

          {/* 3. Contexto */}
          <section className="bloco">
            <h3>Contexto</h3>
            <dl className="contexto">
              <div>
                <dt>Compras 12m</dt>
                <dd className="num">{brl(c.fat_12m)}</dd>
              </div>
              <div>
                <dt>Potencial da safra</dt>
                <dd className="num">{brl(c.potencial)}</dd>
              </div>
              <div>
                <dt>Share</dt>
                <dd className="num">
                  {pct(c.share_real)} <small className="texto-sec">ref. {pct(radar.meta.benchmark_share)}</small>
                </dd>
              </div>
              <div>
                <dt>Jan–set 2026 vs. 2025</dt>
                <dd className={`num ${c.var_yoy != null && c.var_yoy < 0 ? 'neg' : ''}`}>
                  {c.var_yoy == null ? '—' : `${c.var_yoy > 0 ? '+' : ''}${pct(c.var_yoy, 0)}`}
                </dd>
              </div>
              <div>
                <dt>Última compra</dt>
                <dd className="num">
                  {data(c.ult_compra)}
                  {c.dias_sem_compra != null && <small className="texto-sec"> · há {c.dias_sem_compra} dias</small>}
                </dd>
              </div>
              <div>
                <dt>Último contato (CRM)</dt>
                <dd>
                  {c.ult_contato ? (
                    <>
                      <span className="num">{data(c.ult_contato)}</span>
                      <small className="texto-sec"> · há {diasEntre(c.ult_contato, corte)} dias</small>
                      <div className="pequeno">
                        {c.ult_status_lead} · {c.ult_assunto}
                      </div>
                    </>
                  ) : (
                    'Nenhuma interação registrada'
                  )}
                </dd>
              </div>
            </dl>
            {c.seg_faltantes.length > 0 && c.fat_12m > 0 && (
              <p className="pequeno texto-sec">
                Compra: {c.segmentos_12m.join(', ') || '—'} · Não compra: {c.seg_faltantes.join(', ')}
              </p>
            )}

            <h4>Por que está no topo</h4>
            <ul className="motivos">
              {motivos(c, radar.meta.pesos, brl, c.ult_contato ? diasEntre(c.ult_contato, corte) : null).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>

            {c.alertas.length > 0 && (
              <ul className="alertas">
                {c.alertas.map((a) => (
                  <li key={a} title={a}>
                    <span aria-hidden>ⓘ</span> {alertaCurto(a)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. Registrar */}
          <section className="bloco">
            <h3>Registrar</h3>
            {podeRegistrar ? (
              <Registrar onRegistrar={(r, nota) => acoes.registrar(c.id, r, nota, null)} />
            ) : (
              <p className="texto-sec pequeno">Os registros são feitos pelo consultor da carteira ({c.consultor}).</p>
            )}
            {historico.length > 0 && (
              <ul className="historico">
                {historico.map((r) => (
                  <li key={r.id}>
                    <span className={`selo selo-reg-${r.resultado}`}>{ROTULO_RESULTADO[r.resultado]}</span>
                    <span className="texto-sec pequeno num">
                      {dataHora(r.criado_em)} · {r.autor}
                      {r.canal ? ` · ${r.canal}` : ''}
                    </span>
                    {r.nota && <div className="pequeno">{r.nota}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

/** Versão curta dos `alertas` do radar.json; texto original fica no title. */
function alertaCurto(a: string): string {
  if (a.startsWith('Cadastro diz Inativo')) return 'Inativo no cadastro, mas comprou nos últimos 180 dias';
  if (a.startsWith('Cliente transferido')) return 'Veio na transferência Sudeste → Sul';
  return a;
}

export function Registrar({ onRegistrar }: { onRegistrar(r: Resultado, nota: string | null): Promise<void> | void }) {
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState<Resultado | null>(null);
  const clicar = async (r: Resultado) => {
    setSalvando(true);
    await onRegistrar(r, nota.trim() || null);
    setSalvando(false);
    setNota('');
    setOk(r);
  };
  return (
    <div className="registrar">
      <div className="registrar-botoes">
        {(Object.keys(ROTULO_RESULTADO) as Resultado[]).map((r) => (
          <button key={r} className={`btn btn-reg btn-reg-${r}`} disabled={salvando} onClick={() => clicar(r)}>
            {ROTULO_RESULTADO[r]}
          </button>
        ))}
      </div>
      <textarea placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={500} />
      {ok && <p className="pequeno ok-msg">Registrado: {ROTULO_RESULTADO[ok]}.</p>}
    </div>
  );
}
