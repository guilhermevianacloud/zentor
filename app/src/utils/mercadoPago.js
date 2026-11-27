import { Linking, Platform } from 'react-native';

/**
 * Abre a página de pagamento do Mercado Pago.
 *
 * No navegador, abrir uma aba DEPOIS de esperar a API é bloqueado como
 * pop-up. Por isso a aba é reservada no clique (reservarJanela) e só
 * recebe o endereço quando o link chega. No celular, abre o navegador.
 */
export function reservarJanela() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const janela = window.open('', '_blank');
  if (janela) janela.document.write('<p style="font-family:sans-serif;padding:24px">Abrindo o Mercado Pago…</p>');
  return janela;
}

export function abrirPagamento(url, janela) {
  if (janela && !janela.closed) {
    janela.location.href = url;
    return;
  }
  Linking.openURL(url);
}

export function fecharJanela(janela) {
  if (janela && !janela.closed) janela.close();
}
