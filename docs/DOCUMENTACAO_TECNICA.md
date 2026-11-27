# ZENTOR — Documentação técnica da implementação

Este documento descreve o sistema **como foi implementado** e serve de base para a documentação final (ABNT).
Os códigos completos vão para os **anexos**; no corpo do texto, só fragmentos curtos (feedback da 1ª entrega).

## 1. Arquitetura

Cliente mobile + API REST + banco relacional, no mesmo modelo do EMarketPlace de referência.

```
 App Expo (React Native)                     API Node.js / Express                 SQLite (node:sqlite)
 ┌──────────────────────────────┐   HTTP   ┌──────────────────────────────────┐   ┌─────────────────────┐
 │ Navegação: abas + pilha      │  JSON +  │ routes/  auth, products, orders, │   │ usuarios, enderecos │
 │ Telas (24) e componentes     │  token   │          account, admin          │   │ produtos, favoritos │
 │ Contextos (Observer): Auth,  │ ───────▶ │ services/ orderService (Facade)  │──▶│ avaliacoes, cupons  │
 │ Cart, Favoritos, Toast,      │  JWT     │   paymentStrategies (Strategy)   │   │ pedidos, itens,     │
 │ Acessibilidade, Menu         │ ◀─────── │   orderStatus (State), frete,    │   │ historico_pedido,   │
 │ config/api.js (fetch)        │          │   cupons                         │   │ codigos_recuperacao │
 └──────────────────────────────┘          │ models/ User, Product, Order,    │   │ view vw_produtos    │
                                           │   Review, Address                │   └─────────────────────┘
                                           │ db/connection (Singleton)        │
                                           └──────────────────────────────────┘
```

| Camada | Tecnologias |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19, React Navigation 7 (bottom-tabs + native-stack), Context API, AsyncStorage, expo-image-picker, expo-speech, expo-clipboard, expo-splash-screen, fonte Bebas Neue |
| API | Node.js 22.13+, Express 5, SQLite embutido do Node (`node:sqlite`), bcryptjs, jsonwebtoken, qrcode, helmet, cors, morgan, dotenv |
| Testes | node:test + supertest (26 testes de API); testes de interface no navegador com Playwright |

Observações: o EMarketPlace usa Expo SDK 54; o ZENTOR usa o 58 porque o Expo Go das lojas só abre o SDK mais recente.
O EMarketPlace usa `better-sqlite3`; no ZENTOR ele foi trocado pelo `node:sqlite`, nativo do Node, porque em instalação
limpa o `better-sqlite3` tentava compilar C++ e falhava em computadores sem as ferramentas de build do Visual Studio.

## 2. Modelo de dados (`backend/src/db/schema.sql`)

| Tabela | Conteúdo | Regras de integridade |
|---|---|---|
| usuarios | nome, sobrenome, CPF, telefone, e-mail, hash da senha, perfil | CPF e e-mail únicos; perfil `cliente`/`admin` |
| enderecos | apelido, CEP, endereço, número, complemento, bairro, cidade, UF, principal | apaga junto com o usuário |
| produtos | código, nome, descrição, categoria, uso, certificação, tamanhos, cor, preço, preço "de", estoque, imagem, galeria, ficha técnica, novidade, ativo | código único; preço > 0; estoque ≥ 0; exclusão lógica |
| favoritos | usuário × produto | chave composta (sem duplicar) |
| avaliacoes | nota 1–5, comentário | uma por cliente e produto; nota entre 1 e 5 |
| cupons | código, tipo (percentual, valor, frete), valor, mínimo | — |
| pedidos | valores (subtotal, frete, cupom, desconto, total), pagamento (forma, parcelas, final do cartão, código Pix/boleto), status, rastreio, endereço, prazo | status com CHECK dos 5 valores |
| itens_pedido | produto, nome, imagem, tamanho, quantidade, preço unitário | preço congelado na compra |
| historico_pedido | status, observação, data | linha do tempo do pedido |
| codigos_recuperacao | código, validade, usado | recuperação de senha (15 min) |
| **vw_produtos** (view) | produtos + média e quantidade de avaliações | média nunca fica desatualizada |

## 3. Telas (24 capturas em `docs/prints/`)

