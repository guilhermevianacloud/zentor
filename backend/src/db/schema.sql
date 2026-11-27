-- =============================================================
-- ZENTOR - Script do banco de dados (SQLite)
-- Tabelas: usuarios, enderecos, produtos, favoritos, avaliacoes,
--          cupons, pedidos, itens_pedido, historico_pedido,
--          codigos_recuperacao
-- Execução: npm run seed  (apaga, recria e popula o banco)
-- =============================================================

PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS vw_produtos;
DROP TABLE IF EXISTS historico_pedido;
DROP TABLE IF EXISTS itens_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS cupons;
DROP TABLE IF EXISTS avaliacoes;
DROP TABLE IF EXISTS favoritos;
DROP TABLE IF EXISTS codigos_recuperacao;
DROP TABLE IF EXISTS enderecos;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS usuarios;

-- Usuários (clientes e administradores)
CREATE TABLE usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT    NOT NULL,
  sobrenome   TEXT    NOT NULL,
  cpf         TEXT    NOT NULL UNIQUE,          -- só dígitos (11)
  telefone    TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,
  senha_hash  TEXT    NOT NULL,                 -- bcrypt, nunca a senha pura
  perfil      TEXT    NOT NULL DEFAULT 'cliente' CHECK (perfil IN ('cliente','admin')),
  criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Endereços salvos do cliente (reaproveitados no checkout)
CREATE TABLE enderecos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  apelido      TEXT    NOT NULL DEFAULT 'Casa',
  cep          TEXT    NOT NULL,
  endereco     TEXT    NOT NULL,
  numero       TEXT    NOT NULL,
  complemento  TEXT    NOT NULL DEFAULT '',
  bairro       TEXT    NOT NULL DEFAULT '',
  cidade       TEXT    NOT NULL,
  estado       TEXT    NOT NULL CHECK (length(estado) = 2),
  principal    INTEGER NOT NULL DEFAULT 0
);

-- Produtos (capacetes)
CREATE TABLE produtos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT    NOT NULL UNIQUE,      -- ex.: ZA021297-2231
  nome            TEXT    NOT NULL,
  descricao       TEXT    NOT NULL DEFAULT '',
  categoria       TEXT    NOT NULL CHECK (categoria IN ('fechado','articulado','off-road','aberto')),
  uso             TEXT    NOT NULL CHECK (uso IN ('urbano','esportivo','trilha','viagem')),
  certificacao    TEXT    NOT NULL DEFAULT 'Inmetro',
  tamanhos        TEXT    NOT NULL DEFAULT '56/S,58/M,60/L,62/XL',  -- lista separada por vírgula
  cor             TEXT    NOT NULL DEFAULT '#E30613',               -- cor principal (hex)
  preco           REAL    NOT NULL CHECK (preco > 0),               -- preço "POR"
  preco_original  REAL,                                             -- preço "DE" (NULL = sem desconto)
  estoque         INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  imagem          TEXT    NOT NULL DEFAULT '',                      -- caminho /img/... ou data URI
  galeria         TEXT    NOT NULL DEFAULT '',                      -- fotos extras, separadas por vírgula
  ficha_tecnica   TEXT    NOT NULL DEFAULT '',                      -- linhas separadas por \n
  novidade        INTEGER NOT NULL DEFAULT 0,                       -- 1 = aparece em "Novidades"
  ativo           INTEGER NOT NULL DEFAULT 1,                       -- exclusão lógica
  criado_em       TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Favoritos (lista de desejos)
CREATE TABLE favoritos (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id  INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  criado_em   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, produto_id)
);

-- Avaliações (só quem comprou o produto pode avaliar; uma por cliente)
CREATE TABLE avaliacoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id  INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nota        INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario  TEXT    NOT NULL DEFAULT '',
  criado_em   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (usuario_id, produto_id)
);

