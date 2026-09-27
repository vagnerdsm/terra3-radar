import { useEffect } from 'react';
import { Cabecalho } from './components/Cabecalho';
import { Consultor } from './screens/Consultor';
import { Diretoria } from './screens/Diretoria';
import { Gerente } from './screens/Gerente';
import { SelecaoAcesso } from './screens/SelecaoAcesso';
import { useRadar } from './store';

export function App() {
  const { usuario, erro } = useRadar();
  useEffect(() => window.scrollTo(0, 0), [usuario]);
  return (
    <>
      <Cabecalho />
      {erro && <div className="faixa-erro">Não foi possível salvar/ler o estado compartilhado: {erro}</div>}
      {!usuario && <SelecaoAcesso />}
      {usuario?.perfil === 'consultor' && <Consultor key={usuario.nome} nome={usuario.nome} />}
      {usuario?.perfil === 'gerente' && <Gerente key={usuario.nome} />}
      {usuario?.perfil === 'diretoria' && <Diretoria />}
    </>
  );
}
