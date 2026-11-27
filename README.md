# ZENTOR — E-commerce de capacetes (PI IV · Senac ADS)

Aplicativo mobile completo de e-commerce de capacetes: **app React Native/Expo** + **API Node.js/Express** + **banco SQLite**.
Projeto Integrador IV — Desenvolvimento para Dispositivos Móveis — Senac São Paulo, 2026.

```
Zentor/
├── backend/                 API Node.js + Express + SQLite (node:sqlite)
│   ├── src/db/schema.sql    ← SCRIPT DO BANCO (10 tabelas + 1 view)
│   ├── src/db/seed.js       ← cria o banco e insere dados de demonstração
│   ├── src/services/        ← regras: Facade (pedidos), Strategy (pagamento), State (status), frete, cupons
│   ├── src/routes/          ← auth, produtos, pedidos, conta (favoritos/endereços), admin
│   ├── public/img/          ← fotos dos capacetes (servidas em /img)
│   └── tests/api.test.js    ← 26 testes automatizados
├── app/                     App Expo (React Native) — SDK 58
│   ├── App.js               navegação (abas + pilha) e provedores
│   └── src/                 telas, componentes, contextos (Observer), config da API
└── docs/
    ├── DOCUMENTACAO_TECNICA.md          arquitetura, padrões, regras de negócio, testes
    ├── ZENTOR-complemento-documentacao-ABNT.docx
    ├── ROTEIRO_PITCH.md                 roteiro do vídeo (8–10 min)
    └── prints/                          24 capturas das telas funcionando
```

## Funcionalidades

**Cliente**
- Cadastro (com validação de CPF), login, "lembrar de mim", recuperação de senha (simulada) e login com Google (simulado).
- Vitrine inicial: banner, novidades, vantagens, "compre por uso", mais bem avaliados.
- Catálogo com busca, filtros por **uso, categoria e tamanho** e **ordenação** (preço, desconto, avaliação, lançamentos).
- Detalhe do produto: galeria, preço de/por, Pix e parcelamento, certificação Inmetro, **guia de tamanhos**, cálculo de frete por CEP, estoque, ficha técnica, trocas, **avaliações com distribuição de notas** e "outras opções".
- **Favoritos** (lista de desejos).
- Carrinho com quantidades, barra de frete grátis e **cupom de desconto**.
- Checkout em etapas: **endereços salvos** (ou novo, com preenchimento pelo CEP), **cartão validado** (Luhn, validade, CVV, bandeira, até 10x), **Pix com QR Code** e **boleto com linha digitável**.
- Pedido com **linha do tempo** (recebido → pago → enviado → entregue), código de rastreio, pagamento pendente e cancelamento.
- Avaliar produtos comprados ("compra verificada").
- Minha conta: dados pessoais, troca de senha, endereços, pedidos e favoritos.
- Acessibilidade: painel de ajuda (cadastro e loja), áudio opcional por voz, rótulos para leitor de tela, navegação por teclado.

**Administrador**
- Painel com faturamento, pedidos pagos, ticket médio, clientes, pedidos por status, mais vendidos e estoque baixo.
- Produtos: inserir (com imagem da galeria), consultar, alterar e excluir; tamanhos, cor, ficha técnica, novidade.
- Pedidos: filtrar por status e **confirmar pagamento, enviar (gera rastreio), entregar ou cancelar** — só as ações válidas para cada status.

## Pré-requisitos

- **Node.js 22.13 ou superior** (testado no Node 24) — https://nodejs.org.
  O banco usa o SQLite que já vem no Node (`node:sqlite`): **não há nada para compilar**.
- Para testar no celular: app **Expo Go** (Android/iOS), no mesmo Wi-Fi do computador.

## 1. Rodar a API (backend)

```bash
cd backend
npm install
npm run seed      # cria data/zentor.db a partir de src/db/schema.sql e popula os dados
npm run dev       # API em http://localhost:3333  (teste: http://localhost:3333/api/health)
npm test          # 26 testes (banco em memória, não mexe nos seus dados)
```

