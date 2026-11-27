require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const app = require('./app');
const DatabaseConnection = require('./db/connection');
const { seed } = require('./db/seed');
const { aplicarMigracoes } = require('./db/migracoes');
const MercadoPago = require('./services/mercadoPagoService');

const PORT = Number(process.env.PORT) || 3333;

// Primeira execução: se o banco ainda não tem tabelas, cria e popula automaticamente.
const db = DatabaseConnection.getInstance();
const temTabelas = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='produtos'").get();
if (!temTabelas) {
  seed();
  console.log('Banco criado e populado (primeira execução).');
}
aplicarMigracoes(db);

// 0.0.0.0 = aceita conexões da rede local (celular com Expo Go na mesma Wi-Fi)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Zentor API rodando em http://localhost:${PORT}/api/health`);
  if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
    console.log('Dica: copie .env.example para .env para definir JWT_SECRET e PORT.');
  }
  console.log(MercadoPago.ativo()
    ? `Pagamento: Mercado Pago ${MercadoPago.modoTeste() ? '(modo TESTE)' : '(PRODUÇÃO: cobranças reais)'}`
    : 'Pagamento: simulado (defina MP_ACCESS_TOKEN no .env para usar o Mercado Pago)');
});
