/**
 * PADRÃO FACADE — serviço de pedidos.
 *
 * Por quê: fechar um pedido envolve vários subsistemas — produtos (preço e
 * estoque), cupom, frete, pagamento (Strategy), gravação de pedido + itens
 * e histórico, e o ciclo de vida do pedido (State). A rota não deveria
 * conhecer todos eles. A fachada expõe poucas chamadas simples
 * (`simular`, `criarPedido`, `executarAcao`) e coordena tudo por dentro,
 * em transação: se algo falha, nada é gravado.
 */
const crypto = require('crypto');
const DatabaseConnection = require('../db/connection');
const Product = require('../models/Product');
const Order = require('../models/Order');
const shipping = require('./shippingService');
const cupons = require('./couponService');
const { obterEstrategia } = require('./paymentStrategies');
const { estadoDe } = require('./orderStatus');
const MercadoPago = require('./mercadoPagoService');

/** Status do pagamento no Mercado Pago → texto da linha do tempo. */
const STATUS_MP = {
  approved: 'aprovado',
  pending: 'pendente',
  in_process: 'em análise',
  authorized: 'autorizado',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'devolvido',
  charged_back: 'contestado',
};
const BANDEIRA_MP = { visa: 'Visa', master: 'Mastercard', amex: 'Amex', elo: 'Elo', hipercard: 'Hipercard' };

function erro(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

/** 1) Valida o carrinho e busca o preço REAL de cada item no banco. */
function validarCarrinho(itens) {
  if (!Array.isArray(itens) || itens.length === 0) throw erro('O carrinho está vazio.');
  const somaPorProduto = {};
  const linhas = itens.map((item) => {
    const produto = Product.buscarPorId(Number(item.produto_id));
    if (!produto) throw erro(`Produto ${item.produto_id} não encontrado.`, 404);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1) throw erro(`Quantidade inválida para ${produto.nome}.`);
    const tamanho = item.tamanho || produto.tamanhos[0];
    if (!produto.tamanhos.includes(tamanho)) throw erro(`Tamanho ${tamanho} indisponível para ${produto.nome}.`);
    somaPorProduto[produto.id] = (somaPorProduto[produto.id] || 0) + quantidade;
    if (somaPorProduto[produto.id] > produto.estoque) {
      throw erro(`Estoque insuficiente para ${produto.nome} (disponível: ${produto.estoque}).`);
    }
    return { produto, quantidade, tamanho };
  });
  return linhas;
}

/** 2) Subtotal → cupom → frete → estratégia de pagamento. */
function calcularValores(linhas, { pagamento = { metodo: 'cartao', parcelas: 1 }, cupom, cep } = {}) {
  const subtotal = shipping.arred(linhas.reduce((s, l) => s + l.produto.preco * l.quantidade, 0));
  const cupomAplicado = cupons.aplicar(cupom, subtotal);
  const descontoCupom = cupomAplicado?.desconto || 0;
  const frete = cupomAplicado?.frete_gratis ? 0 : shipping.calcularFrete(subtotal);
  const estrategia = obterEstrategia(pagamento.metodo);
  const resultado = estrategia.calcular(subtotal - descontoCupom + frete, { parcelas: pagamento.parcelas });
  return {
    subtotal,
    frete,
    cupom: cupomAplicado,
    desconto_cupom: descontoCupom,
    falta_para_frete_gratis: shipping.faltaParaFreteGratis(subtotal),
    prazo_dias: cep ? shipping.prazoEntrega(cep) : null,
    ...resultado,
  };
}

function validarEndereco(e = {}) {
  const obrigatorios = ['cep', 'endereco', 'numero', 'cidade', 'estado'];
  const faltando = obrigatorios.filter((c) => !String(e[c] || '').trim());
  if (faltando.length) throw erro(`Preencha o endereço: ${faltando.join(', ')}.`);
  if (!shipping.cepValido(e.cep)) throw erro('CEP inválido. Informe 8 dígitos.');
  if (!/^[A-Za-z]{2}$/.test(String(e.estado).trim())) throw erro('Estado deve ser a sigla com 2 letras (ex.: SP).');
}

function gerarRastreio() {
  return `ZT${crypto.randomInt(100000000, 999999999)}BR`;
}

const OBSERVACOES = {
  aguardando_pagamento: 'Pedido recebido. Aguardando a confirmação do pagamento.',
  pago: 'Pagamento aprovado.',
  enviado: 'Pedido enviado para a transportadora.',
  entregue: 'Pedido entregue.',
  cancelado: 'Pedido cancelado. Os itens voltaram ao estoque.',
};

