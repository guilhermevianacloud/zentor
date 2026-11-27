import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, Campo, Carregando, Chip, MensagemErro, Titulo } from '../components/ui';
import { api, urlImagem } from '../config/api';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { moeda, ROTULO_CATEGORIA, ROTULO_USO } from '../utils/formatos';

const TAMANHOS = ['54/XS', '56/S', '58/M', '60/L', '62/XL', '64/XXL'];
const CORES = ['#E30613', '#1F3FA8', '#18A6A0', '#7B2FBE', '#F28C00', '#2B2B2B', '#FFFFFF', '#1B2A6B'];
const VAZIO = {
  codigo: '', nome: '', descricao: '', categoria: 'fechado', uso: 'urbano', preco: '', preco_original: '', estoque: '10',
  imagem: '', ficha_tecnica: '', novidade: false, tamanhos: ['56/S', '58/M', '60/L', '62/XL'], cor: '#E30613',
};

/** Formulário completo de capacete (inserir e alterar), com imagem da galeria. */
export default function AdminProdutoFormScreen({ route, navigation }) {
  const id = route.params?.id;
  const toast = useToast();
  const [f, setF] = useState(id ? null : VAZIO);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/produtos/${id}`).then((p) => setF({
      codigo: p.codigo, nome: p.nome, descricao: p.descricao, categoria: p.categoria, uso: p.uso,
      preco: String(p.preco), preco_original: p.preco_original ? String(p.preco_original) : '', estoque: String(p.estoque),
      imagem: p.imagem, galeria: p.galeria, ficha_tecnica: p.ficha_tecnica.join('\n'), novidade: p.novidade, tamanhos: p.tamanhos, cor: p.cor,
    })).catch((e) => setErro(e.message));
  }, [id]);

  if (!f) return <Tela>{erro ? <MensagemErro texto={erro} /> : <Carregando />}</Tela>;

  const muda = (campo) => (v) => setF((a) => ({ ...a, [campo]: v }));
  const num = (v) => Number(String(v).replace(',', '.'));
  const preco = num(f.preco);
  const de = num(f.preco_original);
  const desconto = de > preco && preco > 0 ? Math.round((1 - preco / de) * 100) : 0;

  const alternarTamanho = (t) => setF((a) => ({
    ...a, tamanhos: a.tamanhos.includes(t) ? a.tamanhos.filter((x) => x !== t) : TAMANHOS.filter((x) => a.tamanhos.includes(x) || x === t),
  }));

  const escolherImagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) { toast.erro('Permita o acesso às fotos para escolher a imagem.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setF((x) => ({ ...x, imagem: a.base64 ? `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` : a.uri }));
  };

  const salvar = async () => {
    const e = {};
    if (!f.codigo.trim()) e.codigo = 'Informe o código.';
    if (f.nome.trim().length < 3) e.nome = 'Informe o nome.';
    if (!(preco > 0)) e.preco = 'Preço inválido.';
    if (f.preco_original && !(de > preco)) e.preco_original = 'Deve ser maior que o preço POR.';
    if (!f.tamanhos.length) e.tamanhos = 'Escolha ao menos um tamanho.';
    if (!/^\d+$/.test(String(f.estoque))) e.estoque = 'Número inteiro.';
    setErros(e);
    if (Object.keys(e).length) { toast.erro('Verifique os campos destacados.'); return; }
    setSalvando(true); setErro('');
    const corpo = { ...f, preco, preco_original: f.preco_original ? de : null, estoque: parseInt(f.estoque, 10) };
    try {
      if (id) await api(`/produtos/${id}`, { metodo: 'PUT', corpo });
      else await api('/produtos', { metodo: 'POST', corpo });
      toast.sucesso(`"${f.nome}" ${id ? 'alterado' : 'cadastrado'} com sucesso.`);
      navigation.goBack();
    } catch (err) {
      setErro(err.message); setErros(err.campos || {});
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Tela>
      <Titulo tamanho={38}>{id ? 'ALTERAR CAPACETE' : 'NOVO CAPACETE'}</Titulo>

      <View style={s.topo}>
        <Pressable onPress={escolherImagem} style={s.foto} accessibilityRole="button" accessibilityLabel="Escolher imagem do capacete">
          {f.imagem ? <Image source={{ uri: urlImagem(f.imagem) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            : <View style={{ alignItems: 'center' }}><Ionicons name="image-outline" size={32} color={cores.texto} /><Text style={s.fotoTexto}>ADICIONAR{'\n'}IMAGEM</Text></View>}
          <View style={s.fotoEditar}><Ionicons name="camera" size={14} color={cores.texto} /></View>
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.previaNome} numberOfLines={2}>{f.nome || 'Nome do capacete'}</Text>
          <Text style={s.previaPreco}>{preco > 0 ? moeda(preco) : 'R$ 0,00'}</Text>
          {desconto ? <Text style={s.previaDesconto}>-{desconto}% (de {moeda(de)})</Text> : null}
          <Text style={s.ajuda}>Pré-visualização do card</Text>
        </View>
      </View>

      <Campo rotulo="CÓDIGO" rotuloTamanho={18} placeholder="ZX000000-0000" value={f.codigo} onChangeText={(v) => muda('codigo')(v.toUpperCase())} erro={erros.codigo} autoCapitalize="characters" />
      <Campo rotulo="NOME" rotuloTamanho={18} placeholder='Capacete Zentor "..."' value={f.nome} onChangeText={muda('nome')} erro={erros.nome} />
      <Campo rotulo="DESCRIÇÃO" rotuloTamanho={18} placeholder="Ad. Descrição" value={f.descricao} onChangeText={muda('descricao')} multiline
        style={{ marginBottom: 12 }} />
      <View style={s.linha}>
        <Campo style={{ flex: 1 }} rotulo="PREÇO POR (R$)" rotuloTamanho={18} placeholder="799,78" value={f.preco} onChangeText={muda('preco')} erro={erros.preco} keyboardType="decimal-pad" />
        <Campo style={{ flex: 1 }} rotulo="PREÇO DE (OPCIONAL)" rotuloTamanho={18} placeholder="999,90" value={f.preco_original} onChangeText={muda('preco_original')} erro={erros.preco_original} keyboardType="decimal-pad" />
      </View>
      <Campo rotulo="ESTOQUE" rotuloTamanho={18} value={f.estoque} onChangeText={muda('estoque')} erro={erros.estoque} keyboardType="number-pad" />

      <Text style={s.rotulo}>Categoria</Text>
      <View style={s.chips}>{Object.entries(ROTULO_CATEGORIA).map(([v, r]) => <Chip key={v} rotulo={r} ativo={f.categoria === v} onPress={() => muda('categoria')(v)} />)}</View>
      <Text style={s.rotulo}>Uso</Text>
      <View style={s.chips}>{Object.entries(ROTULO_USO).map(([v, r]) => <Chip key={v} rotulo={r} ativo={f.uso === v} onPress={() => muda('uso')(v)} />)}</View>
      <Text style={[s.rotulo, erros.tamanhos && { color: cores.erro }]}>Tamanhos disponíveis{erros.tamanhos ? ` — ${erros.tamanhos}` : ''}</Text>
      <View style={s.chips}>{TAMANHOS.map((t) => <Chip key={t} rotulo={t} ativo={f.tamanhos.includes(t)} onPress={() => alternarTamanho(t)} />)}</View>
      <Text style={s.rotulo}>Cor principal</Text>
      <View style={s.chips}>
        {CORES.map((c) => (
          <Pressable key={c} onPress={() => muda('cor')(c)} style={[s.cor, { backgroundColor: c }, f.cor === c && s.corAtiva]}
            accessibilityRole="radio" accessibilityState={{ checked: f.cor === c }} accessibilityLabel={`Cor ${c}`} />
        ))}
      </View>

      <Campo rotulo="FICHA TÉCNICA" rotuloTamanho={18} placeholder={'Casco: policarbonato\nPeso: 1.400 g'} value={f.ficha_tecnica}
        onChangeText={muda('ficha_tecnica')} multiline style={{ marginTop: 8 }} />
      <Text style={s.ajuda}>Uma característica por linha, no formato "Nome: valor".</Text>

      <View style={s.novidade}>
        <View>
          <Text style={{ color: cores.texto, fontFamily: fontes.corpoNegrito }}>Mostrar em "Novidades"</Text>
          <Text style={s.ajuda}>Aparece na vitrine da tela inicial</Text>
        </View>
        <Switch value={!!f.novidade} onValueChange={muda('novidade')} trackColor={{ true: cores.vermelho }} accessibilityLabel="Mostrar em Novidades" />
      </View>

      <MensagemErro texto={erro} />
      <Botao titulo={id ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR CAPACETE'} onPress={salvar} carregando={salvando} />
      <Botao titulo="CANCELAR" variante="escuro" onPress={navigation.goBack} style={{ marginTop: 10 }} />
    </Tela>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', gap: 14, alignItems: 'center', marginVertical: 16 },
  foto: { width: 130, height: 130, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  fotoTexto: { color: cores.texto, fontSize: 11, fontFamily: fontes.corpoNegrito, textAlign: 'center', marginTop: 4 },
  fotoEditar: { position: 'absolute', bottom: 6, right: 6, backgroundColor: cores.vermelho, borderRadius: 12, padding: 5 },
  previaNome: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 15 },
  previaPreco: { color: cores.texto, fontSize: 22, fontFamily: fontes.corpoNegrito },
  previaDesconto: { color: cores.sucesso, fontSize: 12, fontFamily: fontes.corpo },
  linha: { flexDirection: 'row', gap: 10 },
  rotulo: { color: cores.texto, fontSize: 15, fontFamily: fontes.corpoSemi, marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  cor: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 10, borderWidth: 2, borderColor: '#333' },
  corAtiva: { borderColor: cores.texto, transform: [{ scale: 1.12 }] },
  ajuda: { color: cores.textoApagado, fontSize: 11, fontFamily: fontes.corpo },
  novidade: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16, backgroundColor: cores.fundoCard, padding: 12 },
});
