import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { cores, fontes } from '../theme';

/** Rodapé do Figma, empilhado em coluna para o celular. */
export default function Footer() {
  const navigation = useNavigation();
  const Link = ({ rotulo, tela }) => (
    <Pressable onPress={() => (tela === 'Catalogo' ? navigation.navigate('Abas', { screen: 'Catalogo' }) : navigation.navigate(tela))} accessibilityRole="link" accessibilityLabel={rotulo}>
      <Text style={s.link}>{rotulo}</Text>
    </Pressable>
  );
  return (
    <View style={s.rodape} accessibilityRole="contentinfo">
      <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" accessibilityLabel="Logotipo Zentor" />
      <Text style={s.pequeno}>Zentor Comércio, Importação e Exportação Ltda.</Text>

      <View style={s.colunas}>
        <View style={s.coluna}>
          <Text style={s.tituloColuna}>INSTITUCIONAL</Text>
          <Link rotulo="Sobre nós" tela="Sobre" />
          <Link rotulo="FAQ" tela="Faq" />
        </View>
        <View style={s.coluna}>
          <Text style={s.tituloColuna}>CAPACETES</Text>
          <Link rotulo="Ver todos os capacetes" tela="Catalogo" />
        </View>
        <View style={s.coluna}>
          <Text style={s.tituloColuna}>CONTATO</Text>
          <Text style={s.pequeno}>SAC (11) 98675-3432</Text>
          <Text style={s.pequeno}>Seg. a Sex., 08h – 18h</Text>
        </View>
        <View style={s.coluna}>
          <Text style={s.tituloColuna}>FORMAS DE PAGAMENTO</Text>
          <View style={s.selos}>
            {['VISA', 'MASTER', 'ELO', 'PIX', 'BOLETO'].map((p) => (
              <Text key={p} style={s.selo}>{p}</Text>
            ))}
          </View>
        </View>
      </View>
      <View style={s.linha} />
      <Text style={s.pequeno}>© 2026 ZENTOR CAPACETES. TODOS OS DIREITOS RESERVADOS.</Text>
      <Text style={[s.pequeno, { marginTop: 4 }]}>Projeto acadêmico — PI IV, Senac ADS. Pagamentos simulados.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  rodape: { backgroundColor: cores.fundo, borderTopWidth: 1, borderTopColor: '#555', padding: 20, marginTop: 32 },
  logo: { width: 130, height: 55, marginBottom: 6 },
  colunas: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  coluna: { width: '50%', marginBottom: 16, paddingRight: 8 },
  tituloColuna: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 16, letterSpacing: 1.5, marginBottom: 6 },
  link: { color: cores.textoSuave, fontSize: 13, paddingVertical: 3, fontFamily: fontes.corpo },
  pequeno: { color: cores.textoSuave, fontSize: 11, letterSpacing: 0.5, fontFamily: fontes.corpo },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  selo: { color: cores.fundo, backgroundColor: cores.texto, fontSize: 9, fontFamily: fontes.corpoNegrito, paddingHorizontal: 5, paddingVertical: 2 },
  linha: { height: 1, backgroundColor: '#555', marginVertical: 12 },
});
