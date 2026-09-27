import { primeiroNome } from './format';
import type { ClienteFoco } from './scoring';

/** Mensagem pré-escrita conforme a ação principal. Sem número: o usuário escolhe o contato no WhatsApp. */
export function mensagemWhatsApp(c: ClienteFoco, remetente: string): string {
  const eu = `Olá! Aqui é ${primeiroNome(remetente)}, da 3tentos.`;
  switch (c.acaoPrincipal) {
    case 'Destravar negociação':
      return `${eu} Queria retomar a conversa sobre ${c.ult_assunto ? `o ${c.ult_assunto.toLowerCase()}` : 'a nossa negociação'}, tem um tempinho essa semana?`;
    case 'Reativar':
      return `${eu} Faz um tempo que a gente não conversa. Queria saber como está a safra e ver no que posso ajudar. Tem um tempinho essa semana?`;
    case 'Recuperar volume':
      return `${eu} Queria entender como está o planejamento da safra e ver como a gente pode apoiar vocês. Podemos conversar essa semana?`;
    case 'Ampliar share':
      return `${eu} Tenho algumas condições para a próxima safra que podem fazer sentido para vocês. Podemos conversar essa semana?`;
    case 'Cross-sell':
      return `${eu} Queria apresentar o que temos em ${c.seg_faltantes.join(', ').toLowerCase()} para a próxima safra. Tem um tempinho essa semana?`;
    case 'Primeiro contato':
      return `${eu} Atendo a região de ${c.cidade} e gostaria de me apresentar e entender como posso ajudar na safra. Tem um tempinho essa semana?`;
    default:
      return `${eu} Passando para saber como está a lavoura. Precisando de algo, estou à disposição!`;
  }
}

export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/* ---- "Como foi?" ao voltar do WhatsApp ---- */
const CHAVE = 'terra3-radar:saida-whatsapp';

export function marcarSaida(clienteId: number) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ id: clienteId, t: Date.now() }));
  } catch {
    /* sem sessionStorage: o prompt não aparece, registro manual continua disponível */
  }
}

export function lerSaida(): number | null {
  try {
    const raw = sessionStorage.getItem(CHAVE);
    return raw ? (JSON.parse(raw).id as number) : null;
  } catch {
    return null;
  }
}

export function limparSaida() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
