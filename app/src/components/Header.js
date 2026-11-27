import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../theme';
import { useAcessibilidade } from '../context/AccessibilityContext';
import { useMenu } from './MenuPrincipal';
import { FaixaChegada } from './Quadriculado';

/**
 * Cabeçalho do Figma: faixa vermelha + barra preta com o logo.
 * Na navegação por abas, carrinho e conta ficam na barra inferior; aqui
 * ficam voltar, busca, acessibilidade e o menu (FAQ, Sobre, Admin...).
 */
export default function Header({ navigation, route, back }) {
  const insets = useSafeAreaInsets();
  const { abrirPainel } = useAcessibilidade();
  const { abrir: abrirMenu } = useMenu();
  const podeVoltar = back && route.name !== 'Abas';

  return (
    <View style={{ backgroundColor: cores.fundo, paddingTop: insets.top }}>
      <FaixaChegada />
      <View style={s.barra}>
        {podeVoltar ? (
          <Pressable onPress={navigation.goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={s.icone} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={cores.texto} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => navigation.navigate('Abas', { screen: 'Home' })} accessibilityRole="link" accessibilityLabel="Zentor, loja de capacetes. Ir para o início">
          <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.navigate('Abas', { screen: 'Catalogo', params: { focarBusca: Date.now() } })}
          accessibilityRole="button" accessibilityLabel="Buscar capacetes" style={s.icone} hitSlop={6}>
          <Ionicons name="search" size={22} color={cores.texto} />
        </Pressable>
        <Pressable onPress={abrirPainel} accessibilityRole="button" accessibilityLabel="Abrir ajuda de acessibilidade" style={s.icone} hitSlop={6}>
          <Ionicons name="accessibility" size={22} color={cores.texto} />
        </Pressable>
        <Pressable onPress={abrirMenu} accessibilityRole="button" accessibilityLabel="Abrir menu" style={s.icone} hitSlop={6}>
          <Ionicons name="menu" size={26} color={cores.texto} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 56, borderBottomWidth: 1, borderBottomColor: cores.linha },
  logo: { width: 96, height: 40 },
  icone: { padding: 7, marginLeft: 2 },
});
