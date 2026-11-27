/**
 * Identidade visual (Figma): fundo preto, vermelho Zentor de destaque e tipografia
 * condensada. Refinamento: Barlow no texto corrido (família DIN, a das placas de
 * estrada) e contraste revisado para texto pequeno.
 */
export const cores = {
  fundo: '#000000',
  fundoCard: '#161616', // superfície elevada (painéis, caixas)
  fundoCard2: '#232323', // card de produto
  fundoInput: '#0D0D0D',
  borda: '#333333',
  linha: '#222222', // divisórias discretas
  vermelho: '#E30613', // vermelho da marca: fundos, botões, ícones, títulos grandes
  vermelhoTexto: '#FF4D55', // vermelho para texto pequeno (contraste ≥ 4,5:1 sobre preto)
  vermelhoEscuro: '#A1040E',
  texto: '#F5F5F5',
  textoSuave: '#BDBDBD',
  textoApagado: '#8C8C8C', // antes #7A7A7A (contraste baixo em letra pequena)
  sucesso: '#34D17A',
  alerta: '#F0A93B',
  erro: '#FF6B6F',
  foco: '#FFFFFF',
};

export const fontes = {
  titulo: 'BebasNeue_400Regular', // marca: títulos, preços, botões
  corpo: 'Barlow_400Regular',
  corpoMedio: 'Barlow_500Medium',
  corpoSemi: 'Barlow_600SemiBold',
  corpoNegrito: 'Barlow_700Bold',
};

/** Escala tipográfica (razão ~1,25) para o texto corrido. */
export const tipo = {
  legenda: 12,
  pequeno: 13,
  corpo: 15,
  destaque: 17,
};

export const espaco = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

/** Cantos: retos como no Figma; só o que é circular por natureza (avatar, bolinhas) arredonda. */
export const raio = { nenhum: 0, sutil: 2 };

/** Anel de foco visível para navegação por teclado (web). */
export const anelFoco = { outlineStyle: 'solid', outlineWidth: 2, outlineColor: '#FFFFFF', outlineOffset: 2 };
