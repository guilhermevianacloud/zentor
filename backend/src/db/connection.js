/**
 * PADRÃO SINGLETON — conexão única com o SQLite.
 *
 * Por quê: toda a API (models, services, seed) precisa do mesmo banco.
 * Abrir uma conexão por requisição desperdiça recurso e, no SQLite,
 * várias conexões escrevendo ao mesmo tempo geram "database is locked".
 * O Singleton garante UMA instância, criada na primeira chamada (lazy)
 * e reaproveitada por todo o processo.
 *
 * Usa o SQLite embutido no Node.js (módulo node:sqlite, Node 22.13+):
 * não precisa compilar nada na instalação, ao contrário do better-sqlite3.
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

class DatabaseConnection {
  static #instancia = null;

  /** Ponto de acesso global à única conexão. */
  static getInstance() {
    if (!DatabaseConnection.#instancia) {
      const arquivo = process.env.DB_FILE || path.join(__dirname, '..', '..', 'data', 'zentor.db');
      if (arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      const db = new DatabaseSync(arquivo);
      db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      db.transaction = DatabaseConnection.#criarTransacao(db);
      DatabaseConnection.#instancia = db;
    }
    return DatabaseConnection.#instancia;
  }

  /** db.transaction(fn) devolve uma função que roda fn entre BEGIN e COMMIT (ROLLBACK se der erro). */
  static #criarTransacao(db) {
    return (fn) => (...args) => {
      db.exec('BEGIN');
      try {
        const resultado = fn(...args);
        db.exec('COMMIT');
        return resultado;
      } catch (erro) {
        db.exec('ROLLBACK');
        throw erro;
      }
    };
  }

  /** Usado pelos testes e pelo seed para fechar a conexão. */
  static close() {
    if (DatabaseConnection.#instancia) {
      DatabaseConnection.#instancia.close();
      DatabaseConnection.#instancia = null;
    }
  }
}

module.exports = DatabaseConnection;
