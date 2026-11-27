/**
 * Testes automatizados da API (node:test + supertest).
 * Rodam num banco em memória, recriado a cada execução: npm test
 */
process.env.DB_FILE = ':memory:';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste';
// Os testes nunca usam o Mercado Pago real, mesmo com token no .env (o dotenv não sobrescreve variável já definida).
process.env.MP_ACCESS_TOKEN = '';
process.env.MP_MODO = '';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { seed } = require('../src/db/seed');
const app = require('../src/app');
const DatabaseConnection = require('../src/db/connection');
const { PixStrategy, CartaoCreditoStrategy, BoletoStrategy, luhnValido, bandeira } = require('../src/services/paymentStrategies');
const { estadoDe } = require('../src/services/orderStatus');
const shipping = require('../src/services/shippingService');

let tokenCliente;
let tokenAdmin;
let tokenNovo;
const endereco = { cep: '01310-100', endereco: 'Av. Paulista', numero: '1000', complemento: '', cidade: 'São Paulo', estado: 'SP' };
const cartao = { numero: '4111 1111 1111 1111', nome: 'CLIENTE TESTE', validade: '12/35', cvv: '123' };
const auth = (t) => ({ Authorization: `Bearer ${t}` });

before(async () => {
  seed();
  tokenCliente = (await request(app).post('/api/auth/login').send({ email: 'cliente@zentor.com.br', senha: 'cliente123' })).body.token;
  tokenAdmin = (await request(app).post('/api/auth/login').send({ email: 'admin@zentor.com.br', senha: 'admin123' })).body.token;
});

describe('Padrões de projeto', () => {
  test('Singleton: getInstance devolve sempre a mesma conexão', () => {
    assert.equal(DatabaseConnection.getInstance(), DatabaseConnection.getInstance());
  });

  test('Strategy: Pix aplica 5% de desconto e gera código', () => {
    const r = new PixStrategy().calcular(1000);
    assert.equal(r.desconto, 50);
    assert.equal(r.total, 950);
    const p = new PixStrategy().processar({}, 950);
    assert.equal(p.status, 'aguardando_pagamento');
    assert.match(p.codigo_pagamento, /BR\.GOV\.BCB\.PIX/);
  });

  test('Strategy: cartão em 10x, limite de parcelas e aprovação simulada', () => {
    const r = new CartaoCreditoStrategy().calcular(1364.8, { parcelas: 10 });
    assert.equal(r.valor_parcela, 136.48);
    assert.throws(() => new CartaoCreditoStrategy().calcular(100, { parcelas: 11 }));
    const ok = new CartaoCreditoStrategy().processar({ cartao });
    assert.deepEqual(ok, { status: 'pago', cartao_final: '1111', cartao_bandeira: 'Visa' });
  });

  test('Strategy: cartão recusa número inválido, validade vencida e CVV errado', () => {
    const s = new CartaoCreditoStrategy();
    assert.throws(() => s.processar({ cartao: { ...cartao, numero: '4111111111111112' } }), /Número do cartão/);
    assert.throws(() => s.processar({ cartao: { ...cartao, validade: '01/20' } }), /Validade/);
    assert.throws(() => s.processar({ cartao: { ...cartao, cvv: '1' } }), /CVV/);
    assert.ok(luhnValido('5555555555554444'));
    assert.equal(bandeira('5555555555554444'), 'Mastercard');
  });

  test('Strategy: boleto não altera o valor e gera linha digitável', () => {
    assert.equal(new BoletoStrategy().calcular(500.5).total, 500.5);
    assert.match(new BoletoStrategy().processar({}, 500.5).codigo_pagamento, /^\d{5}\.\d{5} /);
  });

  test('State: cada status aceita só as ações certas', () => {
    assert.deepEqual(estadoDe('aguardando_pagamento').acoesPermitidas(), ['pagar', 'cancelar']);
    assert.deepEqual(estadoDe('pago').acoesPermitidas(), ['enviar', 'cancelar']);
    assert.deepEqual(estadoDe('enviado').acoesPermitidas(), ['entregar']);
    assert.deepEqual(estadoDe('entregue').acoesPermitidas(), []);
    assert.equal(estadoDe('pago').proximo('enviar'), 'enviado');
    assert.throws(() => estadoDe('entregue').proximo('cancelar'), (e) => e.status === 409);
  });
});

