const express = require('express');
const crypto = require('crypto');
const DatabaseConnection = require('../db/connection');
const User = require('../models/User');
const { gerarToken, autenticar } = require('../middleware/auth');
const { cpfValido, emailValido, soDigitos } = require('../utils/validacao');

const router = express.Router();

// POST /api/auth/cadastro
router.post('/cadastro', (req, res) => {
  const { nome, sobrenome, cpf, telefone, email, senha } = req.body || {};
  const erros = {};
  if (!String(nome || '').trim()) erros.nome = 'Informe o nome.';
  if (!String(sobrenome || '').trim()) erros.sobrenome = 'Informe o sobrenome.';
  if (!cpfValido(cpf)) erros.cpf = 'CPF inválido.';
  const tel = soDigitos(telefone);
  if (tel.length < 10 || tel.length > 11) erros.telefone = 'Telefone com DDD, ex.: (11) 99999-9999.';
  if (!emailValido(email)) erros.email = 'E-mail inválido.';
  if (String(senha || '').length < 6) erros.senha = 'A senha precisa ter ao menos 6 caracteres.';
  if (!erros.email && User.buscarPorEmail(email)) erros.email = 'Este e-mail já está cadastrado.';
  if (!erros.cpf && User.existeCpf(soDigitos(cpf))) erros.cpf = 'Este CPF já está cadastrado.';
  if (Object.keys(erros).length) return res.status(400).json({ erro: 'Verifique os campos destacados.', campos: erros });

  const usuario = User.criar({ nome, sobrenome, cpf: soDigitos(cpf), telefone: tel, email, senha });
  return res.status(201).json({ usuario, token: gerarToken(usuario) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, senha } = req.body || {};
  const registro = email ? User.buscarPorEmail(email) : null;
  if (!registro || !User.verificarSenha(registro, senha || '')) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }
  const usuario = User.publico(registro);
  return res.json({ usuario, token: gerarToken(usuario) });
});

// POST /api/auth/google  — SIMULADO: não fala com o Google; entra com uma conta de demonstração.
router.post('/google', (req, res) => {
  let registro = User.buscarPorEmail('google.demo@zentor.com.br');
  if (!registro) {
    User.criar({
      nome: 'Cliente', sobrenome: 'Google (simulado)', cpf: '39053344705', telefone: '11977776666',
      email: 'google.demo@zentor.com.br', senha: crypto.randomBytes(16).toString('hex'),
    });
    registro = User.buscarPorEmail('google.demo@zentor.com.br');
  }
  const usuario = User.publico(registro);
  return res.json({ usuario, token: gerarToken(usuario), simulado: true });
});

// POST /api/auth/esqueci-senha — SIMULADO: o código volta na resposta em vez de ir por e-mail.
router.post('/esqueci-senha', (req, res) => {
  const { email } = req.body || {};
  if (!emailValido(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  const registro = User.buscarPorEmail(email);
  const resposta = { mensagem: 'Se o e-mail estiver cadastrado, enviamos um código de recuperação.', simulado: true };
  if (registro) {
    const codigo = String(crypto.randomInt(100000, 1000000));
    DatabaseConnection.getInstance()
      .prepare("INSERT INTO codigos_recuperacao (usuario_id, codigo, expira_em) VALUES (?, ?, datetime('now', '+15 minutes'))")
      .run(registro.id, codigo);
    resposta.codigo_simulado = codigo;
  }
  return res.json(resposta);
});

// POST /api/auth/redefinir-senha
router.post('/redefinir-senha', (req, res) => {
  const { email, codigo, novaSenha } = req.body || {};
  if (String(novaSenha || '').length < 6) return res.status(400).json({ erro: 'A nova senha precisa ter ao menos 6 caracteres.' });
  const registro = email ? User.buscarPorEmail(email) : null;
  const db = DatabaseConnection.getInstance();
  const linha = registro && db.prepare(`
    SELECT id FROM codigos_recuperacao
    WHERE usuario_id = ? AND codigo = ? AND usado = 0 AND expira_em > datetime('now')
    ORDER BY id DESC`).get(registro.id, String(codigo || ''));
  if (!linha) return res.status(400).json({ erro: 'Código inválido ou expirado.' });
  db.prepare('UPDATE codigos_recuperacao SET usado = 1 WHERE id = ?').run(linha.id);
  User.trocarSenha(registro.id, novaSenha);
  return res.json({ mensagem: 'Senha alterada. Entre com a nova senha.' });
});

// GET /api/auth/me
router.get('/me', autenticar, (req, res) => res.json({ usuario: req.usuario }));

// PUT /api/auth/me — editar perfil (CPF e e-mail não mudam: identificam a conta)
router.put('/me', autenticar, (req, res) => {
  const { nome, sobrenome, telefone } = req.body || {};
  const erros = {};
  if (!String(nome || '').trim()) erros.nome = 'Informe o nome.';
  if (!String(sobrenome || '').trim()) erros.sobrenome = 'Informe o sobrenome.';
  const tel = soDigitos(telefone);
  if (tel.length < 10 || tel.length > 11) erros.telefone = 'Telefone com DDD, ex.: (11) 99999-9999.';
  if (Object.keys(erros).length) return res.status(400).json({ erro: 'Verifique os campos destacados.', campos: erros });
  return res.json({ usuario: User.atualizar(req.usuario.id, { nome, sobrenome, telefone: tel }) });
});

// PUT /api/auth/senha — trocar senha (exige a senha atual)
router.put('/senha', autenticar, (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  const registro = User.buscarComSenha(req.usuario.id);
  if (!User.verificarSenha(registro, senhaAtual || '')) {
    return res.status(400).json({ erro: 'Senha atual incorreta.', campos: { senhaAtual: 'Senha atual incorreta.' } });
  }
  if (String(novaSenha || '').length < 6) {
    return res.status(400).json({ erro: 'A nova senha precisa ter ao menos 6 caracteres.', campos: { novaSenha: 'Mínimo de 6 caracteres.' } });
  }
  User.trocarSenha(req.usuario.id, novaSenha);
  return res.json({ mensagem: 'Senha alterada com sucesso.' });
});

module.exports = router;
