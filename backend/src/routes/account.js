/** Rotas da conta do cliente: favoritos e endereços salvos. */
const express = require('express');
const DatabaseConnection = require('../db/connection');
const Product = require('../models/Product');
const Address = require('../models/Address');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

/* ---------- Favoritos ---------- */

function idsFavoritos(usuarioId) {
  const db = DatabaseConnection.getInstance();
  return db.prepare('SELECT produto_id FROM favoritos WHERE usuario_id = ? ORDER BY criado_em DESC').all(usuarioId).map((l) => l.produto_id);
}

// GET /api/favoritos — produtos favoritos (e a lista de ids para marcar o coração)
router.get('/favoritos', (req, res) => {
  const ids = idsFavoritos(req.usuario.id);
  const produtos = Product.listar({ ids });
  res.json({ ids, produtos: ids.map((id) => produtos.find((p) => p.id === id)).filter(Boolean) });
});

router.post('/favoritos/:produtoId', (req, res) => {
  const id = Number(req.params.produtoId);
  if (!Product.buscarPorId(id)) return res.status(404).json({ erro: 'Produto não encontrado.' });
  DatabaseConnection.getInstance().prepare('INSERT OR IGNORE INTO favoritos (usuario_id, produto_id) VALUES (?, ?)').run(req.usuario.id, id);
  return res.status(201).json({ ids: idsFavoritos(req.usuario.id) });
});

router.delete('/favoritos/:produtoId', (req, res) => {
  DatabaseConnection.getInstance().prepare('DELETE FROM favoritos WHERE usuario_id = ? AND produto_id = ?')
    .run(req.usuario.id, Number(req.params.produtoId));
  res.json({ ids: idsFavoritos(req.usuario.id) });
});

/* ---------- Endereços ---------- */

function validarEndereco(d) {
  const e = Address.normalizar(d);
  const erros = {};
  if (!/^\d{8}$/.test(e.cep)) erros.cep = 'CEP com 8 dígitos.';
  if (!e.endereco) erros.endereco = 'Informe o endereço.';
  if (!e.numero) erros.numero = 'Informe o número.';
  if (!e.cidade) erros.cidade = 'Informe a cidade.';
  if (!/^[A-Z]{2}$/.test(e.estado)) erros.estado = 'Sigla com 2 letras (ex.: SP).';
  return erros;
}

router.get('/enderecos', (req, res) => res.json(Address.listar(req.usuario.id)));

router.post('/enderecos', (req, res) => {
  const erros = validarEndereco(req.body || {});
  if (Object.keys(erros).length) return res.status(400).json({ erro: 'Verifique o endereço.', campos: erros });
  return res.status(201).json(Address.criar(req.usuario.id, req.body));
});

router.put('/enderecos/:id', (req, res) => {
  const atual = Address.buscar(req.usuario.id, Number(req.params.id));
  if (!atual) return res.status(404).json({ erro: 'Endereço não encontrado.' });
  const erros = validarEndereco({ ...atual, ...req.body });
  if (Object.keys(erros).length) return res.status(400).json({ erro: 'Verifique o endereço.', campos: erros });
  return res.json(Address.atualizar(req.usuario.id, Number(req.params.id), req.body));
});

router.delete('/enderecos/:id', (req, res) => {
  if (!Address.excluir(req.usuario.id, Number(req.params.id))) return res.status(404).json({ erro: 'Endereço não encontrado.' });
  return res.status(204).end();
});

module.exports = router;
