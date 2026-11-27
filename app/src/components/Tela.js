import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { cores } from '../theme';
import Footer from './Footer';

/**
 * Contêiner padrão das telas: rolagem + largura máxima (fica bom também no
 * navegador) + rodapé opcional. `fundoRadial` imita o fundo vermelho
 * escurecido das telas de cadastro e login do Figma.
 */
export default function Tela({ children, rodape = false, padding = 16, fundoRadial = false, refreshControl }) {
  const conteudo = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <View style={[s.centro, { padding }]}>{children}</View>
        {rodape ? <Footer /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
  if (!fundoRadial) return <View style={s.fundo}>{conteudo}</View>;
  return (
    <View style={s.fundo}>
      <View style={s.halo} pointerEvents="none" />
      <View style={s.halo2} pointerEvents="none" />
      {conteudo}
    </View>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: cores.fundo, overflow: 'hidden' },
  centro: { width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1 },
  halo: { position: 'absolute', width: 700, height: 700, borderRadius: 350, backgroundColor: '#2A0505', top: -80, right: -380, opacity: 0.9 },
  halo2: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: '#4A0000', top: 90, right: -220, opacity: 0.6 },
});
