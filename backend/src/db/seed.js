/**
 * Cria o banco do zero a partir do schema.sql e insere os dados iniciais:
 * - 1 administrador e 1 cliente de demonstração (com endereço, favoritos e 3 pedidos)
 * - catálogo de capacetes (os 4 do Figma + 2 para demonstrar os filtros)
 * - cupons BEMVINDO10, ZENTOR50 e FRETEGRATIS
 * - 4 clientes fictícios com pedidos entregues e avaliações
 *
 * Uso: npm run seed
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const DatabaseConnection = require('./connection');

const PRODUTOS = [
  {
    codigo: 'ZA021297-2231', nome: 'Capacete Zentor "American"', categoria: 'fechado', uso: 'esportivo',
    cor: '#1F3FA8', preco: 799.78, preco_original: 999.9, estoque: 15, imagem: '/img/american.png', galeria: '/img/american-frente.png,/img/american-tras.png', novidade: 1,
    avaliacao: 5, num_avaliacoes: 128,
    descricao: 'Capacete fechado com viseira dupla, sistema de ventilação frontal e traseira, forro interno removível e lavável. Aprovado pelo Inmetro.',
    ficha_tecnica: 'Casco: policarbonato injetado\nViseira: cristal com tratamento anti-risco + viseira solar interna\nForro: removível e lavável\nFecho: engate rápido micrométrico\nPeso: 1.450 g (±50 g)\nCertificação: Inmetro (NBR 7471)',
  },
  {
    codigo: 'ZC031455-1102', nome: 'Capacete Zentor "Camaleon"', categoria: 'fechado', uso: 'urbano',
    cor: '#18A6A0', preco: 988.99, preco_original: null, estoque: 12, imagem: '/img/camaleon.png', novidade: 1,
    avaliacao: 4.8, num_avaliacoes: 94,
    descricao: 'Capacete fechado com grafismo multicolorido, viseira fumê, entradas de ar reguláveis e forro antialérgico. Ideal para o dia a dia na cidade.',
    ficha_tecnica: 'Casco: ABS de alta resistência\nViseira: fumê, troca sem ferramentas\nForro: antialérgico, removível\nFecho: engate rápido micrométrico\nPeso: 1.390 g (±50 g)\nCertificação: Inmetro (NBR 7471)',
  },
  {
    codigo: 'ZR044210-3307', nome: 'Capacete Zentor "Robocop"', categoria: 'articulado', uso: 'viagem',
    cor: '#1B2A6B', preco: 978.91, preco_original: 1099.9, estoque: 8, imagem: '/img/robocop.png', novidade: 1,
    avaliacao: 4.7, num_avaliacoes: 61,
    descricao: 'Capacete articulado (escamoteável) com queixeira que levanta, viseira solar interna e espaço para intercomunicador. Conforto para viagens longas.',
    ficha_tecnica: 'Casco: policarbonato\nQueixeira: articulada, dupla homologação\nViseira: cristal + solar interna\nForro: 3D removível\nPeso: 1.650 g (±50 g)\nCertificação: Inmetro (NBR 7471)',
  },
  {
    codigo: 'ZN052981-4410', nome: 'Capacete Zentor "Neon"', categoria: 'fechado', uso: 'urbano',
    cor: '#7B2FBE', preco: 659.96, preco_original: 1499.9, estoque: 20, imagem: '/img/neon.png', novidade: 1,
    avaliacao: 4.9, num_avaliacoes: 203,
    descricao: 'Capacete fechado com grafismo neon roxo e verde, alta visibilidade à noite, viseira cristal e ventilação superior.',
    ficha_tecnica: 'Casco: ABS\nViseira: cristal anti-risco\nAcabamento: grafismo neon refletivo\nForro: removível e lavável\nPeso: 1.420 g (±50 g)\nCertificação: Inmetro (NBR 7471)',
  },
  {
    codigo: 'ZT060118-5521', nome: 'Capacete Zentor "Trail X"', categoria: 'off-road', uso: 'trilha',
    cor: '#F28C00', preco: 549.9, preco_original: 629.9, estoque: 10, imagem: '/img/trail-x.png', novidade: 0, tamanhos: '56/S,58/M,60/L,62/XL,64/XXL',
    avaliacao: 4.6, num_avaliacoes: 37,
    descricao: 'Capacete off-road com pala alongada, queixeira ventilada e abertura ampla para uso com óculos de trilha.',
    ficha_tecnica: 'Casco: polímero reforçado com fibra\nPala: ajustável\nUso: com óculos (não acompanha viseira)\nForro: removível, secagem rápida\nPeso: 1.250 g (±50 g)\nCertificação: Inmetro (NBR 7471)',
  },
  {
    codigo: 'ZJ071530-6630', nome: 'Capacete Zentor "Urban Jet"', categoria: 'aberto', uso: 'urbano',
    cor: '#2B2B2B', preco: 329.9, preco_original: null, estoque: 25, imagem: '/img/urban-jet.png', novidade: 0, tamanhos: '54/XS,56/S,58/M,60/L,62/XL',
    avaliacao: 4.4, num_avaliacoes: 52,
    descricao: 'Capacete aberto (jet), leve e ventilado, com viseira longa. Boa opção para trajetos curtos na cidade e para presente.',
    ficha_tecnica: 'Casco: ABS\nViseira: longa, cristal\nForro: removível\nPeso: 980 g (±50 g)\nCertificação: Inmetro (NBR 7471)',
  },
];

function seed() {
  const db = DatabaseConnection.getInstance();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  const insereUsuario = db.prepare(`
    INSERT INTO usuarios (nome, sobrenome, cpf, telefone, email, senha_hash, perfil)
    VALUES (@nome, @sobrenome, @cpf, @telefone, @email, @senha_hash, @perfil)`);

  // Contas de demonstração (dados fictícios; CPFs gerados apenas para teste)
  insereUsuario.run({
    nome: 'Admin', sobrenome: 'Zentor', cpf: '52998224725', telefone: '11999990000',
    email: 'admin@zentor.com.br', senha_hash: bcrypt.hashSync('admin123', 10), perfil: 'admin',
  });
  insereUsuario.run({
    nome: 'Cliente', sobrenome: 'Demonstração', cpf: '11144477735', telefone: '11988887777',
    email: 'cliente@zentor.com.br', senha_hash: bcrypt.hashSync('cliente123', 10), perfil: 'cliente',
  });

  const insereProduto = db.prepare(`
    INSERT INTO produtos (codigo, nome, descricao, categoria, uso, certificacao, tamanhos, cor, preco,
      preco_original, estoque, imagem, galeria, ficha_tecnica, novidade)
    VALUES (@codigo, @nome, @descricao, @categoria, @uso, 'Inmetro', @tamanhos, @cor, @preco,
      @preco_original, @estoque, @imagem, @galeria, @ficha_tecnica, @novidade)`);
  const insereTodos = db.transaction((lista) => lista.forEach((p) => insereProduto.run(p)));
  insereTodos(PRODUTOS.map(({ avaliacao, num_avaliacoes, ...p }) => ({ galeria: '', tamanhos: '56/S,58/M,60/L,62/XL', ...p })));

  // Cupons de demonstração
  const insereCupom = db.prepare('INSERT INTO cupons (codigo, tipo, valor, minimo, descricao) VALUES (?, ?, ?, ?, ?)');
  insereCupom.run('BEMVINDO10', 'percentual', 10, 0, '10% de desconto na primeira compra');
  insereCupom.run('ZENTOR50', 'valor', 50, 500, 'R$ 50,00 de desconto em compras a partir de R$ 500,00');
  insereCupom.run('FRETEGRATIS', 'frete', 0, 300, 'Frete grátis em compras a partir de R$ 300,00');

  criarHistoricoDeDemonstracao();
  return { usuarios: 2 + CLIENTES_FICTICIOS.length, produtos: PRODUTOS.length };
}

/* ---------- Clientes, pedidos e avaliações de demonstração (dados fictícios) ---------- */

