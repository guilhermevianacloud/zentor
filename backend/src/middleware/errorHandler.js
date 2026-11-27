/* eslint-disable no-unused-vars */
function naoEncontrado(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Imagem muito grande (máx. 5 MB).' });
  if (String(err.message).includes('UNIQUE constraint failed: produtos.codigo')) {
    return res.status(409).json({ erro: 'Já existe um produto com esse código.' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ erro: status >= 500 ? 'Erro interno no servidor.' : err.message });
}

module.exports = { naoEncontrado, errorHandler };
