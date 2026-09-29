import { brl, int, pct } from '../format';
import type { Kpis } from '../derive';
import { useRadar } from '../store';
import { Kpi } from './ui';

export function KpisBloco({ k }: { k: Kpis }) {
  const { radar } = useRadar();
  const yoy = k.ytd_25 ? k.ytd_26 / k.ytd_25 - 1 : null;
  return (
    <div className="kpis">
      <Kpi dica="fat_12m" rotulo="Fat. 12m" valor={brl(k.fat_12m)} sub={yoy == null ? undefined : `jan–set ${yoy >= 0 ? '+' : ''}${pct(yoy)} vs. 2025`} />
      <Kpi dica="share" rotulo="Share of wallet" valor={pct(k.share)} sub={`referência ${pct(radar.meta.benchmark_share)} (quartil sup.)`} />
      <Kpi dica="na_mesa" rotulo="Dinheiro na mesa" valor={brl(k.gap_rs)} sub="até o share de referência" destaque />
      <Kpi dica="atacar" rotulo="Atacar agora" valor={int(k.atacar)} sub={`${int(k.planejar)} em Planejar · ${int(k.clientes)} clientes`} />
      <Kpi dica="parados" rotulo="Leads parados" valor={int(k.leads_parados)} sub={`${int(k.sem_compra_120d)} sem comprar há +120 dias`} />
    </div>
  );
}