const CLIENTES_FICTICIOS = [
  { nome: 'Marcos', sobrenome: 'Silva', email: 'marcos.demo@zentor.com.br' },
  { nome: 'Juliana', sobrenome: 'Rocha', email: 'juliana.demo@zentor.com.br' },
  { nome: 'Rafael', sobrenome: 'Lima', email: 'rafael.demo@zentor.com.br' },
  { nome: 'Bianca', sobrenome: 'Torres', email: 'bianca.demo@zentor.com.br' },
];

const AVALIACOES = [
  // [cliente, produto, nota, comentário]
  [0, 1, 5, 'Acabamento impecável e a viseira dupla ajuda muito no sol da tarde. Veio no tamanho certo seguindo o guia.'],
  [1, 1, 5, 'Lindo demais pessoalmente, as cores são vivas. Ventilação boa no trânsito de SP.'],
  [2, 1, 4, 'Muito bom, só achei um pouco barulhento acima de 100 km/h.'],
  [0, 4, 5, 'O grafismo neon chama atenção à noite, me sinto mais visto no corredor.'],
  [3, 4, 4, 'Leve e confortável. Forro fácil de tirar para lavar.'],
  [1, 3, 5, 'Articulado é outra vida para viagem: abro a queixeira no posto sem tirar o capacete.'],
  [2, 5, 5, 'Usei em trilha pesada, pala firme e ótima ventilação. Recomendo para off-road.'],
  [3, 2, 4, 'Comprei de presente para meu irmão e ele adorou. O guia de tamanhos ajudou bastante.'],
  [3, 6, 4, 'Bom custo-benefício para o dia a dia na cidade.'],
];

