const DatabaseConnection = require('../db/connection');

const CAMPOS = ['apelido', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];

function normalizar(d) {
  return {
    apelido: String(d.apelido || 'Casa').trim().slice(0, 30),
    cep: String(d.cep || '').replace(/\D/g, ''),
    endereco: String(d.endereco || '').trim(),
    numero: String(d.numero || '').trim(),
    complemento: String(d.complemento || '').trim(),
    bairro: String(d.bairro || '').trim(),
    cidade: String(d.cidade || '').trim(),
    estado: String(d.estado || '').trim().toUpperCase(),
  };
}

const Address = {
  listar(usuarioId) {
    const db = DatabaseConnection.getInstance();
    return db.prepare('SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY principal DESC, id').all(usuarioId)
      .map((e) => ({ ...e, principal: !!e.principal }));
  },

  buscar(usuarioId, id) {
    const db = DatabaseConnection.getInstance();
    return db.prepare('SELECT * FROM enderecos WHERE usuario_id = ? AND id = ?').get(usuarioId, id) || null;
  },

  criar(usuarioId, dados) {
    const db = DatabaseConnection.getInstance();
    const registro = normalizar(dados);
    const primeiro = !db.prepare('SELECT 1 FROM enderecos WHERE usuario_id = ?').get(usuarioId);
    const r = db.prepare(`INSERT INTO enderecos (usuario_id, ${CAMPOS.join(', ')}, principal)
      VALUES (@usuario_id, ${CAMPOS.map((c) => '@' + c).join(', ')}, @principal)`).run({ ...registro, usuario_id: usuarioId, principal: primeiro ? 1 : 0 });
    if (dados.principal) Address.tornarPrincipal(usuarioId, Number(r.lastInsertRowid));
    return Address.buscar(usuarioId, Number(r.lastInsertRowid));
  },

  atualizar(usuarioId, id, dados) {
    const db = DatabaseConnection.getInstance();
    const atual = Address.buscar(usuarioId, id);
    if (!atual) return null;
    const registro = normalizar({ ...atual, ...dados });
    db.prepare(`UPDATE enderecos SET ${CAMPOS.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id AND usuario_id = @usuario_id`)
      .run({ ...registro, id, usuario_id: usuarioId });
    if (dados.principal) Address.tornarPrincipal(usuarioId, id);
    return Address.buscar(usuarioId, id);
  },

  tornarPrincipal(usuarioId, id) {
    const db = DatabaseConnection.getInstance();
    db.prepare('UPDATE enderecos SET principal = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE usuario_id = ?').run(id, usuarioId);
  },

  excluir(usuarioId, id) {
    const db = DatabaseConnection.getInstance();
    const era = Address.buscar(usuarioId, id);
    const r = db.prepare('DELETE FROM enderecos WHERE id = ? AND usuario_id = ?').run(id, usuarioId);
    if (era?.principal) {
      const outro = db.prepare('SELECT id FROM enderecos WHERE usuario_id = ? ORDER BY id LIMIT 1').get(usuarioId);
      if (outro) Address.tornarPrincipal(usuarioId, outro.id);
    }
    return r.changes > 0;
  },

  normalizar,
};

module.exports = Address;
