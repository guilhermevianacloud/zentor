const express = require('express');
const QRCode = require('qrcode');
const OrderService = require('../services/orderService');
const Order = require('../models/Order');
const shipping = require('../services/shippingService');
const cupons = require('../services/couponService');
const { autenticar } = require('../middleware/auth');
const MercadoPago = require('../services/mercadoPagoService');

const router = express.Router();

// GET /api/frete?cep=01310100&subtotal=799.78  — cotação na tela do produto
router.get('/frete', (req, res) => {
  res.json(shipping.cotar(req.query.cep, Number(req.query.subtotal) || 0));
});

// POST /api/cupons/validar  { codigo, subtotal }
router.post('/cupons/validar', (req, res) => {
  const { codigo, subtotal } = req.body || {};
  res.json(cupons.aplicar(codigo, Number(subtotal) || 0));
});

// POST /api/pedidos/simular  — resumo calculado no servidor (carrinho/checkout)
router.post('/pedidos/simular', (req, res) => {
  const { itens, pagamento, cupom, cep } = req.body || {};
  res.json(OrderService.simular(itens, { pagamento: pagamento || { metodo: 'cartao', parcelas: 1 }, cupom, cep }));
});

/** Endereço público da API (para o Mercado Pago devolver o cliente). */
function urlBase(req) {
  return (process.env.MP_URL_PUBLICA || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

// GET /api/pagamentos/config  — o app pergunta se o pagamento é real (Mercado Pago) ou simulado
router.get('/pagamentos/config', (req, res) => {
  res.json({ mercadopago: MercadoPago.ativo(), modo_teste: MercadoPago.ativo() && MercadoPago.modoTeste() });
});

// POST /api/pedidos  — confirmar pedido (Facade). Com Mercado Pago, devolve também checkout_url.
router.post('/pedidos', autenticar, async (req, res) => {
  const pedido = MercadoPago.ativo()
    ? await OrderService.criarPedidoOnline(req.usuario.id, req.body || {}, { urlBase: urlBase(req) })
    : OrderService.criarPedido(req.usuario.id, req.body || {});
  res.status(201).json(pedido);
});

// POST /api/pedidos/:id/mercadopago/verificar  — "Já paguei": consulta o Mercado Pago e atualiza o status
router.post('/pedidos/:id/mercadopago/verificar', autenticar, async (req, res) => {
  const pedido = Order.buscarPorId(Number(req.params.id));
  if (!pedido || (pedido.usuario_id !== req.usuario.id && req.usuario.perfil !== 'admin')) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' });
  }
  if (!MercadoPago.ativo() || !pedido.mp_preferencia_id) {
    return res.status(409).json({ erro: 'Este pedido não foi pago pelo Mercado Pago.' });
  }
  const atualizado = await OrderService.verificarMercadoPago(pedido.id);
  atualizado.acoes = OrderService.acoesPermitidas(atualizado.status);
  return res.json(atualizado);
});

// GET /api/mercadopago/retorno  — para onde o Mercado Pago manda o cliente depois de pagar
router.get('/mercadopago/retorno', async (req, res) => {
  const pedidoId = Number(req.query.pedido);
  let status = String(req.query.collection_status || req.query.status || '');
  try {
    // Nunca confiar no status da URL: busca o pagamento na API do Mercado Pago.
    if (MercadoPago.ativo() && req.query.payment_id && req.query.payment_id !== 'null') {
      const pagamento = await MercadoPago.buscarPagamento(req.query.payment_id);
      if (Number(pagamento.external_reference) === pedidoId) {
        OrderService.aplicarPagamentoMercadoPago(pagamento);
        status = pagamento.status;
      }
    }
  } catch {
    // Se a consulta falhar, o app confere de novo pelo botão "Já paguei, verificar".
  }
  const textos = {
    approved: ['Pagamento aprovado', 'Seu pedido já está sendo preparado.'],
    pending: ['Pagamento em processamento', 'Assim que o Mercado Pago confirmar, o pedido é liberado.'],
    in_process: ['Pagamento em análise', 'Assim que o Mercado Pago confirmar, o pedido é liberado.'],
    rejected: ['Pagamento recusado', 'Nenhum valor foi cobrado. Volte ao app e tente de novo pelo pedido.'],
  };
  const [titulo, texto] = textos[status] || ['Pagamento não concluído', 'Volte ao app para tentar de novo pelo pedido.'];
  res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · Zentor</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d0d0d;color:#f2f2f2;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:420px;text-align:center}h1{font-size:28px;margin:0 0 8px}p{color:#bdbdbd;line-height:1.5}b{color:#fff}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p><p>Pedido nº <b>${Number.isFinite(pedidoId) ? pedidoId : '-'}</b>. Pode fechar esta página e voltar ao app da Zentor.</p></main></body></html>`);
});

// POST /api/webhooks/mercadopago  — aviso automático do Mercado Pago (precisa de endereço público https)
router.post('/webhooks/mercadopago', async (req, res) => {
  const dataId = req.query['data.id'] || req.body?.data?.id;
  const tipo = req.query.type || req.body?.type;
  if (!MercadoPago.assinaturaValida({ assinatura: req.get('x-signature'), requestId: req.get('x-request-id'), dataId })) {
    return res.status(401).json({ erro: 'Assinatura inválida.' });
  }
  if (tipo === 'payment' && dataId && MercadoPago.ativo()) {
    try {
      OrderService.aplicarPagamentoMercadoPago(await MercadoPago.buscarPagamento(dataId));
    } catch (e) {
      console.error('[Mercado Pago] webhook:', e.message);
      return res.sendStatus(500); // o Mercado Pago tenta de novo mais tarde
    }
  }
  return res.sendStatus(200);
});

// GET /api/pedidos/meus  — lista do cliente
router.get('/pedidos/meus', autenticar, (req, res) => {
  res.json(Order.listarPorUsuario(req.usuario.id));
});

// GET /api/pedidos/:id  — detalhe (dono ou admin), com QR Code do Pix quando aguardando pagamento
router.get('/pedidos/:id', autenticar, async (req, res, next) => {
  try {
    const pedido = Order.buscarPorId(Number(req.params.id));
    if (!pedido || (pedido.usuario_id !== req.usuario.id && req.usuario.perfil !== 'admin')) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    pedido.acoes = OrderService.acoesPermitidas(pedido.status);
    if (pedido.forma_pagamento === 'pix' && pedido.status === 'aguardando_pagamento' && pedido.codigo_pagamento) {
      pedido.qr_code = await QRCode.toDataURL(pedido.codigo_pagamento, { margin: 1, width: 280 });
    }
    return res.json(pedido);
  } catch (e) {
    return next(e);
  }
});

// POST /api/pedidos/:id/pagar  — cliente confirma o Pix/boleto (simulação)
router.post('/pedidos/:id/pagar', autenticar, (req, res) => {
  res.json(OrderService.executarAcao(Number(req.params.id), 'pagar', { usuario: req.usuario }));
});

// POST /api/pedidos/:id/cancelar  — cliente cancela (antes do envio)
router.post('/pedidos/:id/cancelar', autenticar, (req, res) => {
  res.json(OrderService.executarAcao(Number(req.params.id), 'cancelar', { usuario: req.usuario }));
});

module.exports = router;