Opcional: copie `.env.example` para `.env` e troque o `JWT_SECRET`.
Se o banco não existir, `npm run dev` cria e popula sozinho na primeira execução.

## 2. Rodar o app (Expo)

Em outro terminal, com a API rodando:

```bash
cd app
npm install
npx expo start
```

- **Navegador:** tecla `w` (abre em http://localhost:8081). Para ver como celular: F12 → Ctrl+Shift+M.
- **Celular:** escaneie o QR Code com o Expo Go. O app descobre o IP do computador e chama a API em
  `http://<IP-do-PC>:3333`. Se não conectar: (1) mesmo Wi-Fi; (2) libere a porta 3333 no firewall do Windows;
  (3) ou crie `app/.env` com `EXPO_PUBLIC_API_URL=http://SEU_IP:3333` e reinicie o Expo.
- Emulador Android: usa `http://10.0.2.2:3333` automaticamente.

## Dados de demonstração (criados pelo `npm run seed`)

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@zentor.com.br | admin123 |
| Cliente (com endereço, favoritos e 3 pedidos) | cliente@zentor.com.br | cliente123 |
| Clientes fictícios que avaliaram produtos | marcos.demo@ / juliana.demo@ / rafael.demo@ / bianca.demo@zentor.com.br | demo1234 |

| Cupom | Regra |
|---|---|
| `BEMVINDO10` | 10% de desconto |
| `ZENTOR50` | R$ 50,00 de desconto a partir de R$ 500,00 |
| `FRETEGRATIS` | frete grátis a partir de R$ 300,00 |

Cartões de teste (qualquer nome, validade futura, CVV de 3 dígitos): `4111 1111 1111 1111` (Visa), `5555 5555 5555 4444` (Mastercard).
Todos os dados são fictícios.

## O que é simulado (declarar no vídeo e na documentação)

| Recurso | Como funciona no protótipo |
|---|---|
| Entrar com Google | Entra com uma conta de demonstração; não fala com o Google |
| E-mail de recuperação de senha | O código de 6 dígitos aparece na tela em vez de ir por e-mail |
| Cartão de crédito | Número validado (Luhn, validade, CVV) e "aprovado" na hora; nenhuma cobrança; só os 4 últimos dígitos são gravados |
| Pix e boleto | QR Code/linha digitável gerados pelo sistema, sem valor bancário; o botão "Já paguei" simula a confirmação |

> Cartão, Pix e boleto só são simulados **quando o Mercado Pago não está configurado**. Com a credencial no `.env`, o pagamento passa a ser feito pelo Mercado Pago (veja abaixo).

## Pagamento com Mercado Pago (Checkout Pro)

**Como funciona:**
1. O cliente escolhe cartão, Pix ou boleto e toca em **Confirmar e pagar**.
2. A API grava o pedido (*aguardando pagamento*, estoque reservado) e cria uma **preferência** no Mercado Pago com o total já calculado (cupom, frete e −5% do Pix). A preferência mostra só a forma escolhida e permite até 10x no cartão.
3. O app abre a página do Mercado Pago. **O número do cartão é digitado lá: não passa pelo app nem pela API.**
4. Ao voltar, o app confere o pagamento sozinho. Também há o botão **Já paguei, verificar**, e o webhook avisa quando a API tem endereço público.
5. A API **busca o pagamento na API do Mercado Pago** (nunca confia na URL ou no corpo do aviso). Ela confere se o pagamento é deste pedido e se o valor cobre o total. Só então passa o pedido para *pago*, pelo padrão State.
6. Se o Mercado Pago falhar ao criar o link, o pedido é cancelado na hora e o estoque volta.

**Como ligar (modo teste, nada é cobrado):**
1. Crie uma aplicação em <https://www.mercadopago.com.br/developers/panel/app> (produto: Checkout Pro / pagamentos online).
2. Em **Credenciais de teste**, copie o **Access Token**.
3. Em `backend/.env`, coloque `MP_ACCESS_TOKEN=...`. Veja o `.env.example`. **Nunca no app, no Git ou em prints.**
4. Reinicie a API. O terminal deve mostrar `Pagamento: Mercado Pago (modo TESTE)`.
5. Para pagar, use uma **conta compradora de teste** (em *Contas de teste* no painel) e os **cartões de teste** da documentação do Mercado Pago.

**Opcional:**
- `MP_URL_PUBLICA`: endereço https da API, por exemplo um túnel ngrok. Com ele, o Mercado Pago volta sozinho para a loja após a aprovação.
- `MP_WEBHOOK_URL` e `MP_WEBHOOK_SECRET`: aviso automático com assinatura conferida (HMAC SHA-256).

Sem `MP_ACCESS_TOKEN`, tudo volta ao pagamento simulado. Os testes automáticos usam uma API falsa do Mercado Pago e não precisam de internet.

## Regras de negócio

- **Frete:** R$ 34,99; **grátis** quando o subtotal dos produtos for **≥ R$ 1.500,00** (ou com o cupom FRETEGRATIS).
  Prazo: CEP do Sudeste (começa com 0–3) = 3 dias úteis; demais regiões = 7 dias úteis.
- **Ordem do cálculo:** subtotal → desconto do cupom → frete → forma de pagamento (Pix: −5% sobre o resultado).
- **Status do pedido:** cartão nasce *pago*; Pix e boleto nascem *aguardando pagamento*. Fluxo: aguardando → pago → enviado → entregue;
  cancelamento possível antes do envio (devolve o estoque).
- **Avaliação:** só quem comprou (pedido pago, enviado ou entregue); uma por cliente, editável.
- Preços, frete e descontos são **recalculados na API** — o app não define o valor do pedido.
- Login e recuperação de senha: no máximo 10 tentativas por minuto por IP.

## Endpoints da API

| Método | Rota | Acesso |
|---|---|---|
| POST | /api/auth/cadastro · /login · /google · /esqueci-senha · /redefinir-senha | público |
| GET · PUT | /api/auth/me · PUT /api/auth/senha | logado |
| GET | /api/produtos?categoria&uso&tamanho&busca&ordenar&novidade · /api/produtos/:id · /api/produtos/filtros | público |
| GET · POST | /api/produtos/:id/avaliacoes | público · comprador |
| POST · PUT · DELETE | /api/produtos · /api/produtos/:id | admin |
| GET | /api/frete?cep&subtotal | público |
| POST | /api/cupons/validar · /api/pedidos/simular | público |
| POST · GET | /api/pedidos · /api/pedidos/meus · /api/pedidos/:id | logado |
| POST | /api/pedidos/:id/pagar · /api/pedidos/:id/cancelar | dono do pedido (pagar: só no modo simulado) |
| GET | /api/pagamentos/config — o pagamento é pelo Mercado Pago ou simulado? | público |
| POST | /api/pedidos/:id/mercadopago/verificar — consulta o pagamento no Mercado Pago | dono do pedido |
| GET | /api/mercadopago/retorno — página de volta do Mercado Pago | público |
| POST | /api/webhooks/mercadopago — aviso automático (assinatura conferida) | Mercado Pago |
| GET · POST · DELETE | /api/favoritos · /api/favoritos/:produtoId | logado |
| GET · POST · PUT · DELETE | /api/enderecos · /api/enderecos/:id | logado |
| GET | /api/admin/resumo · /api/admin/pedidos?status | admin |
| POST | /api/admin/pedidos/:id/acao `{ acao: pagar \| enviar \| entregar \| cancelar }` | admin |

## Arquivo de entrega

`ZENTOR-entrega-final.zip` contém código-fonte, script do banco, documentação e prints — **sem** `node_modules`,
`.expo`, `dist` e `backend/data` (o banco é recriado pelo `npm run seed`).
