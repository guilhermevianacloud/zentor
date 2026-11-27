import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, Titulo } from '../components/ui';
import { Vazio } from '../components/extras';
import { api, urlImagem } from '../config/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { LIMITE_FRETE_GRATIS, moeda } from '../utils/formatos';

/**
 * Carrinho (Figma p. 8). Os valores são CALCULADOS (no Figma, 799,78 + 988,99
 * não fechava com o subtotal 1.329,80). Frete R$ 34,99, grátis a partir de
 * R$ 1.500,00 em produtos. Aceita cupom de desconto validado pela API.
 */
export default function CarrinhoScreen({ navigation }) {
  const carrinho = useCart();
  const { itens, subtotal, frete, total, faltaFreteGratis, alterarQuantidade, remover, cupom, cupomValido, descontoCupom } = carrinho;
  const { usuario } = useAuth();
  const toast = useToast();
  const [codigo, setCodigo] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const progresso = Math.min(1, subtotal / LIMITE_FRETE_GRATIS);

  const finalizar = () => {
    if (usuario) navigation.navigate('Checkout');
    else {
      toast.info('Entre na sua conta para finalizar a compra.');
      navigation.navigate('Login', { voltarPara: 'Checkout' });
    }
  };

  const aplicar = async () => {
    if (!codigo.trim()) return;
    setAplicando(true);
    try {
      const r = await api('/cupons/validar', { metodo: 'POST', corpo: { codigo, subtotal } });
      carrinho.aplicarCupom(r);
      setCodigo('');
      toast.sucesso(`Cupom ${r.codigo} aplicado: ${r.descricao}.`);
    } catch (e) {
      toast.erro(e.message);
    } finally {
      setAplicando(false);
    }
  };

  const removerItem = (i) => {
    remover(i.chave);
    toast.info(`${i.produto.nome} removido do carrinho.`);
  };

  if (itens.length === 0) {
    return (
      <Tela>
        <Titulo tamanho={44}>CARRINHO</Titulo>
        <Vazio icone="cart-outline" titulo="SEU CARRINHO ESTÁ VAZIO" texto="Escolha seu próximo capacete e ele aparece aqui."
          acao="VER CAPACETES" onAcao={() => navigation.navigate('Abas', { screen: 'Catalogo' })} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Titulo tamanho={44}>CARRINHO</Titulo>
      <Text style={s.frete} accessibilityLiveRegion="polite">
        {frete === 0
          ? <Text style={s.negrito}>Você ganhou frete grátis!</Text>
          : <>Faltam <Text style={s.negrito}>{moeda(faltaFreteGratis)}</Text> para você ganhar frete grátis</>}
      </Text>
      <View style={s.barra} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progresso * 100) }}>
        <View style={[s.barraCheia, { width: `${frete === 0 ? 100 : progresso * 100}%` }]} />
      </View>

      {itens.map((i) => (
        <View key={i.chave} style={s.item}>
          <Pressable onPress={() => navigation.navigate('Produto', { id: i.produto.id })} accessibilityRole="link" accessibilityLabel={`Ver ${i.produto.nome}`}>
            <Image source={{ uri: urlImagem(i.produto.imagem) }} style={s.foto} resizeMode="cover" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.nome}>{i.produto.nome.toUpperCase()}</Text>
            <Text style={s.detalhe}>Tamanho {i.tamanho} · {moeda(i.produto.preco)} cada</Text>
            <View style={s.linha}>
              <View style={s.qtd}>
                <Pressable onPress={() => (i.quantidade === 1 ? removerItem(i) : alterarQuantidade(i.chave, i.quantidade - 1))} style={s.qtdBotao}
                  accessibilityRole="button" accessibilityLabel={`Diminuir quantidade de ${i.produto.nome}`}>
                  <Ionicons name={i.quantidade === 1 ? 'trash-outline' : 'remove'} size={16} color={cores.texto} />
                </Pressable>
                <Text style={s.qtdValor} accessibilityLabel={`Quantidade ${i.quantidade}`}>{i.quantidade}</Text>
                <Pressable onPress={() => alterarQuantidade(i.chave, i.quantidade + 1)} style={s.qtdBotao}
                  accessibilityRole="button" accessibilityLabel={`Aumentar quantidade de ${i.produto.nome}`} disabled={i.quantidade >= i.produto.estoque}>
                  <Ionicons name="add" size={16} color={i.quantidade >= i.produto.estoque ? '#444' : cores.texto} />
                </Pressable>
              </View>
              <Text style={s.precoItem}>{moeda(i.produto.preco * i.quantidade)}</Text>
            </View>
          </View>
          <Pressable onPress={() => removerItem(i)} accessibilityRole="button" accessibilityLabel={`Remover ${i.produto.nome} do carrinho`} hitSlop={8}>
            <Ionicons name="close" size={20} color={cores.textoSuave} />
          </Pressable>
        </View>
      ))}

      {/* Cupom */}
      <View style={s.cupomCaixa}>
        <Text style={s.cupomTitulo}><Ionicons name="pricetag" size={13} color={cores.vermelho} /> Cupom de desconto</Text>
        {cupom ? (
          <View style={s.cupomAplicado}>
            <View style={{ flex: 1 }}>
              <Text style={s.cupomCodigo}>{cupom.codigo}</Text>
              <Text style={[s.detalhe, !cupomValido && { color: cores.erro }]}>
                {cupomValido ? cupom.descricao : `Vale para compras a partir de ${moeda(cupom.minimo)}.`}
              </Text>
            </View>
            <Pressable onPress={carrinho.removerCupom} accessibilityRole="button" accessibilityLabel="Remover cupom" hitSlop={8}>
              <Text style={{ color: cores.vermelhoTexto, fontFamily: fontes.corpoNegrito }}>Remover</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.cupomLinha}>
            <TextInput value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase())} placeholder="Digite o cupom" autoCapitalize="characters"
              placeholderTextColor={cores.textoApagado} style={s.cupomInput} accessibilityLabel="Código do cupom" onSubmitEditing={aplicar} returnKeyType="done" />
            <Botao titulo="APLICAR" variante="contorno" onPress={aplicar} carregando={aplicando} style={{ minHeight: 44 }} tamanhoFonte={18} />
          </View>
        )}
      </View>

      <ResumoPedido subtotal={subtotal} frete={frete} descontoCupom={descontoCupom} cupom={cupomValido ? cupom?.codigo : null} total={total} mostrarPix>
        <Botao titulo="FINALIZAR COMPRA" onPress={finalizar} tamanhoFonte={22} />
        <View style={s.seguro}>
          <Ionicons name="lock-closed" size={12} color={cores.textoApagado} />
          <Text style={s.seguroTexto}>Pagamento em ambiente seguro</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Abas', { screen: 'Catalogo' })} style={{ alignSelf: 'center', padding: 10 }} accessibilityRole="link">
          <Text style={{ color: cores.textoSuave, textDecorationLine: 'underline' }}>Continuar comprando</Text>
        </Pressable>
      </ResumoPedido>
    </Tela>
  );
}

