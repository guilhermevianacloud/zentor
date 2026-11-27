import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import ProductCard from '../components/ProductCard';
import { Botao, MensagemErro } from '../components/ui';
import { GradeEsqueleto, TituloSecao } from '../components/extras';
import { api } from '../config/api';
import useLarguraCard from '../hooks/useLarguraCard';
import { BannerImagem, CarrosselBanners, FaixaCupons } from '../components/Banners';
import { cores, fontes } from '../theme';

const USOS = [
  { uso: 'urbano', rotulo: 'URBANO', icone: 'business', texto: 'Dia a dia na cidade' },
  { uso: 'trilha', rotulo: 'TRILHA', icone: 'trail-sign', texto: 'Off-road e terra' },
  { uso: 'viagem', rotulo: 'VIAGEM', icone: 'map', texto: 'Conforto na estrada' },
  { uso: 'esportivo', rotulo: 'ESPORTIVO', icone: 'speedometer', texto: 'Desempenho' },
];

const VANTAGENS = [
  { icone: 'car-sport-outline', titulo: 'Frete grátis', texto: 'acima de R$ 1.500' },
  { icone: 'card-outline', titulo: '10x sem juros', texto: 'no cartão' },
  { icone: 'flash-outline', titulo: '5% off', texto: 'no Pix' },
  { icone: 'shield-checkmark-outline', titulo: 'Inmetro', texto: 'todos certificados' },
];

