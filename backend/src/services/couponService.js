/** Cupons de desconto: percentual, valor fixo ou frete grátis. */
const DatabaseConnection = require('../db/connection');
const { arred } = require('./shippingService');

function erro(mensagem) {
  const e = new Error(mensagem);
  e.status = 400;
  return e;
}

/**
 * Valida o cupom para o subtotal informado.
 * @returns {{codigo, tipo, descricao, desconto:number, frete_gratis:boolean}}
 */
function aplicar(codigo, subtotal) {
  if (!codigo) return null;
  const db = DatabaseConnection.getInstance();
  const cupom = db.prepare('SELECT * FROM cupons WHERE codigo = ? AND ativo = 1').get(String(codigo).trim().toUpperCase());
  if (!cupom) throw erro('Cupom inválido ou expirado.');
  if (subtotal < cupom.minimo) {
    throw erro(`Este cupom vale para compras a partir de R$ ${cupom.minimo.toFixed(2).replace('.', ',')}.`);
  }
  let desconto = 0;
  if (cupom.tipo === 'percentual') desconto = arred(subtotal * (cupom.valor / 100));
  if (cupom.tipo === 'valor') desconto = Math.min(cupom.valor, subtotal);
  return {
    codigo: cupom.codigo,
    tipo: cupom.tipo,
    descricao: cupom.descricao,
    valor: cupom.valor,
    minimo: cupom.minimo,
    desconto: arred(desconto),
    frete_gratis: cupom.tipo === 'frete',
  };
}

module.exports = { aplicar };
