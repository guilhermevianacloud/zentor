const express = require('express');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { autenticar, somenteAdmin, usuarioOpcional } = require('../middleware/auth');

const router = express.Router();

// GET /api/produtos?categoria=&uso=&busca=&novidade=1&tamanho=&precoMin=&precoMax=&ordenar=
router.get('/', (req, res) => {
  const { categoria, uso, busca, novidade, tamanho, precoMin, precoMax, ordenar } = req.query;
  res.json(Product.listar({
    categoria, uso, busca, tamanho, precoMin, precoMax, ordenar, novidade: novidade === '1' || novidade === 'true',
  }));
});

// GET /api/produtos/filtros — opções para os filtros do catálogo
router.get('/filtros', (req, res) => {
  res.json({ categorias: Product.CATEGORIAS, usos: Product.USOS, tamanhos: Product.TAMANHOS, ordenacoes: Product.ORDENACOES });
});

// GET /api/produtos/:id
router.get('/:id', (req, res) => {
  const produto = Product.buscarPorId(Number(req.params.id));
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.json(produto);
});

/* ---------- Avaliações ---------- */

// GET /api/produtos/:id/avaliacoes — lista, distribuição de notas e (se logado) se o cliente pode avaliar
router.get('/:id/avaliacoes', usuarioOpcional, (req, res) => {
  const id = Number(req.params.id);
  if (!Product.buscarPorId(id)) return res.status(404).json({ erro: 'Produto não encontrado.' });
  const resposta = { avaliacoes: Review.listarPorProduto(id), distribuicao: Review.resumo(id), pode_avaliar: false, minha: null };
  if (req.usuario) {
    resposta.pode_avaliar = Order.clienteComprou(req.usuario.id, id);
    resposta.minha = Review.doUsuario(req.usuario.id, id);
  }
  return res.json(resposta);
});

// POST /api/produtos/:id/avaliacoes — só quem comprou (pedido pago, enviado ou entregue)
router.post('/:id/avaliacoes', autenticar, (req, res) => {
  const id = Number(req.params.id);
  if (!Product.buscarPorId(id)) return res.status(404).json({ erro: 'Produto não encontrado.' });
  if (!Order.clienteComprou(req.usuario.id, id)) {
    return res.status(403).json({ erro: 'Só quem comprou este capacete pode avaliá-lo.' });
  }
  const nota = Number(req.body?.nota);
  const comentario = String(req.body?.comentario || '').trim().slice(0, 500);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return res.status(400).json({ erro: 'Dê uma nota de 1 a 5 estrelas.' });
  Review.salvar(req.usuario.id, id, nota, comentario);
  return res.status(201).json({ mensagem: 'Avaliação publicada. Obrigado!', produto: Product.buscarPorId(id) });
});

/* ---------- Área do administrador (CRUD) ---------- */

function validarProduto(d, parcial = false) {
  const erros = {};
  const exige = (campo) => !parcial || d[campo] !== undefined;
  if (exige('codigo') && !String(d.codigo || '').trim()) erros.codigo = 'Informe o código.';
  if (exige('nome') && String(d.nome || '').trim().length < 3) erros.nome = 'Informe o nome (mín. 3 letras).';
  if (exige('categoria') && !Product.CATEGORIAS.includes(d.categoria)) erros.categoria = `Use: ${Product.CATEGORIAS.join(', ')}.`;
  if (exige('uso') && !Product.USOS.includes(d.uso)) erros.uso = `Use: ${Product.USOS.join(', ')}.`;
  if (exige('preco') && !(Number(d.preco) > 0)) erros.preco = 'Preço deve ser maior que zero.';
  if (d.preco_original && Number(d.preco_original) <= Number(d.preco ?? 0)) {
    erros.preco_original = 'O preço "DE" deve ser maior que o preço "POR".';
  }
  if (d.estoque !== undefined && !(Number.isInteger(Number(d.estoque)) && Number(d.estoque) >= 0)) {
    erros.estoque = 'Estoque deve ser inteiro e não negativo.';
  }
  if (d.tamanhos !== undefined) {
    const lista = Array.isArray(d.tamanhos) ? d.tamanhos : String(d.tamanhos).split(',');
    if (!lista.length || lista.some((t) => !Product.TAMANHOS.includes(String(t).trim()))) erros.tamanhos = 'Escolha ao menos um tamanho válido.';
  }
  if (d.cor !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(d.cor)) erros.cor = 'Cor no formato #RRGGBB.';
  return erros;
}

// POST /api/produtos  (inserir)
router.post('/', autenticar, somenteAdmin, (req, res) => {
  const erros = validarProduto(req.body || {});
  if (Object.keys(erros).length) return res.status(400).json({ erro: 'Verifique os campos.', campos: erros });
  return res.status(201).json(Product.criar(req.body));
});

// PUT /api/produtos/:id  (alterar)
router.put('/:id', autenticar, somenteAdmin, (req, res) => {
  const atual = Product.buscarPorId(Number(req.params.id));
  if (!atual) return res.status(404).json({ erro: 'Produto não encontrado.' });
  const erros = validarProduto({ ...atual, ...req.body }, true);
  if (Object.keys(erros).length) return res.status(400).json({ erro: 'Verifique os campos.', campos: erros });
  return res.json(Product.atualizar(Number(req.params.id), req.body));
});

// DELETE /api/produtos/:id  (excluir — exclusão lógica)
router.delete('/:id', autenticar, somenteAdmin, (req, res) => {
  if (!Product.excluir(Number(req.params.id))) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.status(204).end();
});

module.exports = router;
