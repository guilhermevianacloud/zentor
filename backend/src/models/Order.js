const DatabaseConnection = require('../db/connection');

const CAMPOS = [
  'usuario_id', 'subtotal', 'frete', 'cupom', 'desconto_cupom', 'desconto', 'total', 'forma_pagamento', 'parcelas',
  'valor_parcela', 'cartao_final', 'cartao_bandeira', 'codigo_pagamento', 'status', 'cep', 'endereco', 'numero',
  'complemento', 'bairro', 'cidade', 'estado', 'prazo_dias',
];

const Order = {
  inserir(pedido) {
    const db = DatabaseConnection.getInstance();
    const registro = Object.fromEntries(CAMPOS.map((c) => [c, pedido[c] ?? null]));
    const r = db.prepare(`INSERT INTO pedidos (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map((c) => '@' + c).join(', ')})`).run(registro);
    return Number(r.lastInsertRowid);
  },

  inserirItem(item) {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, imagem, tamanho, quantidade, preco_unitario)
      VALUES (@pedido_id, @produto_id, @nome_produto, @imagem, @tamanho, @quantidade, @preco_unitario)`).run(item);
  },

  registrarHistorico(pedidoId, status, observacao = '') {
    const db = DatabaseConnection.getInstance();
    db.prepare('INSERT INTO historico_pedido (pedido_id, status, observacao) VALUES (?, ?, ?)').run(pedidoId, status, observacao);
  },

  atualizarStatus(pedidoId, status, extras = {}) {
    const db = DatabaseConnection.getInstance();
    db.prepare(`UPDATE pedidos SET status = ?, codigo_rastreio = COALESCE(?, codigo_rastreio), atualizado_em = datetime('now')
                WHERE id = ?`).run(status, extras.codigo_rastreio ?? null, pedidoId);
  },

  /** Guarda o que veio do Mercado Pago (preferência, link, pagamento). Só altera os campos informados. */
  salvarMercadoPago(pedidoId, { preferencia_id, checkout_url, pagamento_id, status } = {}) {
    const db = DatabaseConnection.getInstance();
    db.prepare(`UPDATE pedidos SET
        mp_preferencia_id = COALESCE(?, mp_preferencia_id), mp_checkout_url = COALESCE(?, mp_checkout_url),
        mp_pagamento_id = COALESCE(?, mp_pagamento_id), mp_status = COALESCE(?, mp_status), atualizado_em = datetime('now')
      WHERE id = ?`).run(preferencia_id ?? null, checkout_url ?? null, pagamento_id != null ? String(pagamento_id) : null, status ?? null, pedidoId);
  },

  atualizarCartao(pedidoId, { final, bandeira }) {
    const db = DatabaseConnection.getInstance();
    db.prepare('UPDATE pedidos SET cartao_final = COALESCE(?, cartao_final), cartao_bandeira = COALESCE(?, cartao_bandeira) WHERE id = ?')
      .run(final ?? null, bandeira ?? null, pedidoId);
  },

  buscarPorId(id) {
    const db = DatabaseConnection.getInstance();
    const pedido = db.prepare(`
      SELECT p.*, u.nome || ' ' || u.sobrenome AS cliente, u.email AS email_cliente
      FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`).get(id);
    if (!pedido) return null;
    return {
      ...pedido,
      itens: db.prepare('SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY id').all(id),
      historico: db.prepare('SELECT status, observacao, criado_em FROM historico_pedido WHERE pedido_id = ? ORDER BY id').all(id),
    };
  },

  listarPorUsuario(usuarioId) {
    const db = DatabaseConnection.getInstance();
    const pedidos = db.prepare('SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC').all(usuarioId);
    const itens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY id');
    return pedidos.map((p) => ({ ...p, itens: itens.all(p.id) }));
  },

  listarTodos({ status } = {}) {
    const db = DatabaseConnection.getInstance();
    const filtro = status ? 'WHERE p.status = ?' : '';
    const pedidos = db.prepare(`
      SELECT p.*, u.nome || ' ' || u.sobrenome AS cliente
      FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id ${filtro} ORDER BY p.id DESC`).all(...(status ? [status] : []));
    const itens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY id');
    return pedidos.map((p) => ({ ...p, itens: itens.all(p.id) }));
  },

  /** O cliente comprou este produto (pedido não cancelado)? Usado para liberar avaliação. */
  clienteComprou(usuarioId, produtoId) {
    const db = DatabaseConnection.getInstance();
    return !!db.prepare(`
      SELECT 1 FROM itens_pedido i JOIN pedidos p ON p.id = i.pedido_id
      WHERE p.usuario_id = ? AND i.produto_id = ? AND p.status IN ('pago','enviado','entregue')`).get(usuarioId, produtoId);
  },
};

module.exports = Order;
