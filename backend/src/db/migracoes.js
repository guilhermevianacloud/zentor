/**
 * Migrações simples: acrescenta colunas novas num banco que já existia.
 * O schema.sql cria o banco do zero já com tudo; isto só serve para quem
 * criou o banco antes da integração com o Mercado Pago (não apaga dados).
 */
const COLUNAS_PEDIDOS = ['mp_preferencia_id', 'mp_checkout_url', 'mp_pagamento_id', 'mp_status'];

function aplicarMigracoes(db) {
  const existentes = db.prepare('PRAGMA table_info(pedidos)').all().map((c) => c.name);
  if (!existentes.length) return;
  for (const coluna of COLUNAS_PEDIDOS) {
    if (!existentes.includes(coluna)) db.exec(`ALTER TABLE pedidos ADD COLUMN ${coluna} TEXT`);
  }
}

module.exports = { aplicarMigracoes };
