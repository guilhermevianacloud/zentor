/** Limite simples de tentativas por IP, em memória (suficiente para um servidor único). */
module.exports = function limitarTentativas({ maximo = 10, janelaMs = 60_000 } = {}) {
  const registros = new Map();
  return (req, res, next) => {
    if (req.method !== 'POST' || process.env.NODE_ENV === 'test') return next();
    const chave = `${req.ip}:${req.baseUrl}`;
    const agora = Date.now();
    const lista = (registros.get(chave) || []).filter((t) => agora - t < janelaMs);
    if (lista.length >= maximo) {
      const espera = Math.ceil((janelaMs - (agora - lista[0])) / 1000);
      return res.status(429).json({ erro: `Muitas tentativas. Aguarde ${espera} segundos e tente de novo.` });
    }
    lista.push(agora);
    registros.set(chave, lista);
    return next();
  };
};
