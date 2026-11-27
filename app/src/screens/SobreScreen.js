import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Titulo } from '../components/ui';
import { cores, fontes } from '../theme';

const VALORES = [
  { icone: 'shield-checkmark', titulo: 'SEGURANÇA EM PRIMEIRO LUGAR', texto: 'Todo produto passa por rígidos testes de qualidade e certificação Inmetro antes de chegar até você.' },
  { icone: 'flash', titulo: 'ATITUDE E ESTILO', texto: 'Design ousado, gráficos exclusivos e coleções que traduzem a cultura motociclista contemporânea.' },
  { icone: 'people', titulo: 'COMUNIDADE #ZENTORERS', texto: 'Construímos a marca ao lado de quem anda com a gente todos os dias, ouvindo e evoluindo com a comunidade.' },
];

const TRAJETORIA = [
  { ano: '2008', titulo: 'FUNDAÇÃO DA ZENTOR', texto: 'Início da produção de capacetes com foco em segurança acessível.' },
  { ano: '2015', titulo: 'EXPANSÃO NACIONAL', texto: 'Chegada a mais de 300 pontos de venda em todo o Brasil.' },
  { ano: '2020', titulo: 'LANÇAMENTO DO E-COMMERCE', texto: 'Venda direta ao consumidor, com entrega para todo o país.' },
  { ano: '2026', titulo: 'LINHA RAZOR', texto: 'Nova geração de capacetes gráficos, unindo licenciamentos e design autoral.' },
];

/** Sobre nós (Figma p. 11). */
export default function SobreScreen() {
  return (
    <Tela rodape>
      <Titulo tamanho={56} style={{ textAlign: 'center', marginTop: 8 }}>SOBRE NÓS</Titulo>
      <Text style={s.texto}>
        A Zentor nasceu da paixão por motociclismo e do compromisso com a segurança de quem roda todos os dias. Começamos fabricando
        capacetes com foco em proteção real, sem abrir mão de design e atitude.
      </Text>
      <Text style={s.texto}>
        Hoje somos uma das marcas mais reconhecidas do Brasil no segmento, presentes em centenas de lojas físicas e no digital, sempre ao
        lado da comunidade motociclista — os #zentorers.
      </Text>
      <Text style={s.texto}>
        Não seguimos o óbvio: criamos nosso próprio caminho, com produtos que unem tecnologia, estilo urbano e a certificação que você
        precisa para rodar com segurança.
      </Text>

      <Titulo tamanho={34} style={{ marginTop: 24, marginBottom: 12 }}>NOSSOS VALORES</Titulo>
      {VALORES.map((v) => (
        <View key={v.titulo} style={s.valor}>
          <Ionicons name={v.icone} size={22} color={cores.vermelho} />
          <Text style={s.valorTitulo}>{v.titulo}</Text>
          <Text style={s.valorTexto}>{v.texto}</Text>
        </View>
      ))}

      <Titulo tamanho={34} style={{ marginTop: 24, marginBottom: 4 }}>NOSSA TRAJETÓRIA</Titulo>
      <View style={s.linhaTopo} />
      {TRAJETORIA.map((t) => (
        <View key={t.ano} style={s.marco}>
          <Text style={s.ano}>{t.ano}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.marcoTitulo}>{t.titulo}</Text>
            <Text style={s.marcoTexto}>{t.texto}</Text>
          </View>
        </View>
      ))}
    </Tela>
  );
}

const s = StyleSheet.create({
  texto: { color: cores.texto, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14, fontFamily: fontes.corpo },
  valor: { borderWidth: 1, borderColor: '#666', padding: 14, alignItems: 'center', marginBottom: 10, gap: 6 },
  valorTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18 },
  valorTexto: { color: cores.textoSuave, fontSize: 13, textAlign: 'center', fontFamily: fontes.corpo },
  linhaTopo: { height: 1, backgroundColor: '#888', marginBottom: 6 },
  marco: { flexDirection: 'row', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#666' },
  ano: { color: cores.vermelho, fontFamily: fontes.titulo, fontSize: 32, width: 64 },
  marcoTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18 },
  marcoTexto: { color: cores.texto, fontSize: 14, fontFamily: fontes.corpo },
});