-- Cupons de desconto
CREATE TABLE cupons (
  codigo          TEXT    PRIMARY KEY,
  tipo            TEXT    NOT NULL CHECK (tipo IN ('percentual','valor','frete')),
  valor           REAL    NOT NULL DEFAULT 0,      -- % ou R$ (frete: ignorado)
  minimo          REAL    NOT NULL DEFAULT 0,      -- subtotal mínimo
  descricao       TEXT    NOT NULL DEFAULT '',
  ativo           INTEGER NOT NULL DEFAULT 1
);

-- Pedidos
CREATE TABLE pedidos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id),
  subtotal         REAL    NOT NULL,
  frete            REAL    NOT NULL,
  cupom            TEXT,
  desconto_cupom   REAL    NOT NULL DEFAULT 0,
  desconto         REAL    NOT NULL DEFAULT 0,      -- desconto da forma de pagamento (Pix)
  total            REAL    NOT NULL,
  forma_pagamento  TEXT    NOT NULL CHECK (forma_pagamento IN ('cartao','pix','boleto')),
  parcelas         INTEGER NOT NULL DEFAULT 1,
  valor_parcela    REAL    NOT NULL,
  cartao_final     TEXT,                            -- só os 4 últimos dígitos (nunca o número inteiro)
  cartao_bandeira  TEXT,
  codigo_pagamento TEXT,                            -- Pix copia e cola ou linha digitável (simulados)
  status           TEXT    NOT NULL DEFAULT 'aguardando_pagamento'
                   CHECK (status IN ('aguardando_pagamento','pago','enviado','entregue','cancelado')),
  codigo_rastreio  TEXT,
  cep              TEXT    NOT NULL,
  endereco         TEXT    NOT NULL,
  numero           TEXT    NOT NULL,
  complemento      TEXT    NOT NULL DEFAULT '',
  bairro           TEXT    NOT NULL DEFAULT '',
  cidade           TEXT    NOT NULL,
  estado           TEXT    NOT NULL,
  prazo_dias       INTEGER NOT NULL DEFAULT 7,
  mp_preferencia_id TEXT,                           -- Mercado Pago: preferência criada para o pedido
  mp_checkout_url  TEXT,                            -- Mercado Pago: link de pagamento (init_point)
  mp_pagamento_id  TEXT,                            -- Mercado Pago: id do último pagamento conferido
  mp_status        TEXT,                            -- Mercado Pago: status desse pagamento (approved, pending...)
  criado_em        TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Itens de cada pedido (preço congelado no momento da compra)
CREATE TABLE itens_pedido (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id      INTEGER NOT NULL REFERENCES produtos(id),
  nome_produto    TEXT    NOT NULL,
  imagem          TEXT    NOT NULL DEFAULT '',
  tamanho         TEXT    NOT NULL,
  quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario  REAL    NOT NULL
);

-- Linha do tempo do pedido (cada mudança de status)
CREATE TABLE historico_pedido (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  status      TEXT    NOT NULL,
  observacao  TEXT    NOT NULL DEFAULT '',
  criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Recuperação de senha (simulada: o código é devolvido na resposta em vez de ir por e-mail)
CREATE TABLE codigos_recuperacao (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo      TEXT    NOT NULL,
  expira_em   TEXT    NOT NULL,
  usado       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_uso       ON produtos(uso);
CREATE INDEX idx_pedidos_usuario    ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_status     ON pedidos(status);
CREATE INDEX idx_itens_pedido       ON itens_pedido(pedido_id);
CREATE INDEX idx_avaliacoes_produto ON avaliacoes(produto_id);

-- Média de avaliações calculada a partir da tabela (nunca fica desatualizada)
CREATE VIEW vw_produtos AS
SELECT p.*,
       COALESCE(ROUND(AVG(a.nota), 1), 0) AS avaliacao,
       COUNT(a.id)                        AS num_avaliacoes
FROM produtos p
LEFT JOIN avaliacoes a ON a.produto_id = p.id
GROUP BY p.id;
