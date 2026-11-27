/**
 * Integração com o Mercado Pago — Checkout Pro.
 *
 * Por que Checkout Pro: o cliente paga na página do próprio Mercado Pago
 * (cartão, Pix ou boleto). O número do cartão NUNCA passa pelo nosso app
 * nem pela nossa API, o que tira da loja a responsabilidade de guardar e
 * proteger dados de cartão (exigência PCI). A loja só:
 *   1) cria uma "preferência" (o que está sendo cobrado e por quanto);
 *   2) manda o cliente para o link devolvido (init_point);
 *   3) confere o pagamento depois, consultando a API do Mercado Pago
 *      (pelo webhook ou pelo botão "Já paguei, verificar").
 *
 * As credenciais ficam SÓ no backend/.env (MP_ACCESS_TOKEN). Sem ela, a loja
 * continua com o pagamento simulado, e os testes rodam sem internet.
 *
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
 */
const crypto = require('crypto');

const API = 'https://api.mercadopago.com';

/** Forma escolhida no app → tipos de pagamento que o Mercado Pago deve ESCONDER. */
const EXCLUIR_POR_FORMA = {
  cartao: ['ticket', 'bank_transfer', 'atm'],
  pix: ['credit_card', 'debit_card', 'prepaid_card', 'ticket', 'atm'],
  boleto: ['credit_card', 'debit_card', 'prepaid_card', 'bank_transfer'],
};

function erro(mensagem, status = 502) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

const MercadoPago = {
  /** Trocável nos testes (fetch falso, sem internet). */
  http: (...args) => fetch(...args),

  ativo() {
    return Boolean(process.env.MP_ACCESS_TOKEN);
  },

  /** Credencial de teste começa com TEST-. Serve para avisar na tela que nada é cobrado de verdade. */
  modoTeste() {
    return String(process.env.MP_ACCESS_TOKEN || '').startsWith('TEST-') || process.env.MP_MODO === 'teste';
  },

  async chamar(caminho, { metodo = 'GET', corpo, idempotencia } = {}) {
    const resposta = await MercadoPago.http(`${API}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      // O detalhe vai para o terminal da API; o cliente recebe uma mensagem simples.
      console.error(`[Mercado Pago] ${metodo} ${caminho} → ${resposta.status}`, dados?.message || dados);
      throw erro('O Mercado Pago não respondeu como esperado. Nenhuma cobrança foi feita.');
    }
    return dados;
  },

  /**
   * Monta a preferência de um pedido já gravado.
   * O valor é o TOTAL calculado pela loja (com cupom, frete e o -5% do Pix),
   * num item único, para o Mercado Pago cobrar exatamente o que o resumo mostrou.
   */
  montarPreferencia(pedido, { urlBase }) {
    const descricao = pedido.itens.map((i) => `${i.quantidade}x ${i.nome_produto} (${i.tamanho})`).join(', ');
    const [nome, ...resto] = String(pedido.cliente || '').split(' ');
    const retorno = `${urlBase}/api/mercadopago/retorno?pedido=${pedido.id}`;
    const preferencia = {
      items: [{
        id: `pedido-${pedido.id}`,
        title: `Pedido nº ${pedido.id} — Zentor Capacetes`,
        description: descricao.slice(0, 250),
        category_id: 'others',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(pedido.total),
      }],
      // No modo teste, o Mercado Pago só aceita comprador com e-mail de teste
      // (recusa e-mails comuns com "e-mail corporativo do Mercado Livre").
      payer: { name: nome, surname: resto.join(' '), email: MercadoPago.modoTeste() ? (process.env.MP_EMAIL_COMPRADOR_TESTE || 'test_user_zentor@testuser.com') : pedido.email_cliente },
      external_reference: String(pedido.id), // liga o pagamento ao nosso pedido
      statement_descriptor: 'ZENTOR',
      back_urls: { success: retorno, pending: retorno, failure: retorno },
      payment_methods: {
        excluded_payment_types: (EXCLUIR_POR_FORMA[pedido.forma_pagamento] || []).map((id) => ({ id })),
        installments: pedido.forma_pagamento === 'cartao' ? 10 : 1,
        default_installments: pedido.forma_pagamento === 'cartao' ? pedido.parcelas || 1 : 1,
      },
      metadata: { pedido_id: pedido.id },
    };
    // O Mercado Pago só volta sozinho para a loja (auto_return) e só avisa por
    // webhook se o endereço for público com https. Em localhost, o cliente volta
    // pelo botão do próprio Mercado Pago e a loja confere pelo "verificar".
    if (urlBase.startsWith('https://')) preferencia.auto_return = 'approved';
    if (process.env.MP_WEBHOOK_URL) preferencia.notification_url = process.env.MP_WEBHOOK_URL;
    return preferencia;
  },

  async criarPreferencia(pedido, opcoes) {
    const r = await MercadoPago.chamar('/checkout/preferences', {
      metodo: 'POST',
      corpo: MercadoPago.montarPreferencia(pedido, opcoes),
      idempotencia: `zentor-pedido-${pedido.id}`,
    });
    return { id: r.id, url: r.init_point };
  },

  buscarPagamento(id) {
    return MercadoPago.chamar(`/v1/payments/${encodeURIComponent(id)}`);
  },

  /** Pagamentos ligados ao pedido (external_reference), do mais novo para o mais antigo. */
  async pagamentosDoPedido(pedidoId) {
    const r = await MercadoPago.chamar(`/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc`);
    return r.results || [];
  },

  /**
   * Confere a assinatura do webhook (cabeçalho x-signature), para ninguém
   * conseguir marcar pedido como pago mandando um POST falso.
   * Sem MP_WEBHOOK_SECRET a assinatura não é conferida, mas mesmo assim o
   * status nunca vem do corpo do aviso: a API sempre busca o pagamento no
   * Mercado Pago antes de mudar o pedido.
   */
  assinaturaValida({ assinatura, requestId, dataId }) {
    const segredo = process.env.MP_WEBHOOK_SECRET;
    if (!segredo) return true;
    const partes = Object.fromEntries(String(assinatura || '').split(',').map((p) => p.trim().split('=')));
    if (!partes.ts || !partes.v1) return false;
    const id = /^[a-z0-9]+$/i.test(String(dataId)) ? String(dataId).toLowerCase() : String(dataId);
    let manifesto = `id:${id};`;
    if (requestId) manifesto += `request-id:${requestId};`;
    manifesto += `ts:${partes.ts};`;
    const esperado = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
    const a = Buffer.from(esperado);
    const b = Buffer.from(String(partes.v1));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },
};

module.exports = MercadoPago;
