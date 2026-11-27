/**
 * PADRÃO STRATEGY — formas de pagamento do checkout.
 *
 * Por quê: cada forma de pagamento tem regras diferentes de CÁLCULO
 * (cartão parcela, Pix dá 5% de desconto, boleto à vista) e de
 * PROCESSAMENTO (cartão é aprovado na hora; Pix e boleto geram um código e
 * ficam aguardando pagamento). Cada regra é uma classe com a mesma
 * interface `calcular()` e `processar()`; o serviço de pedidos escolhe a
 * estratégia em tempo de execução. Nova forma de pagamento = nova classe.
 *
 * Observação: o pagamento é SIMULADO — nenhuma cobrança real é feita e o
 * número do cartão nunca é gravado (só os 4 últimos dígitos e a bandeira).
 */
const crypto = require('crypto');
const { arred } = require('./shippingService');

function erro(mensagem) {
  const e = new Error(mensagem);
  e.status = 400;
  return e;
}

class PagamentoStrategy {
  /** @returns {{desconto:number,total:number,parcelas:number,valor_parcela:number,descricao:string}} */
  calcular() {
    throw new Error('Estratégia de pagamento não implementada');
  }

  /** @returns {{status:string, cartao_final?:string, cartao_bandeira?:string, codigo_pagamento?:string}} */
  processar() {
    throw new Error('Estratégia de pagamento não implementada');
  }
}

/* ---------- Cartão de crédito ---------- */

/** Algoritmo de Luhn: confere o dígito verificador do número do cartão. */
function luhnValido(numero) {
  let soma = 0;
  let dobra = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let d = Number(numero[i]);
    if (dobra) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobra = !dobra;
  }
  return soma % 10 === 0;
}

function bandeira(numero) {
  if (/^4/.test(numero)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(numero)) return 'Mastercard';
  if (/^3[47]/.test(numero)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(numero)) return 'Elo';
  if (/^(606282|3841)/.test(numero)) return 'Hipercard';
  return 'Cartão';
}

class CartaoCreditoStrategy extends PagamentoStrategy {
  static MAX_PARCELAS = 10;

  calcular(totalBruto, { parcelas = 1 } = {}) {
    const n = Number(parcelas);
    if (!Number.isInteger(n) || n < 1 || n > CartaoCreditoStrategy.MAX_PARCELAS) {
      throw erro('Parcelas devem estar entre 1 e 10.');
    }
    const total = arred(totalBruto);
    return {
      desconto: 0,
      total,
      parcelas: n,
      valor_parcela: arred(total / n),
      descricao: `Cartão de crédito em ${n}x de R$ ${arred(total / n).toFixed(2)} sem juros`,
    };
  }

  processar({ cartao } = {}) {
    if (!cartao) throw erro('Informe os dados do cartão.');
    const numero = String(cartao.numero || '').replace(/\D/g, '');
    if (numero.length < 13 || numero.length > 19 || !luhnValido(numero)) throw erro('Número do cartão inválido.');
    if (String(cartao.nome || '').trim().length < 3) throw erro('Informe o nome impresso no cartão.');
    const [mes, ano] = String(cartao.validade || '').split('/').map(Number);
    const agora = new Date();
    const fimValidade = new Date(2000 + ano, mes, 1); // primeiro dia do mês seguinte
    if (!mes || mes < 1 || mes > 12 || !ano || fimValidade <= agora) throw erro('Validade do cartão inválida ou vencida.');
    if (!/^\d{3,4}$/.test(String(cartao.cvv || ''))) throw erro('CVV inválido.');
    // Aprovação simulada. Só os 4 últimos dígitos são guardados.
    return { status: 'pago', cartao_final: numero.slice(-4), cartao_bandeira: bandeira(numero) };
  }
}

/* ---------- Pix ---------- */

class PixStrategy extends PagamentoStrategy {
  static DESCONTO = 0.05; // 5% de desconto

  calcular(totalBruto) {
    const desconto = arred(totalBruto * PixStrategy.DESCONTO);
    const total = arred(totalBruto - desconto);
    return { desconto, total, parcelas: 1, valor_parcela: total, descricao: 'Pix com 5% de desconto' };
  }

  processar(_dados, total) {
    // "Pix copia e cola" simulado (formato parecido com o real, sem valor bancário).
    const txid = crypto.randomBytes(10).toString('hex').toUpperCase();
    const codigo = `00020126580014BR.GOV.BCB.PIX0136zentor-simulado-${txid}5204000053039865406${total.toFixed(2)}5802BR5913ZENTOR CAPACETES6009SAO PAULO62070503***6304SIMU`;
    return { status: 'aguardando_pagamento', codigo_pagamento: codigo };
  }
}

/* ---------- Boleto ---------- */

class BoletoStrategy extends PagamentoStrategy {
  calcular(totalBruto) {
    const total = arred(totalBruto);
    return { desconto: 0, total, parcelas: 1, valor_parcela: total, descricao: 'Boleto bancário à vista' };
  }

  processar(_dados, total) {
    // Linha digitável simulada (47 dígitos), com o valor no final.
    const aleatorio = Array.from({ length: 33 }, () => crypto.randomInt(0, 10)).join('');
    const valor = String(Math.round(total * 100)).padStart(10, '0');
    const d = `0019${aleatorio}${valor}`.slice(0, 47);
    const linha = `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
    return { status: 'aguardando_pagamento', codigo_pagamento: linha };
  }
}

const ESTRATEGIAS = {
  cartao: new CartaoCreditoStrategy(),
  pix: new PixStrategy(),
  boleto: new BoletoStrategy(),
};

function obterEstrategia(metodo) {
  const estrategia = ESTRATEGIAS[metodo];
  if (!estrategia) throw erro('Forma de pagamento inválida. Use cartao, pix ou boleto.');
  return estrategia;
}

module.exports = {
  PagamentoStrategy, CartaoCreditoStrategy, PixStrategy, BoletoStrategy, obterEstrategia, luhnValido, bandeira,
};