| Figma | Tela implementada | Arquivo |
|---|---|---|
| p. 4 Início | Banner, vantagens, novidades, compre por uso, mais bem avaliados, institucional, rodapé | `HomeScreen.js` |
| p. 5 Catálogo | Busca, chips de uso, painel "Filtrar e ordenar" (categoria, uso, tamanho, ordenação), grade | `CatalogoScreen.js` |
| p. 6 Detalhe | Galeria, de/por, Pix e parcelas, Inmetro, cor, tamanho + guia, frete por CEP, quantidade, comprar agora, estoque, ficha técnica, trocas, avaliações, outras opções | `ProdutoScreen.js` |
| p. 8 Carrinho | Barra de frete grátis, itens, cupom, resumo | `CarrinhoScreen.js` |
| p. 9 Checkout | Etapas, endereços salvos/novo (ViaCEP), cartão validado, Pix, boleto, resumo, **CONFIRMAR PEDIDO** | `CheckoutScreen.js` |
| — | Detalhe do pedido: linha do tempo, rastreio, QR Code Pix, boleto, itens, cancelar | `PedidoScreen.js` |
| — | Meus pedidos, Favoritos, Minha conta, Editar perfil, Alterar senha, Endereços | `MeusPedidos…`, `Favoritos…`, `Conta…`, `EditarPerfil…`, `AlterarSenha…`, `Enderecos…` |
| p. 2 Cadastro | Nome, sobrenome, CPF, telefone + **e-mail e senha** | `CadastroScreen.js` |
| p. 3 Login | E-mail, senha, lembrar de mim, esqueci minha senha, Google (simulado) | `LoginScreen.js`, `RecuperarSenhaScreen.js` |
| p. 10 FAQ | 7 perguntas em acordeão | `FaqScreen.js` |
| p. 11 Sobre | História, valores, trajetória | `SobreScreen.js` |
| p. 12 Admin | Painel de indicadores, produtos (CRUD + imagem), pedidos (ações por status) | `Admin*.js` |
| p. 13–14 Acessibilidade | Painel "Ajuda no cadastro"/"Ajuda na loja", áudio opcional | `AccessibilityPanel.js` |

Navegação: barra de abas inferior (Início, Capacetes, Favoritos, Carrinho com contador, Conta) e telas empilhadas por cima.

## 4. Padrões de projeto aplicados (fonte: refactoring.guru)

### 4.1 Singleton — conexão com o banco (`backend/src/db/connection.js`)
Toda a API precisa do mesmo banco; uma conexão por requisição desperdiça recurso e várias conexões gravando ao mesmo
tempo geram "database is locked". `DatabaseConnection.getInstance()` cria a conexão na primeira chamada e devolve sempre a mesma.

```js
static getInstance() {
  if (!DatabaseConnection.#instancia) DatabaseConnection.#instancia = new DatabaseSync(arquivo);
  return DatabaseConnection.#instancia;
}
```

### 4.2 Observer — contextos do app (`app/src/context/*.js`)
Vários componentes dependem do mesmo estado. Os *Providers* (Auth, Cart, Favoritos, Toast) são os sujeitos; quem usa
`useCart()`/`useFavoritos()` é observador e é redesenhado quando o estado muda: ao adicionar um capacete, o contador da aba
Carrinho muda; ao favoritar, o coração muda no card, no detalhe e na aba Favoritos ao mesmo tempo.

### 4.3 Strategy — formas de pagamento (`backend/src/services/paymentStrategies.js`)
Cada forma tem regras próprias de **cálculo** (cartão parcela, Pix −5%, boleto à vista) e de **processamento** (cartão
validado e aprovado na hora; Pix gera "copia e cola"; boleto gera linha digitável). As classes `CartaoCreditoStrategy`,
`PixStrategy` e `BoletoStrategy` têm a mesma interface `calcular()`/`processar()`; o serviço escolhe em tempo de execução.

### 4.4 Facade — serviço de pedidos (`backend/src/services/orderService.js`)
Fechar um pedido envolve produtos (preço/estoque), cupom, frete, pagamento, gravação de pedido/itens/histórico e ciclo de
vida. A rota chama só `OrderService.criarPedido()` ou `executarAcao()`, que coordenam tudo numa transação.

### 4.5 State — ciclo de vida do pedido (`backend/src/services/orderStatus.js`)
O que se pode fazer com um pedido depende do status. Cada status é uma classe que diz quais ações aceita e para onde leva:

