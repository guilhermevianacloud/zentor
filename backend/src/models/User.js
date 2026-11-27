const bcrypt = require('bcryptjs');
const DatabaseConnection = require('../db/connection');

/** Nunca devolve o hash da senha para fora do model. */
function publico(u) {
  if (!u) return null;
  const { senha_hash, ...resto } = u;
  return resto;
}

const User = {
  buscarPorEmail(email) {
    const db = DatabaseConnection.getInstance();
    return db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).trim().toLowerCase());
  },

  buscarPorId(id) {
    const db = DatabaseConnection.getInstance();
    return publico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id));
  },

  existeCpf(cpf) {
    const db = DatabaseConnection.getInstance();
    return !!db.prepare('SELECT 1 FROM usuarios WHERE cpf = ?').get(cpf);
  },

  criar({ nome, sobrenome, cpf, telefone, email, senha, perfil = 'cliente' }) {
    const db = DatabaseConnection.getInstance();
    const r = db.prepare(`
      INSERT INTO usuarios (nome, sobrenome, cpf, telefone, email, senha_hash, perfil)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      nome.trim(), sobrenome.trim(), cpf, telefone, email.trim().toLowerCase(), bcrypt.hashSync(senha, 10), perfil,
    );
    return User.buscarPorId(Number(r.lastInsertRowid));
  },

  atualizar(id, { nome, sobrenome, telefone }) {
    const db = DatabaseConnection.getInstance();
    db.prepare('UPDATE usuarios SET nome = ?, sobrenome = ?, telefone = ? WHERE id = ?').run(nome.trim(), sobrenome.trim(), telefone, id);
    return User.buscarPorId(id);
  },

  buscarComSenha(id) {
    const db = DatabaseConnection.getInstance();
    return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  },

  verificarSenha(usuario, senha) {
    return bcrypt.compareSync(String(senha), usuario.senha_hash);
  },

  trocarSenha(id, novaSenha) {
    const db = DatabaseConnection.getInstance();
    db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(bcrypt.hashSync(novaSenha, 10), id);
  },

  publico,
};

module.exports = User;
