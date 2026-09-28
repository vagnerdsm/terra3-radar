import { kpis } from '../derive';
import { brl, int, pct } from '../format';
import { useRadar } from '../store';

/** Tabela de consultores do recorte. Clique abre a fila do consultor. */
export function TabelaConsultores({ nomes, selecionado, onAbrir }: { nomes: string[]; selecionado?: string; onAbrir(nome: string): void }) {
  const { radar, clientes } = useRadar();
  return (
    <div className="card tabela-wrap">
      <table>
        <thead>
          <tr>
            <th>Consultor</th>
            <th className="n">Clientes</th>
            <th className="n">Fat. 12m</th>
            <th className="n">Share</th>
            <th className="n">Na mesa</th>
            <th className="n">Atacar</th>
            <th className="n" title="Leads Aberto/Em negociação sem contato há mais de 30 dias">Parados</th>
          </tr>
        </thead>
        <tbody>
          {nomes.map((n) => {
            const k = kpis(clientes.filter((c) => c.consultor === n), radar.meta.data_corte);
            return (
              <tr key={n} className={`clicavel${selecionado === n ? ' selecionada' : ''}`} onClick={() => onAbrir(n)}>
                <td>
                  <span className="link">{n}</span>
                </td>
                <td className="n">{int(k.clientes)}</td>
                <td className="n">{brl(k.fat_12m)}</td>
                <td className="n">{pct(k.share)}</td>
                <td className="n">{brl(k.gap_rs)}</td>
                <td className="n">{k.atacar}</td>
                <td className="n">{k.leads_parados}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
