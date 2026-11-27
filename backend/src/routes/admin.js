/** Painel do administrador: indicadores e gestão de pedidos. */
const express = require('express');
const DatabaseConnection = require('../db/connection');
const Order = require('../models/Order');
const OrderService = require('../services/orderService');
const { ESTADOS } = require('../services/orderStatus');
const { autenticar, somenteAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar, somenteAdmin);

// GET /api/admin/resumo — indicadores do painel
router.get('/resumo', (req, res) => {
  const db = DatabaseConnection.getInstance();
  const vendas = db.prepare(`
    SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS faturamento
    FROM pedidos WHERE status IN ('pago','enviado','entregue')`).get();
  const porStatus = Object.fromEntries(Object.keys(ESTADOS).map((s) => [s, 0]));
  db.prepare('SELECT status, COUNT(*) AS qtd FROM pedidos GROUP BY status').all().forEach((l) => { porStatus[l.status] = Number(l.qtd); });
  const maisVendidos = db.prepare(`
    SELECT i.produto_id, i.nome_produto AS nome, SUM(i.quantidade) AS unidades, SUM(i.quantidade * i.preco_unitario) AS receita
    FROM itens_pedido i JOIN pedidos p ON p.id = i.pedido_id
    WHERE p.status IN ('pago','enviado','entregue')
    GROUP BY i.produto_id ORDER BY unidades DESC LIMIT 5`).all();
  const estoqueBaixo = db.prepare('SELECT id, nome, estoque FROM produtos WHERE ativo = 1 AND estoque <= 5 ORDER BY estoque').all();
  const clientes = db.prepare("SELECT COUNT(*) AS qtd FROM usuarios WHERE perfil = 'cliente'").get();
  const produtos = db.prepare('SELECT COUNT(*) AS qtd FROM produtos WHERE ativo = 1').get();
  res.json({
    faturamento: Math.round(Number(vendas.faturamento) * 100) / 100,
    pedidos_pagos: Number(vendas.pedidos),
    ticket_medio: vendas.pedidos ? Math.round((vendas.faturamento / vendas.pedidos) * 100) / 100 : 0,
    por_status: porStatus,
    mais_vendidos: maisVendidos.map((m) => ({ ...m, unidades: Number(m.unidades), receita: Math.round(m.receita * 100) / 100 })),
    estoque_baixo: estoqueBaixo,
    total_clientes: Number(clientes.qtd),
    total_produtos: Number(produtos.qtd),
  });
});

// GET /api/admin/pedidos?status=
router.get('/pedidos', (req, res) => {
  const status = req.query.status && ESTADOS[req.query.status] ? req.query.status : undefined;
  res.json(Order.listarTodos({ status }).map((p) => ({ ...p, acoes: OrderService.acoesPermitidas(p.status) })));
});

// POST /api/admin/pedidos/:id/acao  { acao: pagar | enviar | entregar | cancelar }
router.post('/pedidos/:id/acao', (req, res) => {
  const pedido = OrderService.executarAcao(Number(req.params.id), req.body?.acao, { usuario: req.usuario });
  res.json({ ...pedido, acoes: OrderService.acoesPermitidas(pedido.status) });
});

module.exports = router;