describe('Frete e cupons', () => {
  test('Frete: R$ 34,99 abaixo de R$ 1.500 e grátis a partir disso', () => {
    assert.equal(shipping.calcularFrete(1499.99), 34.99);
    assert.equal(shipping.calcularFrete(1500), 0);
    assert.equal(shipping.faltaParaFreteGratis(1329.8), 170.2);
  });

  test('GET /api/frete valida o CEP e calcula prazo', async () => {
    const ok = await request(app).get('/api/frete?cep=01310100');
    assert.equal(ok.body.valor, 34.99);
    assert.equal(ok.body.prazo_dias_uteis, 3);
    assert.equal((await request(app).get('/api/frete?cep=40010000')).body.prazo_dias_uteis, 7);
    assert.equal((await request(app).get('/api/frete?cep=123')).status, 400);
  });

  test('Cupons: percentual, valor com mínimo e inválido', async () => {
    const p = await request(app).post('/api/cupons/validar').send({ codigo: 'bemvindo10', subtotal: 800 });
    assert.equal(p.body.desconto, 80);
    const abaixo = await request(app).post('/api/cupons/validar').send({ codigo: 'ZENTOR50', subtotal: 300 });
    assert.equal(abaixo.status, 400);
    const invalido = await request(app).post('/api/cupons/validar').send({ codigo: 'NAOEXISTE', subtotal: 300 });
    assert.equal(invalido.status, 400);
  });

  test('Simular: cupom de frete grátis + Pix sobre o valor com desconto', async () => {
    const r = await request(app).post('/api/pedidos/simular').send({
      itens: [{ produto_id: 6, quantidade: 1 }], cupom: 'FRETEGRATIS', pagamento: { metodo: 'pix' },
    });
    assert.equal(r.body.subtotal, 329.9);
    assert.equal(r.body.frete, 0);
    assert.equal(r.body.total, 313.4); // 329,90 - 5% (16,495 arredondado para 16,50)
  });
});

describe('Conta do cliente', () => {
  test('Cadastro: valida campos, CPF e e-mail duplicado', async () => {
    const invalido = await request(app).post('/api/auth/cadastro').send({ nome: '', cpf: '12345678900', email: 'x', senha: '1' });
    assert.equal(invalido.status, 400);
    assert.ok(invalido.body.campos.cpf);
    const novo = { nome: 'Ana', sobrenome: 'Souza', cpf: '935.411.347-80', telefone: '(11) 91234-5678', email: 'ana@teste.com', senha: 'segura1' };
    const ok = await request(app).post('/api/auth/cadastro').send(novo);
    assert.equal(ok.status, 201);
    assert.equal(ok.body.usuario.senha_hash, undefined, 'hash da senha não pode sair da API');
    tokenNovo = ok.body.token;
    assert.equal((await request(app).post('/api/auth/cadastro').send(novo)).status, 400);
  });

  test('Login: senha errada é recusada', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'cliente@zentor.com.br', senha: 'errada' });
    assert.equal(r.status, 401);
  });

  test('Perfil: editar dados e trocar senha (exige a atual)', async () => {
    const r = await request(app).put('/api/auth/me').set(auth(tokenNovo)).send({ nome: 'Ana Paula', sobrenome: 'Souza', telefone: '11912345678' });
    assert.equal(r.body.usuario.nome, 'Ana Paula');
    const errada = await request(app).put('/api/auth/senha').set(auth(tokenNovo)).send({ senhaAtual: 'x', novaSenha: 'outra123' });
    assert.equal(errada.status, 400);
    const certa = await request(app).put('/api/auth/senha').set(auth(tokenNovo)).send({ senhaAtual: 'segura1', novaSenha: 'outra123' });
    assert.equal(certa.status, 200);
    assert.equal((await request(app).post('/api/auth/login').send({ email: 'ana@teste.com', senha: 'outra123' })).status, 200);
  });

  test('Recuperação de senha (simulada) troca a senha', async () => {
    const codigo = (await request(app).post('/api/auth/esqueci-senha').send({ email: 'ana@teste.com' })).body.codigo_simulado;
    assert.match(codigo, /^\d{6}$/);
    assert.equal((await request(app).post('/api/auth/redefinir-senha').send({ email: 'ana@teste.com', codigo: '000000', novaSenha: 'nova123' })).status, 400);
    assert.equal((await request(app).post('/api/auth/redefinir-senha').send({ email: 'ana@teste.com', codigo, novaSenha: 'nova123' })).status, 200);
    assert.equal((await request(app).post('/api/auth/login').send({ email: 'ana@teste.com', senha: 'nova123' })).status, 200);
  });

  test('Endereços: criar, primeiro vira principal, validar e excluir', async () => {
    const r = await request(app).post('/api/enderecos').set(auth(tokenNovo)).send({ apelido: 'Trabalho', ...endereco });
    assert.equal(r.status, 201);
    assert.equal(r.body.principal, 1);
    const invalido = await request(app).post('/api/enderecos').set(auth(tokenNovo)).send({ cep: '1' });
    assert.equal(invalido.status, 400);
    assert.equal((await request(app).delete(`/api/enderecos/${r.body.id}`).set(auth(tokenNovo))).status, 204);
  });

  test('Favoritos: adicionar, listar e remover', async () => {
    await request(app).post('/api/favoritos/1').set(auth(tokenNovo));
    const lista = await request(app).get('/api/favoritos').set(auth(tokenNovo));
    assert.deepEqual(lista.body.ids, [1]);
    assert.equal(lista.body.produtos[0].id, 1);
    const sem = await request(app).delete('/api/favoritos/1').set(auth(tokenNovo));
    assert.deepEqual(sem.body.ids, []);
  });
});

