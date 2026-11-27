import { StyleSheet, View } from 'react-native';
import { cores } from '../theme';

/**
 * Quadriculado de bandeira de chegada — o mesmo motivo do logo Zentor.
 * É o único elemento decorativo "forte" do app: aparece na faixa do topo e
 * sob os títulos de seção. Decorativo, por isso escondido do leitor de tela.
 */
export default function Quadriculado({ colunas = 6, linhas = 2, tamanho = 6, cor = cores.vermelho, fundo = 'transparent', style }) {
  return (
    <View style={[{ flexDirection: 'column' }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: linhas }).map((_, l) => (
        <View key={l} style={s.linha}>
          {Array.from({ length: colunas }).map((__, c) => (
            <View key={c} style={{ width: tamanho, height: tamanho, backgroundColor: (l + c) % 2 === 0 ? cor : fundo }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Faixa do topo: vermelho sólido terminando em quadriculado à direita (como a bandeira do logo). */
export function FaixaChegada() {
  return (
    <View style={s.faixa} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flex: 1, backgroundColor: cores.vermelho }} />
      <Quadriculado colunas={18} linhas={2} tamanho={4} />
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row' },
  faixa: { flexDirection: 'row', height: 8, alignItems: 'stretch', backgroundColor: cores.fundo },
});