const OrderService = {
  /** Resumo sem gravar nada (usado no carrinho e no checkout). */
  simular(itens, opcoes) {
    return calcularValores(validarCarrinho(itens), opcoes);
  },

  /** Fachada: uma chamada valida, calcula, processa o pagamento e grava tudo numa transação. */
  criarPedido(usuarioId, { itens, endereco, pagamento = {}, cupom }, { online = false } = {}) {
    const linhas = validarCarrinho(itens);
    validarEndereco(endereco);
    const valores = calcularValores(linhas, { pagamento, cupom, cep: endereco.cep });
    const estrategia = obterEstrategia(pagamento.metodo);
    // Online (Mercado Pago): a Strategy continua calculando o valor (parcelas, -5% do Pix),
    // mas quem processa é o Mercado Pago; o pedido nasce aguardando pagamento.
    const processamento = online ? { status: 'aguardando_pagamento' } : estrategia.processar(pagamento, valores.total);
    const db = DatabaseConnection.getInstance();

    const gravar = db.transaction(() => {
      const pedidoId = Order.inserir({
        usuario_id: usuarioId,
        subtotal: valores.subtotal,
        frete: valores.frete,
        cupom: valores.cupom?.codigo || null,
        desconto_cupom: valores.desconto_cupom,
        desconto: valores.desconto,
        total: valores.total,
        forma_pagamento: pagamento.metodo,
        parcelas: valores.parcelas,
        valor_parcela: valores.valor_parcela,
        cartao_final: processamento.cartao_final || null,
        cartao_bandeira: processamento.cartao_bandeira || null,
        codigo_pagamento: processamento.codigo_pagamento || null,
        status: processamento.status,
        cep: shipping.limparCep(endereco.cep),
        endereco: endereco.endereco.trim(),
        numero: String(endereco.numero).trim(),
        complemento: (endereco.complemento || '').trim(),
        bairro: (endereco.bairro || '').trim(),
        cidade: endereco.cidade.trim(),
        estado: endereco.estado.trim().toUpperCase(),
        prazo_dias: valores.prazo_dias,
      });
      const baixaEstoque = db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?');
      for (const l of linhas) {
        Order.inserirItem({
          pedido_id: pedidoId,
          produto_id: l.produto.id,
          nome_produto: l.produto.nome,
          imagem: l.produto.imagem.startsWith('data:') ? '' : l.produto.imagem,
          tamanho: l.tamanho,
          quantidade: l.quantidade,
          preco_unitario: l.produto.preco,
        });
        const r = baixaEstoque.run(l.quantidade, l.produto.id, l.quantidade);
        if (r.changes === 0) throw erro(`Estoque insuficiente para ${l.produto.nome}.`);
      }
      Order.registrarHistorico(pedidoId, 'aguardando_pagamento', OBSERVACOES.aguardando_pagamento);
      if (processamento.status === 'pago') {
        Order.registrarHistorico(pedidoId, 'pago', `Pagamento aprovado no cartão ${processamento.cartao_bandeira} final ${processamento.cartao_final} (simulado).`);
      }
      return pedidoId;
    });

    const pedidoId = gravar();
    return { ...Order.buscarPorId(pedidoId), descricao_pagamento: valores.descricao, pagamento_simulado: !online };
  },

  /**
   * Pedido com pagamento no Mercado Pago: grava o pedido (reservando o estoque),
   * cria a preferência e devolve o link de pagamento. Se o Mercado Pago falhar,
   * o pedido é cancelado na hora e o estoque volta (nada fica pendurado).
   */
  async criarPedidoOnline(usuarioId, dados, { urlBase }) {
    const pedido = OrderService.criarPedido(usuarioId, dados, { online: true });
    try {
      const pref = await MercadoPago.criarPreferencia(pedido, { urlBase });
      Order.salvarMercadoPago(pedido.id, { preferencia_id: pref.id, checkout_url: pref.url });
      Order.registrarHistorico(pedido.id, 'aguardando_pagamento', 'Link de pagamento do Mercado Pago gerado.');
      return { ...Order.buscarPorId(pedido.id), descricao_pagamento: pedido.descricao_pagamento, checkout_url: pref.url, pagamento_simulado: false };
    } catch (e) {
      OrderService.executarAcao(pedido.id, 'cancelar', {
        usuario: { perfil: 'admin' },
        observacao: 'Pedido cancelado automaticamente: não foi possível abrir o pagamento no Mercado Pago. Os itens voltaram ao estoque.',
      });
      throw erro('Não foi possível abrir o pagamento no Mercado Pago. Nenhuma cobrança foi feita; tente de novo.', 502);
    }
  },

  /**
   * Aplica ao pedido um pagamento lido NA API do Mercado Pago (nunca do corpo
   * de um aviso). Regras de segurança:
   * - o pagamento precisa apontar para este pedido (external_reference);
   * - o valor pago precisa cobrir o total do pedido;
   * - a mudança de status passa pelo padrão State (aguardando → pago).
   */
  aplicarPagamentoMercadoPago(pagamento) {
    const pedidoId = Number(pagamento?.external_reference);
    const pedido = pedidoId ? Order.buscarPorId(pedidoId) : null;
    if (!pedido) return null;
    const mudou = pedido.mp_pagamento_id !== String(pagamento.id) || pedido.mp_status !== pagamento.status;
    if (!mudou) return pedido;
    Order.salvarMercadoPago(pedidoId, { pagamento_id: pagamento.id, status: pagamento.status });

    const metodo = pagamento.payment_type_id === 'bank_transfer' ? 'Pix' : pagamento.payment_type_id === 'ticket' ? 'boleto' : 'cartão';
    const rotulo = STATUS_MP[pagamento.status] || pagamento.status;
    const valorOk = Number(pagamento.transaction_amount) + 0.009 >= Number(pedido.total);

    if (pagamento.status === 'approved' && pedido.status === 'aguardando_pagamento') {
      if (!valorOk) {
        Order.registrarHistorico(pedidoId, pedido.status, `Pagamento nº ${pagamento.id} aprovado com valor menor que o total (R$ ${pagamento.transaction_amount}). Pedido não liberado; verificar.`);
        return Order.buscarPorId(pedidoId);
      }
      const novoStatus = estadoDe(pedido.status).proximo('pagar');
      DatabaseConnection.getInstance().transaction(() => {
        Order.atualizarStatus(pedidoId, novoStatus);
        if (pagamento.card?.last_four_digits) {
          Order.atualizarCartao(pedidoId, { final: pagamento.card.last_four_digits, bandeira: BANDEIRA_MP[pagamento.payment_method_id] || 'Cartão' });
        }
        Order.registrarHistorico(pedidoId, novoStatus, `Pagamento via ${metodo} aprovado pelo Mercado Pago (pagamento nº ${pagamento.id}).`);
      })();
    } else if (pagamento.status !== 'approved') {
      const dica = pagamento.status === 'rejected' ? '. Você pode tentar de novo pelo link de pagamento.' : '.';
      Order.registrarHistorico(pedidoId, pedido.status, `Mercado Pago: pagamento nº ${pagamento.id} ${rotulo}${dica}`);
    }
    return Order.buscarPorId(pedidoId);
  },

  /** Botão "Já paguei, verificar" e a volta do Mercado Pago: consulta os pagamentos do pedido. */
  async verificarMercadoPago(pedidoId) {
    const pagamentos = await MercadoPago.pagamentosDoPedido(pedidoId);
    // Um aprovado vale mais que tentativas recusadas anteriores.
    const escolhido = pagamentos.find((p) => p.status === 'approved') || pagamentos[0];
    if (escolhido) OrderService.aplicarPagamentoMercadoPago(escolhido);
    return Order.buscarPorId(pedidoId);
  },

  /**
   * Muda o status usando o padrão State: o estado atual decide se a ação é
   * permitida e qual é o próximo status. Cancelar devolve os itens ao estoque.
   */
  executarAcao(pedidoId, acao, { usuario, observacao: observacaoFixa } = {}) {
    const pedido = Order.buscarPorId(pedidoId);
    if (!pedido) throw erro('Pedido não encontrado.', 404);
    const ehAdmin = usuario?.perfil === 'admin';
    if (!ehAdmin) {
      if (pedido.usuario_id !== usuario?.id) throw erro('Pedido não encontrado.', 404);
      // Cliente só pode pagar (simulação de Pix/boleto) ou cancelar.
      if (!['pagar', 'cancelar'].includes(acao)) throw erro('Ação permitida apenas ao administrador.', 403);
      // Pedido do Mercado Pago só vira pago quando o próprio Mercado Pago confirma.
      if (acao === 'pagar' && pedido.mp_preferencia_id) throw erro('Este pedido é pago pelo Mercado Pago. Use o botão Já paguei, verificar.', 409);
    }
    const novoStatus = estadoDe(pedido.status).proximo(acao);
    const db = DatabaseConnection.getInstance();
    db.transaction(() => {
      const extras = acao === 'enviar' ? { codigo_rastreio: gerarRastreio() } : {};
      Order.atualizarStatus(pedidoId, novoStatus, extras);
      if (acao === 'cancelar') {
        const devolve = db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?');
        pedido.itens.forEach((i) => devolve.run(i.quantidade, i.produto_id));
      }
      let observacao = OBSERVACOES[novoStatus];
      if (acao === 'pagar') observacao = `Pagamento via ${pedido.forma_pagamento === 'pix' ? 'Pix' : 'boleto'} confirmado (simulado).`;
      if (acao === 'enviar') observacao += ` Código de rastreio: ${extras.codigo_rastreio}.`;
      if (acao === 'cancelar') observacao += ehAdmin ? ' (pela loja)' : ' (pelo cliente)';
      if (observacaoFixa) observacao = observacaoFixa;
      Order.registrarHistorico(pedidoId, novoStatus, observacao);
    })();
    return Order.buscarPorId(pedidoId);
  },

  acoesPermitidas(status) {
    return estadoDe(status).acoesPermitidas();
  },
};

module.exports = OrderService;
