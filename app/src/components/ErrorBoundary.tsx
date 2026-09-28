import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Estado {
  erro: Error | null;
  chave: number;
  tentativas: number;
}

/**
 * Evita a tela em branco: se uma tela quebra durante a navegação (ex.: tradutor
 * automático ou extensão do navegador mexendo no HTML), remonta a tela uma vez.
 * Se quebrar de novo logo em seguida, mostra o erro com um botão para recarregar.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null, chave: 0, tentativas: 0 };
  private ultimaFalha = 0;

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[Radar] erro de renderização', erro, info.componentStack);
    const agora = Date.now();
    const repetida = agora - this.ultimaFalha < 5000;
    this.ultimaFalha = agora;
    if (!repetida) {
      // primeira falha: remonta a tela do zero, sem precisar de F5
      this.setState((s) => ({ erro: null, chave: s.chave + 1, tentativas: s.tentativas + 1 }));
    }
  }

  render() {
    if (this.state.erro) {
      return (
        <main className="pagina">
          <div className="card bloco-card erro-tela" role="alert">
            <h2>Algo deu errado nesta tela</h2>
            <p className="texto-sec">Recarregue a página para continuar. Se o problema se repetir, envie esta mensagem para o time:</p>
            <pre>{this.state.erro.message}</pre>
            <button className="btn" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </main>
      );
    }
    return <div key={this.state.chave}>{this.props.children}</div>;
  }
}
