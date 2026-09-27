import { iniciais } from '../format';
import { useHierarquia } from '../hooks';
import { useRadar } from '../store';
import type { Usuario } from '../types';

export function SelecaoAcesso() {
  const { radar, setUsuario } = useRadar();
  const { regionalDoConsultor, unDaRegional } = useHierarquia();
  const por = (p: Usuario['perfil']) => radar.usuarios.filter((u) => u.perfil === p);

  const Cartao = ({ u, sub }: { u: Usuario; sub: string }) => (
    <button className="card acesso-card" onClick={() => setUsuario(u)}>
      <span className={`avatar avatar-${u.perfil}`}>{u.perfil === 'diretoria' ? '3t' : iniciais(u.nome)}</span>
      <span>
        <strong>{u.nome}</strong>
        <small>{sub}</small>
      </span>
    </button>
  );

  return (
    <main className="pagina selecao">
      <h1>Quem está acessando?</h1>
      <p className="texto-sec">
        Simulação de login para a demonstração. Cada perfil enxerga só o seu recorte da carteira. Base com corte em{' '}
        {radar.meta.data_corte.split('-').reverse().join('/')}.
      </p>

      <section>
        <h2>Diretoria</h2>
        <div className="grade-acesso">
          {por('diretoria').map((u) => (
            <Cartao key={u.nome} u={u} sub="3tentos inteira · define o foco da safra" />
          ))}
        </div>
      </section>

      <section>
        <h2>Gerentes regionais</h2>
        <div className="grade-acesso">
          {por('gerente').map((u) => (
            <Cartao key={u.nome} u={u} sub={`${u.escopo} · UN ${unDaRegional.get(u.escopo ?? '') ?? ''}`} />
          ))}
        </div>
      </section>

      <section>
        <h2>Consultores</h2>
        <div className="grade-acesso">
          {por('consultor').map((u) => (
            <Cartao key={u.nome} u={u} sub={regionalDoConsultor.get(u.nome) ?? ''} />
          ))}
        </div>
      </section>
    </main>
  );
}
