const DatabaseConnection = require('../db/connection');

const Review = {
  listarPorProduto(produtoId) {
    const db = DatabaseConnection.getInstance();
    // Mostra só o primeiro nome e a inicial do sobrenome (privacidade do cliente).
    return db.prepare(`
      SELECT a.id, a.nota, a.comentario, a.criado_em, a.usuario_id,
             u.nome || ' ' || substr(u.sobrenome, 1, 1) || '.' AS autor
      FROM avaliacoes a JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.produto_id = ? ORDER BY a.criado_em DESC, a.id DESC`).all(produtoId);
  },

  resumo(produtoId) {
    const db = DatabaseConnection.getInstance();
    const linhas = db.prepare('SELECT nota, COUNT(*) AS qtd FROM avaliacoes WHERE produto_id = ? GROUP BY nota').all(produtoId);
    const distribuicao = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    linhas.forEach((l) => { distribuicao[l.nota] = Number(l.qtd); });
    return distribuicao;
  },

  /** Cria ou atualiza a avaliação do cliente (uma por produto). */
  salvar(usuarioId, produtoId, nota, comentario) {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO avaliacoes (usuario_id, produto_id, nota, comentario) VALUES (?, ?, ?, ?)
      ON CONFLICT (usuario_id, produto_id) DO UPDATE SET nota = excluded.nota, comentario = excluded.comentario,
        criado_em = datetime('now')`).run(usuarioId, produtoId, nota, comentario);
  },

  doUsuario(usuarioId, produtoId) {
    const db = DatabaseConnection.getInstance();
    return db.prepare('SELECT nota, comentario FROM avaliacoes WHERE usuario_id = ? AND produto_id = ?').get(usuarioId, produtoId) || null;
  },
};

module.exports = Review;
