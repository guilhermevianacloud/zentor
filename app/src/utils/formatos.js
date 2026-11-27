/** R$ 1.329,80 — formatação manual (não depende do Intl do motor JS). */
export function moeda(valor) {
  const v = Math.round(Number(valor || 0) * 100) / 100;
  const [inteiro, centavos] = v.toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

export const soDigitos = (v) => String(v || '').replace(/\D/g, '');

export function mascaraCpf(v) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascaraTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v) {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

export const ROTULO_CATEGORIA = { fechado: 'Fechado', articulado: 'Articulado', 'off-road': 'Off-road', aberto: 'Aberto' };
export const ROTULO_USO = { urbano: 'Urbano', esportivo: 'Esportivo', trilha: 'Trilha', viagem: 'Viagem' };
export const ROTULO_STATUS = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};
export const ROTULO_PAGAMENTO = { cartao: 'Cartão de crédito', pix: 'Pix', boleto: 'Boleto bancário' };

// Mesma regra do backend (shippingService.js) para o resumo instantâneo do carrinho.
export const FRETE_FIXO = 34.99;
export const LIMITE_FRETE_GRATIS = 1500;
export const calcularFrete = (subtotal) => (subtotal === 0 || subtotal >= LIMITE_FRETE_GRATIS ? 0 : FRETE_FIXO);

/** Valida CPF pelos dígitos verificadores (mesmo algoritmo do backend). */
export function cpfValido(valor) {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10]);
}

/** O SQLite grava datetime('now') em UTC ("2026-11-26 14:30:00"); converte para o horário local. */
export function paraData(texto) {
  if (!texto) return null;
  return new Date(`${String(texto).replace(' ', 'T')}Z`);
}
const dois = (n) => String(n).padStart(2, '0');
export function dataCurta(texto) {
  const d = paraData(texto);
  return d ? `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}
export function dataHora(texto) {
  const d = paraData(texto);
  return d ? `${dataCurta(texto)} às ${dois(d.getHours())}:${dois(d.getMinutes())}` : '';
}

/** Máscara do número do cartão: 0000 0000 0000 0000. */
export const mascaraCartao = (v) => soDigitos(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
export const mascaraValidade = (v) => {
  const d = soDigitos(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
export function bandeiraCartao(numero) {
  const n = soDigitos(numero);
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return 'Elo';
  return n.length >= 4 ? 'Cartão' : '';
}
/** Algoritmo de Luhn (mesmo do backend): confere o dígito verificador do cartão. */
export function cartaoValido(numero) {
  const n = soDigitos(numero);
  if (n.length < 13) return false;
  let soma = 0;
  let dobra = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dobra) { d *= 2; if (d > 9) d -= 9; }
    soma += d;
    dobra = !dobra;
  }
  return soma % 10 === 0;
}
