import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FOCOS, focoVigente, pontuar, type ClienteScore } from './scoring';
import { criarStorage, type Estado, type Storage } from './storage';
import type { Fixado, FocoAtivo, Radar, Registro, Resultado, Usuario } from './types';
import { registrosDaSemana } from './derive';

interface Ctx {
  radar: Radar;
  storage: Storage;
  estado: Estado;
  usuario: Usuario | null;
  setUsuario(u: Usuario | null): void;
  foco: FocoAtivo;
  clientes: ClienteScore[];
  porId: Map<number, ClienteScore>;
  registrosSemana: Registro[];
  erro: string | null;
  acoes: {
    definirFoco(f: Pick<FocoAtivo, 'foco' | 'vigencia_ate' | 'nota'>): Promise<void>;
    fixar(clienteId: number, nota: string | null): Promise<void>;
    desafixar(f: Fixado): Promise<void>;
    registrar(clienteId: number, resultado: Resultado, nota: string | null, canal: string | null): Promise<void>;
  };
}

const Contexto = createContext<Ctx | null>(null);
const CHAVE_USUARIO = 'terra3-radar:usuario';

export const ROTULO_RESULTADO: Record<Resultado, string> = {
  contatado: 'Contatado',
  agendado: 'Agendado',
  sem_sucesso: 'Sem sucesso',
};

function lerUsuario(): Usuario | null {
  try {
    const raw = localStorage.getItem(CHAVE_USUARIO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function RadarProvider({ children }: { children: ReactNode }) {
  const [radar, setRadar] = useState<Radar | null>(null);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [usuario, setUsuarioState] = useState<Usuario | null>(lerUsuario);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, s] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}radar.json`).then((res) => {
            if (!res.ok) throw new Error(`radar.json: HTTP ${res.status}`);
            return res.json() as Promise<Radar>;
          }),
          criarStorage(),
        ]);
        setRadar(r);
        setStorage(s);
        setEstado(await s.carregar());
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const recarregar = useCallback(async () => {
    if (!storage) return;
    try {
      setEstado(await storage.carregar());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, [storage]);

  useEffect(() => (storage ? storage.assinar(recarregar) : undefined), [storage, recarregar]);

  const setUsuario = useCallback((u: Usuario | null) => {
    setUsuarioState(u);
    try {
      if (u) localStorage.setItem(CHAVE_USUARIO, JSON.stringify(u));
      else localStorage.removeItem(CHAVE_USUARIO);
    } catch {
      /* preferência só desta sessão */
    }
  }, []);

  const foco = useMemo(() => focoVigente(estado?.focos[0] ?? null, new Date().toISOString()), [estado]);

  const clientes = useMemo(
    () => (radar ? radar.clientes.map((c) => pontuar(c, FOCOS[foco.foco].pesos)) : []),
    [radar, foco],
  );
  const porId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const registrosSemana = useMemo(() => registrosDaSemana(estado?.registros ?? []), [estado]);

  const acoes = useMemo<Ctx['acoes']>(() => {
    const autor = () => ({ nome: usuario?.nome ?? '?', perfil: usuario?.perfil ?? '?' });
    const nomeCli = (id: number) => porId.get(id)?.nome ?? `#${id}`;
    const rodar = async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
      await recarregar();
    };
    return {
      definirFoco: (f) =>
        rodar(() =>
          storage!.definirFoco(f, autor(), `${FOCOS[f.foco].nome}${f.vigencia_ate ? ` até ${f.vigencia_ate.split('-').reverse().join('/')}` : ''}${f.nota ? ` — ${f.nota}` : ''}`),
        ),
      fixar: (clienteId, nota) => {
        const c = porId.get(clienteId)!;
        const jaFixados = estado?.fixados.filter((f) => f.consultor === c.consultor) ?? [];
        if (jaFixados.some((f) => f.cliente_id === clienteId)) return Promise.resolve();
        if (jaFixados.length >= 3) {
          setErro(`${c.consultor} já tem 3 clientes fixados.`);
          return Promise.resolve();
        }
        return rodar(() =>
          storage!.fixar({ cliente_id: clienteId, consultor: c.consultor, nota }, autor(), `${c.nome} na fila de ${c.consultor}${nota ? ` — ${nota}` : ''}`),
        );
      },
      desafixar: (f) => rodar(() => storage!.desafixar(f.id, autor(), `${nomeCli(f.cliente_id)} (fila de ${f.consultor})`)),
      registrar: (clienteId, resultado, nota, canal) => {
        const c = porId.get(clienteId)!;
        return rodar(() =>
          storage!.registrar(
            { cliente_id: clienteId, consultor: c.consultor, resultado, nota, canal },
            autor(),
            `${c.nome}: ${ROTULO_RESULTADO[resultado]}${canal ? ` via ${canal}` : ''}${nota ? ` — ${nota}` : ''}`,
          ),
        );
      },
    };
  }, [storage, usuario, porId, recarregar, estado]);

  if (erro && !radar) return <div className="tela-carregando erro">Não foi possível carregar os dados: {erro}</div>;
  if (!radar || !storage || !estado) return <div className="tela-carregando">Carregando o radar…</div>;

  return (
    <Contexto.Provider
      value={{ radar, storage, estado, usuario, setUsuario, foco, clientes, porId, registrosSemana, erro, acoes }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useRadar(): Ctx {
  const c = useContext(Contexto);
  if (!c) throw new Error('useRadar fora do RadarProvider');
  return c;
}
