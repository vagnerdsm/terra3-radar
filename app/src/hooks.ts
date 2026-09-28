import { useMemo } from 'react';
import { montarFila, type ItemFila } from './derive';
import { useRadar } from './store';

/** Fila de cada consultor, com fixados e o último registro de contato de cada cliente. */
export function useFilas() {
  const { clientes, estado } = useRadar();
  return useMemo(() => {
    const filas = new Map<string, ItemFila[]>();
    const nomes = [...new Set(clientes.map((c) => c.consultor))];
    for (const nome of nomes) {
      filas.set(
        nome,
        montarFila(
          clientes.filter((c) => c.consultor === nome),
          estado.fixados.filter((f) => f.consultor === nome),
          estado.registros.filter((r) => r.consultor === nome),
        ),
      );
    }
    return { filas };
  }, [clientes, estado.fixados, estado.registros]);
}

/** Localiza regional e UN de um consultor/regional na árvore. */
export function useHierarquia() {
  const { radar } = useRadar();
  return useMemo(() => {
    const regionalDoConsultor = new Map<string, string>();
    const unDaRegional = new Map<string, string>();
    const gerenteDaRegional = new Map<string, string>();
    for (const un of radar.arvore.uns)
      for (const reg of un.regionais) {
        unDaRegional.set(reg.nome, un.nome);
        gerenteDaRegional.set(reg.nome, reg.gerente);
        for (const c of reg.consultores) regionalDoConsultor.set(c.nome, reg.nome);
      }
    return { regionalDoConsultor, unDaRegional, gerenteDaRegional };
  }, [radar]);
}
