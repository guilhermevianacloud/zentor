import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { anelFoco, cores, fontes } from '../theme';
import { urlImagem } from '../config/api';
import { LIMITE_FRETE_GRATIS, moeda } from '../utils/formatos';
import { Estrelas } from './extras';
import { useFavoritos } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';

/**
 * Card de produto: foto em fundo de estúdio, selo de desconto, nome, nota,
 * preço cheio riscado, preço à vista no Pix em destaque e parcelamento
 * (hierarquia de preço usada pelas grandes lojas brasileiras).
 */
export default function ProductCard({ produto, onPress, largura }) {
  const navigation = useNavigation();
  const { ehFavorito, alternar } = useFavoritos();
  const toast = useToast();
  const favorito = ehFavorito(produto.id);
  const [sobre, setSobre] = useState(false);
  const esgotado = produto.estoque <= 0;
  const rotulo = `${produto.nome}. ${produto.desconto_percentual ? `De ${moeda(produto.preco_original)} por ` : ''}${moeda(produto.preco)}, ou ${moeda(produto.preco * 0.95)} no Pix.`
    + `${produto.num_avaliacoes ? ` Nota ${produto.avaliacao} de 5.` : ''} Tamanhos ${produto.tamanhos.join(', ')}.${esgotado ? ' Esgotado.' : ''}`;

  const favoritar = async () => {
    try {
      const novo = await alternar(produto.id);
      if (novo === null) {
        toast.info('Entre na sua conta para salvar favoritos.');
        navigation.navigate('Login');
      } else toast.sucesso(novo ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
    } catch (e) {
      toast.erro(e.message);
    }
  };

  // O coração fica FORA do Pressable do card (botão dentro de botão é HTML inválido no navegador).
  return (
    <View style={[s.card, sobre && s.cardHover, largura && { width: largura }]}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => setSobre(true)}
        onHoverOut={() => setSobre(false)}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        accessibilityHint="Abre os detalhes do capacete"
        style={({ pressed, focused }) => [pressed && { opacity: 0.85 }, focused && anelFoco]}
      >
      <View style={s.fotoArea}>
        <Image source={{ uri: urlImagem(produto.imagem) }} style={[s.foto, esgotado && { opacity: 0.4 }]} resizeMode="cover"
          accessibilityLabel={`Foto do ${produto.nome}`} />
        {produto.desconto_percentual ? (
          <View style={s.selo}><Text style={s.seloTexto}>-{produto.desconto_percentual}%</Text></View>
        ) : null}
        {esgotado ? <View style={s.esgotado}><Text style={s.esgotadoTexto}>ESGOTADO</Text></View> : null}
      </View>
      <View style={s.info}>
        <Text style={s.nome} numberOfLines={2}>{produto.nome.toUpperCase()}</Text>
        <View style={s.nota}>
          {produto.num_avaliacoes ? (
            <>
              <Estrelas nota={produto.avaliacao} tamanho={11} />
              <Text style={s.notaTexto}>({produto.num_avaliacoes})</Text>
            </>
          ) : <Text style={s.notaTexto}>Sem avaliações</Text>}
        </View>
        {/* Linha reservada mesmo sem desconto: mantém os preços alinhados na grade. */}
        <Text style={[s.de, !produto.desconto_percentual && { textDecorationLine: 'none' }]}>{produto.desconto_percentual ? moeda(produto.preco_original) : ' '}</Text>
        <Text style={s.preco}>{moeda(produto.preco)}</Text>
        <Text style={s.pix}><Text style={s.pixValor}>{moeda(produto.preco * 0.95)}</Text> no Pix</Text>
        <Text style={s.parcela}>ou 10x de {moeda(produto.preco / 10)} sem juros</Text>
        {produto.preco >= LIMITE_FRETE_GRATIS ? <Text style={s.freteGratis}>Frete grátis</Text> : null}
      </View>
      </Pressable>
      <Pressable onPress={favoritar} style={s.coracao} hitSlop={8} accessibilityRole="button"
        accessibilityLabel={favorito ? `Remover ${produto.nome} dos favoritos` : `Adicionar ${produto.nome} aos favoritos`}
        accessibilityState={{ selected: favorito }}>
        <Ionicons name={favorito ? 'heart' : 'heart-outline'} size={20} color={favorito ? cores.vermelho : cores.texto} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: cores.fundoCard, marginBottom: 14, borderWidth: 1, borderColor: cores.linha },
  cardHover: { borderColor: '#4A4A4A' },
  fotoArea: { backgroundColor: '#1C1C1C', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  selo: { position: 'absolute', top: 8, left: 8, backgroundColor: cores.vermelho, paddingHorizontal: 6, paddingVertical: 2 },
  seloTexto: { color: cores.texto, fontSize: 12, fontFamily: fontes.corpoNegrito, fontVariant: ['tabular-nums'] },
  coracao: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: 6 },
  esgotado: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 10, paddingVertical: 4 },
  esgotadoTexto: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18, letterSpacing: 1 },
  info: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 },
  nome: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18, lineHeight: 19, minHeight: 38 },
  nota: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, minHeight: 14 },
  notaTexto: { color: cores.textoApagado, fontSize: 11, fontFamily: fontes.corpo },
  de: { color: cores.textoApagado, fontSize: 12, textDecorationLine: 'line-through', marginTop: 8, fontFamily: fontes.corpo, fontVariant: ['tabular-nums'] },
  preco: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 19, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  pix: { color: cores.textoSuave, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  pixValor: { color: cores.sucesso, fontFamily: fontes.corpoNegrito },
  parcela: { color: cores.textoApagado, fontSize: 11, marginTop: 1, fontFamily: fontes.corpo },
  freteGratis: { color: cores.sucesso, fontSize: 11, marginTop: 6, fontFamily: fontes.corpoSemi },
});