| Status | Ações permitidas |
|---|---|
| Aguardando pagamento | pagar → Pago · cancelar → Cancelado |
| Pago | enviar → Enviado (gera rastreio) · cancelar → Cancelado |
| Enviado | entregar → Entregue |
| Entregue / Cancelado | nenhuma |

Ação inválida devolve HTTP 409 com mensagem clara. O app do admin mostra só os botões das ações permitidas (vindas da API).

## 5. Mudanças em relação ao Figma e à primeira entrega

| Item | Figma / documento | Implementado | Motivo |
|---|---|---|---|
| Cadastro | sem e-mail e senha | e-mail, senha e confirmação | o login exige |
| Layout | formato desktop | coluna única + barra de abas inferior | padrão de app mobile |
| Valores do carrinho | 799,78 + 988,99 ≠ 1.329,80 | calculados pelo sistema | consistência |
| Frete | sem regra | R$ 34,99; grátis a partir de R$ 1.500 | regra definida |
| Checkout | "COMFIRMAR PEDIDO" | "CONFIRMAR PEDIDO" | correção |
| Selos de desconto | percentuais fixos | calculados de preço "de" e "por" | consistência |
| Tamanhos | 56/S, 60/L, 62/XL | 54/XS a 64/XXL, por produto, com guia | escolha correta do tamanho |
| Admin | lista com salvar/alterar/excluir | painel + CRUD completo + gestão de pedidos | operação real da loja |
| Novas funções | — | favoritos, avaliações, cupons, endereços, Pix/boleto, status do pedido, minha conta | fluxos completos de e-commerce |
| Imagens | fotos do Figma | recortadas do PDF das telas (provisórias); Trail X e Urban Jet com "foto em breve" | trocar pelas fotos exportadas |

## 6. Segurança e qualidade

- Senha com hash bcrypt; a API nunca devolve o hash. Sessão com JWT (7 dias).
- Número do cartão **nunca** é gravado: só os 4 últimos dígitos e a bandeira.
- Rotas de admin exigem perfil `admin` (403); cliente só vê os próprios pedidos (404 para pedidos de outros).
- Validação no app e na API (CPF, cartão por Luhn, CEP, e-mail, preços, estoque, tamanhos, cor).
- Preços e totais recalculados no servidor. Transações: se algo falha, nada é gravado.
- Limite de tentativas no login e na recuperação de senha (10/min por IP). `helmet`, `cors`, SQL parametrizado.

## 7. Testes realizados (evidências)

**API — `npm test`: 26 de 26 aprovados**: Singleton; Strategy (Pix, cartão, recusas do cartão, boleto); State; frete; cupons;
simulação; cadastro; login; perfil e troca de senha; recuperação de senha; endereços; favoritos; catálogo (filtros, tamanho,
ordenação, média); avaliações (só comprador); pedidos com cartão, Pix (QR Code), cancelamento com devolução de estoque,
estoque insuficiente; admin (CRUD, bloqueio de cliente, painel e fluxo pago → enviado → entregue).

**Interface (navegador, Playwright, 400 px de largura):** início, catálogo e filtros, produto (aviso de tamanho, guia, adicionar,
favoritar sem login pede login), carrinho com cupom, login voltando ao checkout, checkout com cartão inválido e válido em 3x,
pedido confirmado, Pix com QR Code e confirmação, avaliação publicada, favoritos, conta, meus pedidos, endereços, cadastro
com erros, acessibilidade, recuperação de senha, FAQ, Sobre, painel do admin, gestão de pedidos (enviar gera rastreio) e
cadastro de capacete pela tela (conferido na API).

**Build:** `expo-doctor` 20/20; bundles web e Android gerados sem erro.

**Defeitos encontrados e corrigidos durante os testes:** navegação de telas empilhadas para as abas; botão dentro de botão no
card (HTML inválido); faixas horizontais esticando a tela; mensagens de erro que não sumiam ao corrigir o campo; selo de
desconto impresso nas fotos recortadas do Figma.

**Não testado:** Expo Go em celular físico e iPhone; seletor de imagem da galeria (depende de aparelho).

## 8. Trabalhos futuros

Pagamento real (Mercado Pago), login real com Google (OAuth), e-mail real de recuperação e de status do pedido,
notificações push, rastreio integrado aos Correios e imagens hospedadas em serviço de arquivos.
