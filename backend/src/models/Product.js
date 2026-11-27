const DatabaseConnection = require('../db/connection');

const CATEGORIAS = ['fechado', 'articulado', 'off-road', 'aberto'];
const USOS = ['urbano', 'esportivo', 'trilha', 'viagem'];
const TAMANHOS = ['54/XS', '56/S', '58/M', '60/L', '62/XL', '64/XXL'];

const CAMPOS = [
  'codigo', 'nome', 'descricao', 'categoria', 'uso', 'certificacao', 'tamanhos', 'cor',
  'preco', 'preco_original', 'estoque', 'imagem', 'galeria', 'ficha_tecnica', 'novidade',
];

const ORDENACAO = {
  relevancia: 'novidade DESC, num_avaliacoes DESC, id',
  menor_preco: 'preco ASC',
  maior_preco: 'preco DESC',
  desconto: 'CASE WHEN preco_original IS NULL THEN 0 ELSE 1 - preco / preco_original END DESC',
  avaliacao: 'avaliacao DESC, num_avaliacoes DESC',
  lancamentos: 'id DESC',
};

/** Converte a linha do banco no formato usado pelo app. */
function formatar(linha) {
  if (!linha) return null;
  const desconto = linha.preco_original && linha.preco_original > linha.preco
    ? Math.round((1 - linha.preco / linha.preco_original) * 100)
    : 0;
  return {
    ...linha,
    tamanhos: linha.tamanhos.split(',').map((t) => t.trim()).filter(Boolean),
    ficha_tecnica: linha.ficha_tecnica ? linha.ficha_tecnica.split('\n') : [],
    galeria: linha.galeria ? linha.galeria.split(',').filter(Boolean) : [],
    novidade: !!linha.novidade,
    ativo: !!linha.ativo,
    avaliacao: Number(linha.avaliacao || 0),
    num_avaliacoes: Number(linha.num_avaliacoes || 0),
    desconto_percentual: desconto,
  };
}

const Product = {
  CATEGORIAS,
  USOS,
  TAMANHOS,
  ORDENACOES: Object.keys(ORDENACAO),

  listar({ categoria, uso, busca, novidade, tamanho, precoMin, precoMax, ordenar, ids } = {}) {
    const db = DatabaseConnection.getInstance();
    const where = ['ativo = 1'];
    const params = [];
    if (categoria) { where.push('categoria = ?'); params.push(categoria); }
    if (uso) { where.push('uso = ?'); params.push(uso); }
    if (busca) { where.push('(nome LIKE ? OR descricao LIKE ?)'); params.push(`%${busca}%`, `%${busca}%`); }
    if (novidade) where.push('novidade = 1');
    if (tamanho) { where.push("(',' || tamanhos || ',') LIKE ?"); params.push(`%,${tamanho},%`); }
    if (Number(precoMin) > 0) { where.push('preco >= ?'); params.push(Number(precoMin)); }
    if (Number(precoMax) > 0) { where.push('preco <= ?'); params.push(Number(precoMax)); }
    if (Array.isArray(ids)) {
      if (!ids.length) return [];
      where.push(`id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    const ordem = ORDENACAO[ordenar] || ORDENACAO.relevancia;
    return db.prepare(`SELECT * FROM vw_produtos WHERE ${where.join(' AND ')} ORDER BY ${ordem}`).all(...params).map(formatar);
  },

  buscarPorId(id, { incluirInativos = false } = {}) {
    const db = DatabaseConnection.getInstance();
    const sql = incluirInativos ? 'SELECT * FROM vw_produtos WHERE id = ?' : 'SELECT * FROM vw_produtos WHERE id = ? AND ativo = 1';
    return formatar(db.prepare(sql).get(id));
  },

  criar(dados) {
    const db = DatabaseConnection.getInstance();
    const registro = normalizar(dados);
    const r = db.prepare(`
      INSERT INTO produtos (${CAMPOS.join(', ')})
      VALUES (${CAMPOS.map((c) => '@' + c).join(', ')})`).run(registro);
    return Product.buscarPorId(Number(r.lastInsertRowid));
  },

  atualizar(id, dados) {
    const db = DatabaseConnection.getInstance();
    const atual = db.prepare('SELECT * FROM produtos WHERE id = ? AND ativo = 1').get(id);
    if (!atual) return null;
    const registro = normalizar({ ...formatar(atual), ...dados });
    db.prepare(`
      UPDATE produtos SET ${CAMPOS.map((c) => `${c} = @${c}`).join(', ')}, atualizado_em = datetime('now')
      WHERE id = @id`).run({ ...registro, id });
    return Product.buscarPorId(id);
  },

  /** Exclusão lógica: pedidos antigos continuam apontando para o produto. */
  excluir(id) {
    const db = DatabaseConnection.getInstance();
    const r = db.prepare("UPDATE produtos SET ativo = 0, atualizado_em = datetime('now') WHERE id = ? AND ativo = 1").run(id);
    return r.changes > 0;
  },
};

function normalizar(d) {
  return {
    codigo: String(d.codigo).trim().toUpperCase(),
    nome: String(d.nome).trim(),
    descricao: d.descricao || '',
    categoria: d.categoria,
    uso: d.uso,
    certificacao: d.certificacao || 'Inmetro',
    tamanhos: Array.isArray(d.tamanhos) ? d.tamanhos.join(',') : (d.tamanhos || '56/S,58/M,60/L,62/XL'),
    cor: d.cor || '#E30613',
    preco: Number(d.preco),
    preco_original: d.preco_original ? Number(d.preco_original) : null,
    estoque: Number.isFinite(Number(d.estoque)) ? Number(d.estoque) : 0,
    imagem: d.imagem || '',
    galeria: Array.isArray(d.galeria) ? d.galeria.join(',') : (d.galeria || ''),
    ficha_tecnica: Array.isArray(d.ficha_tecnica) ? d.ficha_tecnica.join('\n') : (d.ficha_tecnica || ''),
    novidade: d.novidade ? 1 : 0,
  };
}

module.exports = Product;
