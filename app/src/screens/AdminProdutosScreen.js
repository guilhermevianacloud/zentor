import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, confirmar, MensagemErro, Titulo } from '../components/ui';
import { Esqueleto } from '../components/extras';
import { api, urlImagem } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { moeda, ROTULO_CATEGORIA, ROTULO_USO } from '../utils/formatos';

/** Tela do administrador (Figma p. 12): consultar, alterar e excluir capacetes; inserir abre o formulário. */
export default function AdminProdutosScreen({ navigation }) {
  const { ehAdmin } = useAuth();
  const toast = useToast();
  const [produtos, setProdutos] = useState(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    api('/produtos?ordenar=lancamentos').then(setProdutos).catch((e) => setErro(e.message));
  }, []);
  useFocusEffect(useCallback(() => { if (ehAdmin) carregar(); }, [ehAdmin, carregar]));

  if (!ehAdmin) return <Tela><MensagemErro texto="Acesso restrito ao administrador." /></Tela>;

  const excluir = async (p) => {
    if (!(await confirmar('Excluir produto', `Excluir "${p.nome}" do catálogo? Pedidos antigos continuam preservados.`))) return;
    try {
      await api(`/produtos/${p.id}`, { metodo: 'DELETE' });
      toast.sucesso(`"${p.nome}" excluído.`);
      carregar();
    } catch (e) {
      toast.erro(e.message);
    }
  };

  const lista = (produtos || []).filter((p) => !busca || `${p.nome} ${p.codigo}`.toLowerCase().includes(busca.toLowerCase()));

  return (
    <Tela>
      <Titulo tamanho={44}>PRODUTOS</Titulo>
      <Text style={s.texto}>{produtos ? `${produtos.length} capacetes ativos` : ''}</Text>
      <View style={s.busca}>
        <Ionicons name="search" size={18} color={cores.textoApagado} />
        <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome ou código" placeholderTextColor={cores.textoApagado}
          style={s.buscaInput} accessibilityLabel="Buscar produto" />
      </View>
      <Botao titulo="+ ADICIONAR CAPACETE" onPress={() => navigation.navigate('AdminProdutoForm')} style={{ marginBottom: 14 }} />
      <MensagemErro texto={erro} />
      {produtos === null ? [1, 2, 3].map((i) => <Esqueleto key={i} altura={100} style={{ marginBottom: 14 }} />) : null}

      {lista.map((p) => (
        <View key={p.id} style={s.card}>
          <Image source={{ uri: urlImagem(p.imagem) }} style={s.foto} resizeMode="contain" accessibilityLabel={`Foto do ${p.nome}`} />
          <View style={{ flex: 1, padding: 10 }}>
            <Text style={s.nome}>{p.nome.toUpperCase()}</Text>
            <Text style={s.codigo}>{p.codigo}</Text>
            <Text style={s.preco}>{moeda(p.preco)}{p.preco_original ? `  (de ${moeda(p.preco_original)})` : ''}</Text>
            <Text style={s.texto}>{ROTULO_CATEGORIA[p.categoria]} · {ROTULO_USO[p.uso]} · {p.tamanhos.join(' ')}</Text>
            <Text style={[s.texto, p.estoque <= 5 && { color: p.estoque === 0 ? cores.erro : '#E8A33D' }]}>
              Estoque: {p.estoque} {p.novidade ? '· Novidade' : ''} · ★ {p.avaliacao.toFixed(1)} ({p.num_avaliacoes})
            </Text>
            <View style={s.botoes}>
              <MiniBotao titulo="ALTERAR" onPress={() => navigation.navigate('AdminProdutoForm', { id: p.id })} rotulo={`Alterar ${p.nome}`} />
              <MiniBotao titulo="VER NA LOJA" escuro onPress={() => navigation.navigate('Produto', { id: p.id })} rotulo={`Ver ${p.nome} na loja`} />
              <MiniBotao titulo="EXCLUIR" escuro onPress={() => excluir(p)} rotulo={`Excluir ${p.nome}`} />
            </View>
          </View>
        </View>
      ))}
    </Tela>
  );
}

function MiniBotao({ titulo, onPress, escuro, rotulo }) {
  return (
    <Pressable onPress={onPress} style={[s.mini, escuro && { backgroundColor: '#2A2A2A' }]} accessibilityRole="button" accessibilityLabel={rotulo || titulo}>
      <Text style={s.miniTexto}>{titulo}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  texto: { color: cores.textoSuave, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.fundoInput, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 12, height: 46, marginVertical: 12 },
  buscaInput: { flex: 1, color: cores.texto, fontSize: 15, height: '100%', fontFamily: fontes.corpo },
  card: { flexDirection: 'row', borderWidth: 1, borderColor: '#333', marginBottom: 14, backgroundColor: cores.fundo },
  foto: { width: 100, backgroundColor: '#1C1C1C' },
  nome: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 19, backgroundColor: '#444', alignSelf: 'flex-start', paddingHorizontal: 6 },
  codigo: { color: cores.textoApagado, fontSize: 11, marginTop: 3, fontFamily: fontes.corpo },
  preco: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18, marginTop: 2 },
  botoes: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  mini: { backgroundColor: cores.vermelho, paddingHorizontal: 10, paddingVertical: 6 },
  miniTexto: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 16 },
});
