/**
 * Estado compartilhado do app: foco da diretoria, clientes fixados, registros de contato
 * e trilha de auditoria. Com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY grava no Supabase
 * (todos veem o mesmo estado); sem elas, cai para localStorage com a mesma interface.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventoAuditoria, Fixado, FocoAtivo, Registro } from './types';

export interface Estado {
  focos: FocoAtivo[]; // histórico, mais recente primeiro
  fixados: Fixado[];
  registros: Registro[];
  auditoria: EventoAuditoria[]; // mais recente primeiro
}

export interface Autor {
  nome: string;
  perfil: string;
}

export interface Storage {
  modo: 'supabase' | 'local';
  carregar(): Promise<Estado>;
  definirFoco(f: Pick<FocoAtivo, 'foco' | 'vigencia_ate' | 'nota'>, autor: Autor, detalhe: string): Promise<void>;
  fixar(f: Pick<Fixado, 'cliente_id' | 'consultor' | 'nota'>, autor: Autor, detalhe: string): Promise<void>;
  desafixar(id: string, autor: Autor, detalhe: string): Promise<void>;
  registrar(r: Pick<Registro, 'cliente_id' | 'consultor' | 'resultado' | 'canal' | 'nota'>, autor: Autor, detalhe: string): Promise<void>;
  /** Avisa quando outro usuário/aba muda o estado. Retorna função para cancelar. */
  assinar(cb: () => void): () => void;
}

const agora = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ------------------------------------------------------------ localStorage */

const CHAVE = 'terra3-radar:estado:v1';
const vazio = (): Estado => ({ focos: [], fixados: [], registros: [], auditoria: [] });

function lerLocal(): Estado {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? { ...vazio(), ...JSON.parse(raw) } : vazio();
  } catch {
    return vazio();
  }
}

function criarLocal(): Storage {
  let memoria = lerLocal(); // fallback se o localStorage estiver bloqueado
  const ouvintes = new Set<() => void>();

  const gravar = (mut: (e: Estado) => void, autor: Autor, acao: string, detalhe: string) => {
    const e = lerLocalOu(memoria);
    mut(e);
    e.auditoria.unshift({ id: uid(), quem: autor.nome, perfil: autor.perfil, acao, detalhe, criado_em: agora() });
    memoria = e;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(e));
    } catch {
      /* segue só em memória */
    }
    ouvintes.forEach((cb) => cb());
  };
  const lerLocalOu = (fallback: Estado) => {
    try {
      return localStorage.getItem(CHAVE) ? lerLocal() : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  };

  return {
    modo: 'local',
    async carregar() {
      memoria = lerLocalOu(memoria);
      return structuredClone(memoria);
    },
    async definirFoco(f, autor, detalhe) {
      gravar((e) => e.focos.unshift({ ...f, id: uid(), autor: autor.nome, criado_em: agora() }), autor, 'Foco da safra', detalhe);
    },
    async fixar(f, autor, detalhe) {
      gravar((e) => e.fixados.push({ ...f, id: uid(), gerente: autor.nome, criado_em: agora() }), autor, 'Fixou cliente', detalhe);
    },
    async desafixar(id, autor, detalhe) {
      gravar((e) => (e.fixados = e.fixados.filter((x) => x.id !== id)), autor, 'Desafixou cliente', detalhe);
    },
    async registrar(r, autor, detalhe) {
      gravar((e) => e.registros.push({ ...r, id: uid(), autor: autor.nome, criado_em: agora() }), autor, 'Registro de contato', detalhe);
    },
    assinar(cb) {
      ouvintes.add(cb);
      const onStorage = (ev: StorageEvent) => ev.key === CHAVE && cb();
      window.addEventListener('storage', onStorage);
      return () => {
        ouvintes.delete(cb);
        window.removeEventListener('storage', onStorage);
      };
    },
  };
}

/* ------------------------------------------------------------ Supabase */

function criarSupabase(sb: SupabaseClient): Storage {
  const checar = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };
  const auditar = async (autor: Autor, acao: string, detalhe: string) =>
    checar(await sb.from('auditoria').insert({ quem: autor.nome, perfil: autor.perfil, acao, detalhe }));

  return {
    modo: 'supabase',
    async carregar() {
      const [focos, fixados, registros, auditoria] = await Promise.all([
        sb.from('foco_historico').select('*').order('criado_em', { ascending: false }).limit(50),
        sb.from('fixados').select('*').is('removido_em', null),
        sb.from('registros').select('*').order('criado_em', { ascending: true }),
        sb.from('auditoria').select('*').order('criado_em', { ascending: false }).limit(200),
      ]);
      return {
        focos: checar(focos) as FocoAtivo[],
        fixados: checar(fixados) as Fixado[],
        registros: checar(registros) as Registro[],
        auditoria: checar(auditoria) as EventoAuditoria[],
      };
    },
    async definirFoco(f, autor, detalhe) {
      checar(await sb.from('foco_historico').insert({ ...f, autor: autor.nome }));
      await auditar(autor, 'Foco da safra', detalhe);
    },
    async fixar(f, autor, detalhe) {
      checar(await sb.from('fixados').insert({ ...f, gerente: autor.nome }));
      await auditar(autor, 'Fixou cliente', detalhe);
    },
    async desafixar(id, autor, detalhe) {
      checar(await sb.from('fixados').update({ removido_em: agora(), removido_por: autor.nome }).eq('id', id));
      await auditar(autor, 'Desafixou cliente', detalhe);
    },
    async registrar(r, autor, detalhe) {
      checar(await sb.from('registros').insert({ ...r, autor: autor.nome }));
      await auditar(autor, 'Registro de contato', detalhe);
    },
    assinar(cb) {
      const canal = sb
        .channel('radar-estado')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auditoria' }, () => cb())
        .subscribe();
      const onFocus = () => document.visibilityState === 'visible' && cb();
      document.addEventListener('visibilitychange', onFocus);
      return () => {
        sb.removeChannel(canal);
        document.removeEventListener('visibilitychange', onFocus);
      };
    },
  };
}

/* ------------------------------------------------------------ fábrica */

export async function criarStorage(): Promise<Storage> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      return criarSupabase(createClient(url, key));
    } catch (e) {
      console.warn('[storage] Supabase indisponível, usando localStorage', e);
    }
  }
  return criarLocal();
}