/** Caixa "Resumo do pedido" reaproveitada no carrinho, no checkout e no pedido. */
export function ResumoPedido({ subtotal, frete, descontoCupom = 0, cupom, desconto = 0, total, rotuloQtd = 'Subtotal', rotuloDesconto = 'Desconto Pix (5%)', children, titulo = 'RESUMO DO PEDIDO', mostrarPix = false }) {
  return (
    <View style={s.resumo} accessibilityLabel="Resumo do pedido">
      <Text style={s.resumoTitulo}>{titulo}</Text>
      <Linha rotulo={rotuloQtd} valor={moeda(subtotal)} />
      {descontoCupom > 0 ? <Linha rotulo={`Cupom ${cupom || ''}`} valor={`− ${moeda(descontoCupom)}`} verde /> : null}
      <Linha rotulo="Frete" valor={frete === 0 ? 'Grátis' : moeda(frete)} verde={frete === 0} />
      {desconto > 0 ? <Linha rotulo={rotuloDesconto} valor={`− ${moeda(desconto)}`} verde /> : null}
      <View style={[s.resumoLinha, { marginTop: 14, marginBottom: 12, borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingTop: 10 }]}>
        <Text style={s.resumoTitulo}>TOTAL</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.resumoTexto, { fontFamily: fontes.corpoNegrito, fontSize: 20 }]}>{moeda(total)}</Text>
          {mostrarPix ? <Text style={s.resumoPix}>ou {moeda(total - Math.round(total * 5) / 100)} no Pix</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function Linha({ rotulo, valor, verde }) {
  return (
    <View style={s.resumoLinha}>
      <Text style={[s.resumoTexto, verde && { color: cores.sucesso }]}>{rotulo}</Text>
      <Text style={[s.resumoTexto, verde && { color: cores.sucesso }]}>{valor}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  frete: { color: cores.texto, fontSize: 14, marginTop: 6, fontFamily: fontes.corpo },
  negrito: { fontFamily: fontes.titulo, fontSize: 17 },
  barra: { height: 5, backgroundColor: '#2A2A2A', marginTop: 6, marginBottom: 18, borderRadius: 3 },
  barraCheia: { height: 5, backgroundColor: cores.vermelho, borderRadius: 3 },
  item: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: cores.linha, paddingBottom: 14 },
  foto: { width: 92, height: 92, backgroundColor: '#1C1C1C' },
  nome: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 22, lineHeight: 23 },
  detalhe: { color: cores.textoSuave, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  qtd: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: cores.borda },
  qtdBotao: { paddingHorizontal: 11, paddingVertical: 7 },
  qtdValor: { color: cores.texto, fontSize: 16, minWidth: 24, textAlign: 'center', fontFamily: fontes.corpo },
  precoItem: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 20 },
  cupomCaixa: { borderWidth: 1, borderColor: '#2A2A2A', padding: 12, marginTop: 4 },
  cupomTitulo: { color: cores.texto, fontSize: 15, fontFamily: fontes.corpoSemi, marginBottom: 8 },
  cupomLinha: { flexDirection: 'row', gap: 8 },
  cupomInput: { flex: 1, borderWidth: 1, borderColor: cores.borda, color: cores.texto, paddingHorizontal: 10, height: 44, backgroundColor: cores.fundoInput, letterSpacing: 1 },
  cupomAplicado: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F2A18', padding: 10 },
  cupomCodigo: { color: cores.sucesso, fontFamily: fontes.corpoNegrito, letterSpacing: 1 },
  resumo: { backgroundColor: cores.fundoCard, padding: 18, marginTop: 14 },
  resumoTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 20, marginBottom: 4 },
  resumoLinha: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  resumoTexto: { color: cores.texto, fontSize: 15, fontFamily: fontes.corpo, fontVariant: ['tabular-nums'] },
  resumoPix: { color: cores.sucesso, fontSize: 12, marginTop: 2, fontFamily: fontes.corpoSemi },
  seguro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  seguroTexto: { color: cores.textoApagado, fontSize: 12, fontFamily: fontes.corpo },
});
