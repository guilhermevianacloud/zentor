const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SEGREDO = () => process.env.JWT_SECRET || 'zentor-dev-secret-troque-no-env';

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, perfil: usuario.perfil }, SEGREDO(), { expiresIn: '7d' });
}

function lerUsuario(req) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return { erro: 'Faça login para continuar.' };
  try {
    const payload = jwt.verify(token, SEGREDO());
    const usuario = User.buscarPorId(payload.id);
    return usuario ? { usuario } : { erro: 'Usuário não encontrado.' };
  } catch {
    return { erro: 'Sessão expirada. Entre novamente.' };
  }
}

/** Exige "Authorization: Bearer <token>" válido. */
function autenticar(req, res, next) {
  const { usuario, erro } = lerUsuario(req);
  if (!usuario) return res.status(401).json({ erro });
  req.usuario = usuario;
  return next();
}

/** Se houver token válido, preenche req.usuario; senão segue como visitante. */
function usuarioOpcional(req, res, next) {
  const { usuario } = lerUsuario(req);
  if (usuario) req.usuario = usuario;
  return next();
}

/** Só o perfil admin passa (área do administrador). */
function somenteAdmin(req, res, next) {
  if (req.usuario?.perfil !== 'admin') return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
  return next();
}

module.exports = { gerarToken, autenticar, usuarioOpcional, somenteAdmin };
