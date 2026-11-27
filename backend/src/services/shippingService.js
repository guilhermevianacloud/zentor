/**
 * Regra de frete do ZENTOR (definida na implementação, documentada no README):
 * - Valor fixo: R$ 34,99 (valor que aparece no Figma).
 * - Frete grátis quando o subtotal dos produtos é >= R$ 1.500,00.
 * - Prazo: CEP da região Sudeste (começa com 0, 1, 2 ou 3) = 3 dias úteis;
 *          demais regiões = 7 dias úteis.
 */
const FRETE_FIXO = 34.99;
const LIMITE_FRETE_GRATIS = 1500.0;

const arred = (v) => Math.round(v * 100) / 100;

function limparCep(cep) {
  return String(cep || '').replace(/\D/g, '');
}

function cepValido(cep) {
  return /^\d{8}$/.test(limparCep(cep));
}

function calcularFrete(subtotal) {
  return subtotal >= LIMITE_FRETE_GRATIS ? 0 : FRETE_FIXO;
}

function faltaParaFreteGratis(subtotal) {
  return arred(Math.max(0, LIMITE_FRETE_GRATIS - subtotal));
}

function prazoEntrega(cep) {
  const primeiro = limparCep(cep)[0];
  return ['0', '1', '2', '3'].includes(primeiro) ? 3 : 7;
}

/** Cotação para a tela de produto ("Calcular frete e prazo de entrega"). */
function cotar(cep, subtotal = 0) {
  if (!cepValido(cep)) {
    const err = new Error('CEP inválido. Informe 8 dígitos.');
    err.status = 400;
    throw err;
  }
  return {
    cep: limparCep(cep),
    valor: calcularFrete(subtotal),
    prazo_dias_uteis: prazoEntrega(cep),
    limite_frete_gratis: LIMITE_FRETE_GRATIS,
  };
}

module.exports = {
  FRETE_FIXO, LIMITE_FRETE_GRATIS, calcularFrete, faltaParaFreteGratis, prazoEntrega, cotar, cepValido, limparCep, arred,
};