const ENDERECO_DEMO = {
  cep: '01310100', endereco: 'Avenida Paulista', numero: '1000', complemento: 'Apto 12', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP',
};
const CARTAO_TESTE = { metodo: 'cartao', parcelas: 1, cartao: { numero: '4111111111111111', nome: 'CLIENTE DEMO', validade: '12/35', cvv: '123' } };

/** Gera um CPF válido (só para dados fictícios de teste). */
function gerarCpf(semente) {
  const base = String(100000000 + semente * 7919).slice(0, 9).split('').map(Number);
  const dv = (nums) => {
    const soma = nums.reduce((s, n, i) => s + n * (nums.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

function criarHistoricoDeDemonstracao() {
  // Carregados aqui para evitar dependência circular na inicialização.
  const OrderService = require('../services/orderService');
  const Review = require('../models/Review');
  const Address = require('../models/Address');
  const db = DatabaseConnection.getInstance();
  const admin = { id: 1, perfil: 'admin' };
  const senha = bcrypt.hashSync('demo1234', 10);

  const idsClientes = CLIENTES_FICTICIOS.map((c, i) => Number(db.prepare(`
    INSERT INTO usuarios (nome, sobrenome, cpf, telefone, email, senha_hash) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(c.nome, c.sobrenome, gerarCpf(i + 3), `1197000000${i}`, c.email, senha).lastInsertRowid));

  // Cada avaliação nasce de uma compra entregue (a regra do sistema exige ter comprado).
  for (const [cliente, produto, nota, comentario] of AVALIACOES) {
    const usuarioId = idsClientes[cliente];
    const pedido = OrderService.criarPedido(usuarioId, {
      itens: [{ produto_id: produto, quantidade: 1, tamanho: '58/M' }], endereco: ENDERECO_DEMO, pagamento: CARTAO_TESTE,
    });
    OrderService.executarAcao(pedido.id, 'enviar', { usuario: admin });
    OrderService.executarAcao(pedido.id, 'entregar', { usuario: admin });
    Review.salvar(usuarioId, produto, nota, comentario);
  }

  // Cliente de demonstração (id 2): endereço salvo, favoritos e pedidos em status diferentes.
  const cliente = { id: 2, perfil: 'cliente' };
  Address.criar(cliente.id, { apelido: 'Casa', ...ENDERECO_DEMO });
  db.prepare('INSERT INTO favoritos (usuario_id, produto_id) VALUES (2, 3), (2, 5)').run();
  const entregue = OrderService.criarPedido(cliente.id, {
    itens: [{ produto_id: 1, quantidade: 1, tamanho: '60/L' }], endereco: ENDERECO_DEMO, pagamento: CARTAO_TESTE,
  });
  OrderService.executarAcao(entregue.id, 'enviar', { usuario: admin });
  OrderService.executarAcao(entregue.id, 'entregar', { usuario: admin });
  const enviado = OrderService.criarPedido(cliente.id, {
    itens: [{ produto_id: 4, quantidade: 1, tamanho: '58/M' }], endereco: ENDERECO_DEMO, pagamento: { ...CARTAO_TESTE, parcelas: 3 },
  });
  OrderService.executarAcao(enviado.id, 'enviar', { usuario: admin });
  OrderService.criarPedido(cliente.id, {
    itens: [{ produto_id: 2, quantidade: 1, tamanho: '56/S' }], endereco: ENDERECO_DEMO, pagamento: { metodo: 'pix' },
  });
}

if (require.main === module) {
  const r = seed();
  console.log(`Banco criado: ${r.usuarios} usuários, ${r.produtos} produtos, cupons e pedidos de demonstração.`);
  console.log('Admin:   admin@zentor.com.br / admin123');
  console.log('Cliente: cliente@zentor.com.br / cliente123');
  console.log('Cupons:  BEMVINDO10, ZENTOR50, FRETEGRATIS');
  DatabaseConnection.close();
}

module.exports = { seed };
