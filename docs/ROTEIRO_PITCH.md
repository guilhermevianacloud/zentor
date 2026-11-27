# Roteiro do pitch — ZENTOR (8 a 10 minutos)

Regras: entre 8 e 10 min; **todos falam** (nome + uma parte relevante); sem ler texto pronto (use estes tópicos
só de apoio); tela e código legíveis; áudio testado; celular apoiado ou em tripé.

**Antes de gravar:** `npm run seed` no backend (banco limpo), API e Expo rodando, app aberto no celular (Expo Go) ou no
navegador em modo celular (F12 → Ctrl+Shift+M), zoom do VS Code aumentado. Deixe à mão: cupom `BEMVINDO10` e o cartão
de teste `5555 5555 5555 4444`, validade `12/30`, CVV `123`.

| Tempo | Quem | Conteúdo |
|---|---|---|
| 0:00–1:00 | Integrante 1 | Nome. **Problema:** em marketplaces genéricos é difícil comparar capacetes por uso, tamanho e certificação. Público: urbano, trilha/off-road, presente. |
| 1:00–1:45 | Integrante 1 | **Solução:** ZENTOR, e-commerce só de capacetes. SCRUM (backlog, Planning Poker, Sprint Review). Dizer o que é **simulado** (Google, e-mail, pagamentos). |
| 1:45–4:15 | Integrante 2 | Nome. **Jornada de compra:** início (compre por uso) → catálogo, filtro "Trilha" e ordenação → produto (Inmetro, guia de tamanhos, frete por CEP, avaliações) → favoritar → adicionar → carrinho com cupom BEMVINDO10 → login → checkout com endereço salvo e cartão em 3x → pedido confirmado com linha do tempo. |
| 4:15–5:15 | Integrante 3 | Nome. **Pix e pós-venda:** compra com Pix → QR Code → "Já paguei" → status muda; meus pedidos; avaliar um capacete comprado ("compra verificada"); minha conta e endereços. |
| 5:15–6:15 | Integrante 4 | Nome. **Administrador:** painel (faturamento, status, mais vendidos, estoque baixo) → pedidos: enviar (gera rastreio) e entregar → cadastrar capacete com imagem. |
| 6:15–8:30 | Integrante 5 | Nome. **Arquitetura e código:** Expo + Express + SQLite (`schema.sql`). Os **5 padrões**: Singleton (`connection.js`), Observer (`CartContext.js`), Strategy (`paymentStrategies.js`), Facade (`orderService.js`), State (`orderStatus.js`). Mostrar `npm test` com 26 testes passando. Acessibilidade (painel + leitor de tela). |
| 8:30–9:30 | Integrante 1 | **Resultados:** todas as telas do Figma + favoritos, avaliações, cupons, Pix/boleto e gestão de pedidos; mudanças em relação ao Figma; trabalhos futuros (pagamento real, Google real). Encerramento. |

Ajuste os nomes conforme o grupo; cada pessoa precisa aparecer falando. Cronometre um ensaio: fora de 8–10 min o vídeo não é aceito.
