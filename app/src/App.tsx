import { useEffect } from 'react';
import { Cabecalho } from './components/Cabecalho';
import { Consultor } from './screens/Consultor';
import { Diretoria } from './screens/Diretoria';
import { Gerente } from './screens/Gerente';
import { SelecaoAcesso } from './screens/SelecaoAcesso';
import { useRadar } from './store';

export function App() {
  const { usuario, erro } = useRadar();
  // Corpo em bloco de propósito: navegadores novos fazem scrollTo devolver uma Promise, e o React
  // trataria esse retorno como função de limpeza ("n is not a function" ao trocar de acesso).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [usuario]);
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