/** Tela inicial (Figma p. 4): banner, vitrines, atalhos por uso, institucional e rodapé. */
export default function HomeScreen({ navigation }) {
  const [novidades, setNovidades] = useState(null);
  const [avaliados, setAvaliados] = useState([]);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const { largura } = useLarguraCard();

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [n, a] = await Promise.all([api('/produtos?novidade=1'), api('/produtos?ordenar=avaliacao')]);
      setNovidades(n);
      setAvaliados(a.filter((p) => p.num_avaliacoes > 0).slice(0, 6));
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const atualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const abrir = (p) => navigation.navigate('Produto', { id: p.id });
  const catalogo = (params) => navigation.navigate('Abas', { screen: 'Catalogo', params: params && { ...params, filtroEm: Date.now() } });
  const american = (novidades || []).find((p) => /american/i.test(p.nome));

  // Ordem do carrossel: identidade da marca → oferta (gatilho de preço) → cupom de boas-vindas.
  const slides = [
    { id: 'marca', fonte: require('../../assets/banner.png'), onPress: () => catalogo(),
      rotulo: 'Sua moto ainda mais completa. Confira nossa seleção de capacetes.' },
    { id: 'ofertas', fonte: require('../../assets/banners/ofertas.png'), onPress: () => catalogo({ ordenar: 'desconto' }),
      rotulo: 'Ofertas de até 56% off em modelos selecionados. Ver ofertas.' },
    { id: 'boas-vindas', fonte: require('../../assets/banners/boas-vindas.png'), onPress: () => catalogo(),
      rotulo: 'Bem-vindo à Zentor: 10% off com o cupom BEMVINDO10 no carrinho.' },
  ];

  return (
    <Tela padding={0} rodape refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.vermelho} />}>
      <CarrosselBanners slides={slides} />

      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={s.vantagens}>
        {VANTAGENS.map((v) => (
          <View key={v.titulo} style={s.vantagem} accessibilityLabel={`${v.titulo} ${v.texto}`}>
            <Ionicons name={v.icone} size={22} color={cores.vermelho} />
            <View>
              <Text style={s.vantagemTitulo}>{v.titulo}</Text>
              <Text style={s.vantagemTexto}>{v.texto}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.secao}>
        <TituloSecao acao="Ver todos" onAcao={() => navigation.navigate('Abas', { screen: 'Catalogo' })}>NOVIDADES</TituloSecao>
        <MensagemErro texto={erro} />
        {erro ? <Botao titulo="TENTAR DE NOVO" variante="escuro" onPress={carregar} tamanhoFonte={20} /> : null}
        {novidades === null && !erro ? <GradeEsqueleto largura={largura} /> : null}
        <View style={s.grade}>
          {(novidades || []).map((p) => <ProductCard key={p.id} produto={p} largura={largura} onPress={() => abrir(p)} />)}
        </View>
      </View>

      {/* Banner de meio de página: quebra a sequência de grades e destaca o lançamento. */}
      <View style={s.bannerMeio}>
        <BannerImagem fonte={require('../../assets/banners/lancamento-american.png')}
          rotulo="Lançamento: capacete Zentor American, viseira dupla, certificado Inmetro. Conhecer."
          onPress={() => (american ? abrir(american) : catalogo({ ordenar: 'lancamentos' }))} />
      </View>

      <View style={s.secao}>
        <TituloSecao>COMPRE POR USO</TituloSecao>
        <View style={s.usos}>
          {USOS.map((u) => (
            <Pressable key={u.uso} onPress={() => navigation.navigate('Abas', { screen: 'Catalogo', params: { uso: u.uso, filtroEm: Date.now() } })}
              style={({ pressed }) => [s.uso, pressed && { borderColor: cores.vermelho }]} accessibilityRole="button"
              accessibilityLabel={`Capacetes para uso ${u.rotulo.toLowerCase()}: ${u.texto}`}>
              <Ionicons name={u.icone} size={26} color={cores.vermelho} />
              <Text style={s.usoTitulo}>{u.rotulo}</Text>
              <Text style={s.usoTexto}>{u.texto}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[s.secao, { paddingHorizontal: 0 }]}>
        <View style={{ paddingHorizontal: 16 }}><TituloSecao>CUPONS DE DESCONTO</TituloSecao></View>
        <FaixaCupons />
      </View>

      {avaliados.length ? (
        <View style={s.secao}>
          <TituloSecao acao="Ver mais" onAcao={() => navigation.navigate('Abas', { screen: 'Catalogo', params: { ordenar: 'avaliacao', filtroEm: Date.now() } })}>MAIS BEM AVALIADOS</TituloSecao>
          <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false}>
            {avaliados.map((p) => (
              <View key={p.id} style={{ width: 170, marginRight: 12 }}>
                <ProductCard produto={p} onPress={() => abrir(p)} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={s.institucional}>
        <Image source={require('../../assets/motociclista.png')} style={s.foto} resizeMode="cover"
          accessibilityLabel="Motociclista de capacete preto ao lado de uma moto esportiva escura, em uma estrada arborizada" />
        <Text style={s.manifesto}>
          ACREDITAMOS QUE CADA JORNADA MERECE SER VIVIDA COM SEGURANÇA, CONFORTO E LIBERDADE. POR ISSO, OFERECEMOS CAPACETES QUE
          UNEM TECNOLOGIA, QUALIDADE E ESTILO, GARANTINDO A PROTEÇÃO QUE VOCÊ PRECISA PARA APROVEITAR CADA QUILÔMETRO COM CONFIANÇA.
        </Text>
      </View>
      <Pressable onPress={() => navigation.navigate('Sobre')} style={s.conheca} accessibilityRole="link">
        <Text style={s.conhecaTexto}>Conheça a nossa história</Text>
        <Ionicons name="arrow-forward" size={16} color={cores.vermelho} />
      </Pressable>
    </Tela>
  );
}

const s = StyleSheet.create({
  bannerMeio: { paddingHorizontal: 16, paddingTop: 22 },
  vantagens: { paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: cores.linha },
  vantagem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.fundoCard, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2 },
  vantagemTitulo: { color: cores.texto, fontSize: 13, fontFamily: fontes.corpoNegrito },
  vantagemTexto: { color: cores.textoApagado, fontSize: 11, fontFamily: fontes.corpo },
  secao: { paddingHorizontal: 16, paddingTop: 22 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  usos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  uso: { width: '48%', backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.linha, padding: 14, marginBottom: 12, gap: 4 },
  usoTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 22 },
  usoTexto: { color: cores.textoApagado, fontSize: 12, fontFamily: fontes.corpo },
  institucional: { backgroundColor: cores.fundoCard2, marginHorizontal: 16, marginTop: 22, padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' },
  foto: { width: 100, height: 124 },
  manifesto: { flex: 1, color: cores.texto, fontSize: 11, lineHeight: 16, letterSpacing: 1, fontFamily: fontes.corpoSemi },
  conheca: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 14, padding: 6 },
  conhecaTexto: { color: cores.vermelhoTexto, fontFamily: fontes.corpoNegrito },
});
