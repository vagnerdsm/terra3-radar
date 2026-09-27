import { useRadar } from '../store';

const PERFIL: Record<string, string> = { diretoria: 'Diretoria', gerente: 'Gerente regional', consultor: 'Consultor' };

export function Cabecalho() {
  const { usuario, setUsuario, storage } = useRadar();
  return (
    <header className="cabecalho">
      <div className="cabecalho-marca">
        <span className="selo-3t" aria-hidden>3t</span>
        <span className="cabecalho-titulo">Radar de Carteira</span>
      </div>
      <div className="cabecalho-dir">
        {usuario && (
          <span className="cabecalho-usuario">
            <strong>{usuario.nome}</strong>
            <span>{PERFIL[usuario.perfil]}{usuario.perfil === 'gerente' ? ` · ${usuario.escopo}` : ''}</span>
          </span>
        )}
        <span
          className={`modo modo-${storage.modo}`}
          title={storage.modo === 'supabase' ? 'Estado compartilhado via Supabase' : 'Estado salvo só neste navegador (localStorage)'}
        >
          {storage.modo === 'supabase' ? 'online' : 'local'}
        </span>
        {usuario && (
          <button className="btn btn-claro" onClick={() => setUsuario(null)}>
            Trocar acesso
          </button>
        )}
      </div>
    </header>
  );
}
