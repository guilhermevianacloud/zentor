/**
 * PADRÃO OBSERVER (via Context API) — carrinho.
 * O CartProvider é o sujeito que guarda os itens. O ícone do carrinho no
 * cabeçalho (contador), a tela Carrinho e o Checkout são observadores:
 * ao adicionar um capacete na tela de detalhe, todos se atualizam sozinhos,
 * sem que uma tela precise avisar a outra.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcularFrete, LIMITE_FRETE_GRATIS } from '../utils/formatos';

const CHAVE = '@zentor:carrinho';
const CHAVE_CUPOM = '@zentor:cupom';
const CartContext = createContext(null);
const chaveItem = (produtoId, tamanho) => `${produtoId}-${tamanho}`;

function reducer(estado, acao) {
  switch (acao.tipo) {
    case 'carregar':
      return acao.itens;
    case 'adicionar': {
      const { produto, tamanho, quantidade } = acao;
      const chave = chaveItem(produto.id, tamanho);
      const existente = estado.find((i) => i.chave === chave);
      if (existente) {
        return estado.map((i) => (i.chave === chave
          ? { ...i, quantidade: Math.min(i.quantidade + quantidade, produto.estoque) }
          : i));
      }
      return [...estado, {
        chave, tamanho, quantidade: Math.min(quantidade, produto.estoque),
        produto: { id: produto.id, nome: produto.nome, preco: produto.preco, imagem: produto.imagem, estoque: produto.estoque },
      }];
    }
    case 'quantidade':
      return estado
        .map((i) => (i.chave === acao.chave ? { ...i, quantidade: Math.min(acao.quantidade, i.produto.estoque) } : i))
        .filter((i) => i.quantidade > 0);
    case 'remover':
      return estado.filter((i) => i.chave !== acao.chave);
    case 'limpar':
      return [];
    default:
      return estado;
  }
}

export function CartProvider({ children }) {
  const [itens, dispatch] = useReducer(reducer, []);
  // Cupom aplicado: { codigo, tipo, descricao, desconto, frete_gratis } validado pela API.
  const [cupom, setCupom] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((s) => s && dispatch({ tipo: 'carregar', itens: JSON.parse(s) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(CHAVE, JSON.stringify(itens)).catch(() => {});
  }, [itens]);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_CUPOM).then((c) => c && setCupom(JSON.parse(c))).catch(() => {});
  }, []);

  useEffect(() => {
    if (cupom) AsyncStorage.setItem(CHAVE_CUPOM, JSON.stringify(cupom)).catch(() => {});
    else AsyncStorage.removeItem(CHAVE_CUPOM).catch(() => {});
  }, [cupom]);

  const valor = useMemo(() => {
    const subtotal = Math.round(itens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0) * 100) / 100;
    // O cupom só vale enquanto o subtotal atingir o mínimo (o servidor confere de novo no pedido).
    const cupomValido = !!cupom && subtotal >= (cupom.minimo || 0);
    const descontoCupom = !cupomValido ? 0
      : cupom.tipo === 'percentual' ? Math.round(subtotal * cupom.valor) / 100
        : cupom.tipo === 'valor' ? Math.min(cupom.valor, subtotal) : 0;
    const frete = cupomValido && cupom.frete_gratis ? 0 : calcularFrete(subtotal);
    return {
      itens,
      cupom,
      cupomValido,
      aplicarCupom: setCupom,
      removerCupom: () => setCupom(null),
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      subtotal,
      descontoCupom,
      frete,
      total: Math.round((subtotal - descontoCupom + frete) * 100) / 100,
      faltaFreteGratis: Math.max(0, Math.round((LIMITE_FRETE_GRATIS - subtotal) * 100) / 100),
      adicionar: (produto, tamanho, quantidade = 1) => dispatch({ tipo: 'adicionar', produto, tamanho, quantidade }),
      alterarQuantidade: (chave, quantidade) => dispatch({ tipo: 'quantidade', chave, quantidade }),
      remover: (chave) => dispatch({ tipo: 'remover', chave }),
      limpar: () => { dispatch({ tipo: 'limpar' }); setCupom(null); },
      // Formato aceito pela API (o preço é recalculado no servidor).
      paraApi: () => itens.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade, tamanho: i.tamanho })),
    };
  }, [itens, cupom]);

  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