describe('Catálogo e avaliações', () => {
  test('Catálogo: filtros, tamanho, ordenação e média de avaliações', async () => {
    const todos = (await request(app).get('/api/produtos')).body;
    assert.equal(todos.length, 6);
    const american = todos.find((p) => p.codigo === 'ZA021297-2231');
    assert.equal(american.desconto_percentual, 20);
    assert.equal(american.num_avaliacoes, 3);
    assert.equal(american.avaliacao, 4.7);
    const trilha = (await request(app).get('/api/produtos?uso=trilha')).body;
    assert.ok(trilha.length >= 1 && trilha.every((p) => p.uso === 'trilha'));
    const xxl = (await request(app).get('/api/produtos?tamanho=64/XXL')).body;
    assert.deepEqual(xxl.map((p) => p.id), [5]);
    const precos = (await request(app).get('/api/produtos?ordenar=menor_preco')).body.map((p) => p.preco);
    assert.deepEqual(precos, [...precos].sort((a, b) => a - b));
  });

  test('Avaliações: só quem comprou pode avaliar', async () => {
    const naoComprou = await request(app).post('/api/produtos/5/avaliacoes').set(auth(tokenNovo)).send({ nota: 5 });
    assert.equal(naoComprou.status, 403);
    const info = await request(app).get('/api/produtos/1/avaliacoes').set(auth(tokenCliente));
    assert.equal(info.body.pode_avaliar, true);
    const ok = await request(app).post('/api/produtos/1/avaliacoes').set(auth(tokenCliente)).send({ nota: 5, comentario: 'Excelente!' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.produto.num_avaliacoes, 4);
  });
});

describe('Pedidos (Facade + State)', () => {
  test('Pedido exige login e preços vêm do banco', async () => {
    assert.equal((await request(app).post('/api/pedidos').send({})).status, 401);
    const r = await request(app).post('/api/pedidos/simular').send({
      itens: [{ produto_id: 1, quantidade: 1, preco: 0.01 }, { produto_id: 2, quantidade: 1 }], pagamento: { metodo: 'pix' },
    });
    assert.equal(r.body.subtotal, 1788.77);
    assert.equal(r.body.frete, 0);
    assert.equal(r.body.total, 1699.33);
  });

  test('Cartão: pedido nasce pago, grava só o final do cartão e baixa estoque', async () => {
    const antes = (await request(app).get('/api/produtos/4')).body.estoque;
    const r = await request(app).post('/api/pedidos').set(auth(tokenNovo)).send({
      itens: [{ produto_id: 4, quantidade: 2, tamanho: '60/L' }], endereco, pagamento: { metodo: 'cartao', parcelas: 3, cartao },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.status, 'pago');
    assert.equal(r.body.cartao_final, '1111');
    assert.ok(!JSON.stringify(r.body).includes('4111111111111111'), 'número do cartão não pode ser gravado');
    assert.equal(r.body.historico.length, 2);
    assert.equal((await request(app).get('/api/produtos/4')).body.estoque, antes - 2);
  });

  test('Pix: aguarda pagamento, mostra QR Code e o cliente confirma', async () => {
    const r = await request(app).post('/api/pedidos').set(auth(tokenNovo)).send({
      itens: [{ produto_id: 6, quantidade: 1 }], endereco, pagamento: { metodo: 'pix' }, cupom: 'BEMVINDO10',
    });
    assert.equal(r.body.status, 'aguardando_pagamento');
    assert.equal(r.body.desconto_cupom, 32.99);
    const detalhe = await request(app).get(`/api/pedidos/${r.body.id}`).set(auth(tokenNovo));
    assert.match(detalhe.body.qr_code, /^data:image\/png;base64,/);
    assert.deepEqual(detalhe.body.acoes, ['pagar', 'cancelar']);
    const pago = await request(app).post(`/api/pedidos/${r.body.id}/pagar`).set(auth(tokenNovo));
    assert.equal(pago.body.status, 'pago');
  });

  test('Cancelar devolve o estoque; outro cliente não vê o pedido', async () => {
    const antes = (await request(app).get('/api/produtos/3')).body.estoque;
    const r = await request(app).post('/api/pedidos').set(auth(tokenNovo)).send({
      itens: [{ produto_id: 3, quantidade: 1 }], endereco, pagamento: { metodo: 'boleto' },
    });
    assert.equal((await request(app).get(`/api/pedidos/${r.body.id}`).set(auth(tokenCliente))).status, 404);
    const c = await request(app).post(`/api/pedidos/${r.body.id}/cancelar`).set(auth(tokenNovo));
    assert.equal(c.body.status, 'cancelado');
    assert.equal((await request(app).get('/api/produtos/3')).body.estoque, antes);
    const de_novo = await request(app).post(`/api/pedidos/${r.body.id}/cancelar`).set(auth(tokenNovo));
    assert.equal(de_novo.status, 409);
  });

  test('Estoque insuficiente não grava nada', async () => {
    const qtd = (await request(app).get('/api/pedidos/meus').set(auth(tokenNovo))).body.length;
    const r = await request(app).post('/api/pedidos').set(auth(tokenNovo)).send({
      itens: [{ produto_id: 3, quantidade: 999 }], endereco, pagamento: { metodo: 'boleto' },
    });
    assert.equal(r.status, 400);
    assert.equal((await request(app).get('/api/pedidos/meus').set(auth(tokenNovo))).body.length, qtd);
  });
});

describe('Administrador', () => {
  test('Cliente comum não acessa o CRUD nem o painel', async () => {
    assert.equal((await request(app).post('/api/produtos').set(auth(tokenCliente)).send({})).status, 403);
    assert.equal((await request(app).get('/api/admin/resumo').set(auth(tokenCliente))).status, 403);
  });

  test('Inserir, consultar, alterar e excluir produto', async () => {
    const criado = await request(app).post('/api/produtos').set(auth(tokenAdmin)).send({
      codigo: 'ZTESTE-1', nome: 'Capacete Teste', categoria: 'aberto', uso: 'urbano', preco: 199.9, estoque: 3, tamanhos: ['56/S', '58/M'],
    });
    assert.equal(criado.status, 201);
    const id = criado.body.id;
    assert.deepEqual((await request(app).get(`/api/produtos/${id}`)).body.tamanhos, ['56/S', '58/M']);
    const alterado = await request(app).put(`/api/produtos/${id}`).set(auth(tokenAdmin)).send({ preco: 149.9, preco_original: 199.9 });
    assert.equal(alterado.body.desconto_percentual, 25);
    assert.equal((await request(app).put(`/api/produtos/${id}`).set(auth(tokenAdmin)).send({ preco: -1 })).status, 400);
    assert.equal((await request(app).delete(`/api/produtos/${id}`).set(auth(tokenAdmin))).status, 204);
    assert.equal((await request(app).get(`/api/produtos/${id}`)).status, 404);
  });

  test('Painel: indicadores e fluxo do pedido pago → enviado → entregue', async () => {
    const resumo = (await request(app).get('/api/admin/resumo').set(auth(tokenAdmin))).body;
    assert.ok(resumo.faturamento > 0);
    assert.ok(resumo.mais_vendidos.length > 0);
    const pagos = (await request(app).get('/api/admin/pedidos?status=pago').set(auth(tokenAdmin))).body;
    const alvo = pagos[0];
    const enviado = await request(app).post(`/api/admin/pedidos/${alvo.id}/acao`).set(auth(tokenAdmin)).send({ acao: 'enviar' });
    assert.equal(enviado.body.status, 'enviado');
    assert.match(enviado.body.codigo_rastreio, /^ZT\d{9}BR$/);
    const invalido = await request(app).post(`/api/admin/pedidos/${alvo.id}/acao`).set(auth(tokenAdmin)).send({ acao: 'pagar' });
    assert.equal(invalido.status, 409);
    const entregue = await request(app).post(`/api/admin/pedidos/${alvo.id}/acao`).set(auth(tokenAdmin)).send({ acao: 'entregar' });
    assert.equal(entregue.body.status, 'entregue');
    assert.deepEqual(entregue.body.acoes, []);
  });
});

describe('Mercado Pago (Checkout Pro, com API falsa — sem internet)', () => {
  const MercadoPago = require('../src/services/mercadoPagoService');
  const crypto = require('crypto');
  let chamadas = [];
  let pagamentos = {}; // id → pagamento devolvido pela "API"
  const respostaJson = (dados, status = 200) => ({ ok: status < 400, status, json: async () => dados });
  const httpOriginal = MercadoPago.http;

  before(() => {
    process.env.MP_ACCESS_TOKEN = 'TEST-token-falso';
    MercadoPago.http = async (url, opcoes) => {
      chamadas.push({ url, opcoes, corpo: opcoes.body ? JSON.parse(opcoes.body) : null });
      if (url.endsWith('/checkout/preferences')) return respostaJson({ id: 'pref-123', init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123' });
      const busca = url.match(/external_reference=(\d+)/);
      if (busca) return respostaJson({ results: Object.values(pagamentos).filter((p) => p.external_reference === busca[1]).reverse() });
      const um = url.match(/\/v1\/payments\/(\w+)$/);
      if (um && pagamentos[um[1]]) return respostaJson(pagamentos[um[1]]);
      return respostaJson({ message: 'not found' }, 404);
    };
  });

  const { after } = require('node:test');
  after(() => {
    delete process.env.MP_ACCESS_TOKEN;
    delete process.env.MP_WEBHOOK_SECRET;
    MercadoPago.http = httpOriginal;
  });

  const novoPedido = (pagamento) => request(app).post('/api/pedidos').set(auth(tokenCliente))
    .send({ itens: [{ produto_id: 1, quantidade: 1 }], endereco, pagamento });

  test('Config avisa o app que o pagamento é pelo Mercado Pago em modo teste', async () => {
    const r = await request(app).get('/api/pagamentos/config');
    assert.deepEqual(r.body, { mercadopago: true, modo_teste: true });
  });

  test('Pix: cria preferência com o total já com 5% off, só Pix e ligada ao pedido', async () => {
    chamadas = [];
    const r = await novoPedido({ metodo: 'pix' });
    assert.equal(r.status, 201);
    assert.equal(r.body.status, 'aguardando_pagamento');
    assert.match(r.body.checkout_url, /pref_id=pref-123/);
    const pref = chamadas[0].corpo;
    assert.equal(pref.external_reference, String(r.body.id));
    assert.equal(pref.items[0].unit_price, r.body.total);
    assert.equal(r.body.desconto > 0, true);
    const excluidos = pref.payment_methods.excluded_payment_types.map((t) => t.id);
    assert.ok(excluidos.includes('credit_card') && excluidos.includes('ticket') && !excluidos.includes('bank_transfer'));
    assert.equal(chamadas[0].opcoes.headers.Authorization, 'Bearer TEST-token-falso');
  });

  test('Cartão: não exige dados do cartão no app (são digitados no Mercado Pago) e libera até 10x', async () => {
    chamadas = [];
    const r = await novoPedido({ metodo: 'cartao', parcelas: 3 });
    assert.equal(r.status, 201);
    assert.equal(r.body.cartao_final, null);
    assert.equal(chamadas[0].corpo.payment_methods.installments, 10);
    assert.equal(chamadas[0].corpo.payment_methods.default_installments, 3);
  });

  test('Cliente não consegue "simular" o pagamento de um pedido do Mercado Pago', async () => {
    const r = await novoPedido({ metodo: 'boleto' });
    const pagar = await request(app).post(`/api/pedidos/${r.body.id}/pagar`).set(auth(tokenCliente));
    assert.equal(pagar.status, 409);
  });

  test('Verificar: recusado registra no histórico; aprovado com o valor certo vira pago', async () => {
    const r = await novoPedido({ metodo: 'cartao', parcelas: 1 });
    const id = String(r.body.id);
    pagamentos.p1 = { id: 'p1', external_reference: id, status: 'rejected', payment_type_id: 'credit_card', transaction_amount: r.body.total };
    let v = await request(app).post(`/api/pedidos/${id}/mercadopago/verificar`).set(auth(tokenCliente));
    assert.equal(v.body.status, 'aguardando_pagamento');
    assert.ok(v.body.historico.some((h) => /recusado/.test(h.observacao)));

    pagamentos.p2 = { id: 'p2', external_reference: id, status: 'approved', payment_type_id: 'credit_card', payment_method_id: 'master', transaction_amount: r.body.total, card: { last_four_digits: '6351' } };
    v = await request(app).post(`/api/pedidos/${id}/mercadopago/verificar`).set(auth(tokenCliente));
    assert.equal(v.body.status, 'pago');
    assert.equal(v.body.cartao_final, '6351');
    assert.equal(v.body.cartao_bandeira, 'Mastercard');
    assert.deepEqual(v.body.acoes, ['enviar', 'cancelar']);
  });

  test('Segurança: pagamento aprovado com valor menor NÃO libera o pedido', async () => {
    const r = await novoPedido({ metodo: 'pix' });
    const id = String(r.body.id);
    pagamentos.p3 = { id: 'p3', external_reference: id, status: 'approved', payment_type_id: 'bank_transfer', transaction_amount: 1 };
    const v = await request(app).post(`/api/pedidos/${id}/mercadopago/verificar`).set(auth(tokenCliente));
    assert.equal(v.body.status, 'aguardando_pagamento');
  });

  test('Webhook: assinatura inválida é recusada; válida busca o pagamento na API e libera o pedido', async () => {
    process.env.MP_WEBHOOK_SECRET = 'segredo-webhook';
    const r = await novoPedido({ metodo: 'pix' });
    pagamentos.p4 = { id: 'p4', external_reference: String(r.body.id), status: 'approved', payment_type_id: 'bank_transfer', transaction_amount: r.body.total };
    const falso = await request(app).post('/api/webhooks/mercadopago?data.id=p4&type=payment').set('x-signature', 'ts=1,v1=abc').send({});
    assert.equal(falso.status, 401);
    const ts = '1700000000';
    const v1 = crypto.createHmac('sha256', 'segredo-webhook').update(`id:p4;request-id:req-1;ts:${ts};`).digest('hex');
    const ok = await request(app).post('/api/webhooks/mercadopago?data.id=p4&type=payment')
      .set('x-signature', `ts=${ts},v1=${v1}`).set('x-request-id', 'req-1').send({ type: 'payment', data: { id: 'p4' } });
    assert.equal(ok.status, 200);
    const d = await request(app).get(`/api/pedidos/${r.body.id}`).set(auth(tokenCliente));
    assert.equal(d.body.status, 'pago');
  });

  test('Falha no Mercado Pago cancela o pedido e devolve o estoque', async () => {
    const antes = (await request(app).get('/api/produtos/1')).body.estoque;
    const http = MercadoPago.http;
    MercadoPago.http = async () => respostaJson({ message: 'erro' }, 500);
    const r = await novoPedido({ metodo: 'pix' });
    MercadoPago.http = http;
    assert.equal(r.status, 502);
    assert.equal((await request(app).get('/api/produtos/1')).body.estoque, antes);
  });
});
