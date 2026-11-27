import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import ProductCard from '../components/ProductCard';
import { Botao, Chip, MensagemErro, Titulo } from '../components/ui';
import { GradeEsqueleto, Vazio } from '../components/extras';
import { api } from '../config/api';
import useLarguraCard from '../hooks/useLarguraCard';
import { useAcessibilidade } from '../context/AccessibilityContext';
import { cores, fontes } from '../theme';
import { ROTULO_CATEGORIA, ROTULO_USO } from '../utils/formatos';

const ORDENACOES = [
  { valor: 'relevancia', rotulo: 'Mais relevantes' },
  { valor: 'menor_preco', rotulo: 'Menor preço' },
  { valor: 'maior_preco', rotulo: 'Maior preço' },
  { valor: 'desconto', rotulo: 'Maior desconto' },
  { valor: 'avaliacao', rotulo: 'Mais bem avaliados' },
  { valor: 'lancamentos', rotulo: 'Lançamentos' },
];
const TAMANHOS = ['54/XS', '56/S', '58/M', '60/L', '62/XL', '64/XXL'];

/** Catálogo "Nossos capacetes" (Figma p. 5) com busca, filtros (categoria, uso, tamanho) e ordenação. */
export default function CatalogoScreen({ navigation, route }) {
  const [produtos, setProdutos] = useState(null);
  const [filtros, setFiltros] = useState({ categoria: null, uso: null, tamanho: null, ordenar: 'relevancia' });
  const [busca, setBusca] = useState('');
  const [painel, setPainel] = useState(false);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const { largura } = useLarguraCard();
  const { anunciar } = useAcessibilidade();
  const buscaRef = useRef();

  // Filtros vindos da tela inicial ("Compre por uso", "Mais bem avaliados") ou foco na busca pelo ícone da lupa.
  useEffect(() => {
    const p = route.params || {};
    if (p.filtroEm) setFiltros((f) => ({ ...f, categoria: p.categoria || null, uso: p.uso || null, ordenar: p.ordenar || f.ordenar }));
    if (p.focarBusca) setTimeout(() => buscaRef.current?.focus(), 300);
  }, [route.params]);

  const carregar = useCallback(async () => {
    setErro('');
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => v && qs.set(k, v));
    if (busca.trim()) qs.set('busca', busca.trim());
    try {
      const lista = await api(`/produtos?${qs.toString()}`);
      setProdutos(lista);
      return lista;
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }, [filtros, busca]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const lista = await carregar();
      if (lista && (filtros.categoria || filtros.uso || filtros.tamanho || busca)) anunciar(`${lista.length} capacetes encontrados.`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar]);

  const muda = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: f[campo] === valor ? null : valor }));
  const qtdFiltros = ['categoria', 'uso', 'tamanho'].filter((k) => filtros[k]).length;
  const limpar = () => { setFiltros({ categoria: null, uso: null, tamanho: null, ordenar: 'relevancia' }); setBusca(''); };

  return (
    <Tela rodape refreshControl={<RefreshControl refreshing={atualizando} tintColor={cores.vermelho}
      onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} />}>
      <Titulo tamanho={48}>NOSSOS{'\n'}CAPACETES:</Titulo>

      <View style={s.busca}>
        <Ionicons name="search" size={18} color={cores.textoApagado} />
        <TextInput ref={buscaRef} value={busca} onChangeText={setBusca} placeholder="Buscar capacete" placeholderTextColor={cores.textoApagado}
          style={s.buscaInput} accessibilityLabel="Buscar capacete pelo nome" returnKeyType="search" />
        {busca ? (
          <Pressable onPress={() => setBusca('')} accessibilityLabel="Limpar busca" hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={cores.textoApagado} />
          </Pressable>
        ) : null}
      </View>

      <Text style={s.rotuloFiltro}>Uso</Text>
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'flex-start' }}>
        <Chip rotulo="Todos" ativo={!filtros.uso} onPress={() => setFiltros((f) => ({ ...f, uso: null }))} />
        {Object.entries(ROTULO_USO).map(([valor, rotulo]) => (
          <Chip key={valor} rotulo={rotulo} ativo={filtros.uso === valor} onPress={() => muda('uso', valor)} />
        ))}
      </ScrollView>

      <View style={s.barra}>
        <Pressable onPress={() => setPainel(true)} style={s.botaoBarra} accessibilityRole="button"
          accessibilityLabel={`Filtros e ordenação${qtdFiltros ? `, ${qtdFiltros} filtros ativos` : ''}`}>
          <Ionicons name="options-outline" size={18} color={cores.texto} />
          <Text style={s.botaoBarraTexto}>Filtrar e ordenar{qtdFiltros ? ` (${qtdFiltros})` : ''}</Text>
        </Pressable>
        <Text style={s.contagem}>{produtos ? `${produtos.length} ${produtos.length === 1 ? 'capacete' : 'capacetes'}` : ''}</Text>
      </View>

      <MensagemErro texto={erro} />
      {erro ? <Botao titulo="TENTAR DE NOVO" variante="escuro" onPress={carregar} tamanhoFonte={20} /> : null}
      {produtos === null && !erro ? <GradeEsqueleto largura={largura} quantidade={6} /> : null}
      {produtos && produtos.length === 0 ? (
        <Vazio icone="search-outline" titulo="NADA ENCONTRADO" texto="Nenhum capacete com esses filtros. Tente outra combinação."
          acao="LIMPAR FILTROS" onAcao={limpar} />
      ) : null}
      <View style={s.grade}>
        {(produtos || []).map((p) => (
          <ProductCard key={p.id} produto={p} largura={largura} onPress={() => navigation.navigate('Produto', { id: p.id })} />
        ))}
      </View>

      <Modal visible={painel} transparent animationType="slide" onRequestClose={() => setPainel(false)}>
        <View style={s.fundo}>
          <View style={s.folha} accessibilityViewIsModal>
            <View style={s.folhaTopo}>
              <Text style={s.folhaTitulo}>FILTRAR E ORDENAR</Text>
              <Pressable onPress={() => setPainel(false)} accessibilityLabel="Fechar" hitSlop={8}>
                <Ionicons name="close" size={26} color={cores.texto} />
              </Pressable>
            </View>
            <ScrollView>
              <Text style={s.rotuloFiltro}>Ordenar por</Text>
              <View style={s.chips}>
                {ORDENACOES.map((o) => (
                  <Chip key={o.valor} rotulo={o.rotulo} ativo={filtros.ordenar === o.valor} onPress={() => setFiltros((f) => ({ ...f, ordenar: o.valor }))} />
                ))}
              </View>
              <Text style={s.rotuloFiltro}>Categoria</Text>
              <View style={s.chips}>
                {Object.entries(ROTULO_CATEGORIA).map(([valor, rotulo]) => (
                  <Chip key={valor} rotulo={rotulo} ativo={filtros.categoria === valor} onPress={() => muda('categoria', valor)} />
                ))}
              </View>
              <Text style={s.rotuloFiltro}>Uso</Text>
              <View style={s.chips}>
                {Object.entries(ROTULO_USO).map(([valor, rotulo]) => (
                  <Chip key={valor} rotulo={rotulo} ativo={filtros.uso === valor} onPress={() => muda('uso', valor)} />
                ))}
              </View>
              <Text style={s.rotuloFiltro}>Tamanho (circunferência da cabeça)</Text>
              <View style={s.chips}>
                {TAMANHOS.map((t) => <Chip key={t} rotulo={t} ativo={filtros.tamanho === t} onPress={() => muda('tamanho', t)} />)}
              </View>
            </ScrollView>
            <View style={s.folhaBotoes}>
              <Botao titulo="LIMPAR" variante="escuro" onPress={limpar} style={{ flex: 1 }} tamanhoFonte={20} />
              <Botao titulo={`VER ${produtos ? produtos.length : ''} RESULTADOS`} onPress={() => setPainel(false)} style={{ flex: 2 }} tamanhoFonte={20} />
            </View>
          </View>
        </View>
      </Modal>
    </Tela>
  );
}

const s = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.fundoInput, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 12, marginTop: 14, height: 48 },
  buscaInput: { flex: 1, color: cores.texto, fontSize: 15, height: '100%', fontFamily: fontes.corpo },
  rotuloFiltro: { color: cores.textoSuave, fontSize: 14, fontFamily: fontes.corpoSemi, marginTop: 14, marginBottom: 8 },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 },
  botaoBarra: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 12, paddingVertical: 9 },
  botaoBarraTexto: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 13 },
  contagem: { color: cores.textoApagado, fontSize: 13, fontFamily: fontes.corpo },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  folha: { backgroundColor: cores.fundoCard, borderTopWidth: 3, borderTopColor: cores.vermelho, padding: 16, maxHeight: '85%', width: '100%', maxWidth: 720, alignSelf: 'center' },
  folhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  folhaTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  folhaBotoes: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
