import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import ProductCard from '../components/ProductCard';
import { Botao, MensagemErro, Titulo } from '../components/ui';
import { Esqueleto, Estrelas, TituloSecao } from '../components/extras';
import { api, urlImagem } from '../config/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFavoritos } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { useAcessibilidade } from '../context/AccessibilityContext';
import { cores, fontes } from '../theme';
import { dataCurta, mascaraCep, moeda, ROTULO_CATEGORIA, ROTULO_USO, soDigitos } from '../utils/formatos';

const GUIA = [
  ['54/XS', '53 – 54 cm'], ['56/S', '55 – 56 cm'], ['58/M', '57 – 58 cm'],
  ['60/L', '59 – 60 cm'], ['62/XL', '61 – 62 cm'], ['64/XXL', '63 – 64 cm'],
];

/** Detalhe do produto (Figma p. 6) + favoritos, guia de tamanhos e avaliações. */
export default function ProdutoScreen({ route, navigation }) {
  const { id } = route.params;
  const { adicionar, itens } = useCart();
  const { usuario } = useAuth();
  const { ehFavorito, alternar } = useFavoritos();
  const toast = useToast();
  const { anunciar } = useAcessibilidade();
  const [produto, setProduto] = useState(null);
  const [outros, setOutros] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState(null);
  const [erro, setErro] = useState('');
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [tamanho, setTamanho] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [cep, setCep] = useState('');
  const [frete, setFrete] = useState(null);
  const [erroFrete, setErroFrete] = useState('');
  const [aberto, setAberto] = useState({ ficha: true, trocas: false });
  const [guia, setGuia] = useState(false);
  const [avisoTamanho, setAvisoTamanho] = useState(false);
  const [minhaNota, setMinhaNota] = useState(0);
  const [meuComentario, setMeuComentario] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const carregarAvaliacoes = useCallback(async () => {
    const r = await api(`/produtos/${id}/avaliacoes`);
    setAvaliacoes(r);
    if (r.minha) { setMinhaNota(r.minha.nota); setMeuComentario(r.minha.comentario); }
  }, [id]);

  useEffect(() => {
    let ativo = true;
    setProduto(null); setFotoAtiva(0); setQuantidade(1); setTamanho(null); setFrete(null); setErro('');
    (async () => {
      try {
        const p = await api(`/produtos/${id}`);
        if (!ativo) return;
        setProduto(p);
        if (p.tamanhos.length === 1) setTamanho(p.tamanhos[0]);
        const parecidos = await api(`/produtos?uso=${p.uso}`);
        const todos = parecidos.length > 3 ? parecidos : await api('/produtos?ordenar=avaliacao');
        if (ativo) setOutros(todos.filter((o) => o.id !== p.id).slice(0, 4));
        await carregarAvaliacoes();
      } catch (e) {
        if (ativo) setErro(e.message);
      }
    })();
    return () => { ativo = false; };
  }, [id, usuario, carregarAvaliacoes]);

  if (erro) return <Tela><MensagemErro texto={erro} /><Botao titulo="VOLTAR" variante="escuro" onPress={navigation.goBack} /></Tela>;
  if (!produto) {
    return (
      <Tela>
        <Esqueleto altura={320} />
        <Esqueleto altura={30} style={{ marginTop: 16, width: '70%' }} />
        <Esqueleto altura={40} style={{ marginTop: 12, width: '40%' }} />
        <Esqueleto altura={120} style={{ marginTop: 16 }} />
      </Tela>
    );
  }

  const fotos = [produto.imagem, ...produto.galeria].filter(Boolean);
  const noCarrinho = itens.filter((i) => i.produto.id === produto.id).reduce((s, i) => s + i.quantidade, 0);
  const disponivel = Math.max(0, produto.estoque - noCarrinho);
  const esgotado = produto.estoque <= 0;
  const favorito = ehFavorito(produto.id);

  const calcularFrete = async () => {
    setErroFrete(''); setFrete(null);
    try {
      const r = await api(`/frete?cep=${soDigitos(cep)}&subtotal=${produto.preco * quantidade}`);
      setFrete(r);
      anunciar(r.valor === 0 ? `Frete grátis, entrega em ${r.prazo_dias_uteis} dias úteis.` : `Frete ${moeda(r.valor)}, entrega em ${r.prazo_dias_uteis} dias úteis.`);
    } catch (e) {
      setErroFrete(e.message);
    }
  };

  const adicionarAoCarrinho = (irParaCarrinho) => {
    if (!tamanho) {
      setAvisoTamanho(true);
      toast.erro('Escolha o tamanho antes de adicionar.');
      return;
    }
    if (quantidade > disponivel) {
      toast.erro(disponivel ? `Só há mais ${disponivel} unidade(s) disponível(is).` : 'Você já tem todo o estoque no carrinho.');
      return;
    }
    adicionar(produto, tamanho, quantidade);
    toast.sucesso(`${produto.nome} (${tamanho}) adicionado ao carrinho.`);
    if (irParaCarrinho) navigation.navigate('Abas', { screen: 'Carrinho' });
  };

  const favoritar = async () => {
    try {
      const novo = await alternar(produto.id);
      if (novo === null) { toast.info('Entre na sua conta para salvar favoritos.'); navigation.navigate('Login'); return; }
      toast.sucesso(novo ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
    } catch (e) {
      toast.erro(e.message);
    }
  };

  const enviarAvaliacao = async () => {
    if (!minhaNota) { toast.erro('Escolha de 1 a 5 estrelas.'); return; }
    setEnviandoAvaliacao(true);
    try {
      const r = await api(`/produtos/${id}/avaliacoes`, { metodo: 'POST', corpo: { nota: minhaNota, comentario: meuComentario } });
      toast.sucesso(r.mensagem);
      setProduto(r.produto);
      await carregarAvaliacoes();
    } catch (e) {
      toast.erro(e.message);
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const total = avaliacoes ? Object.values(avaliacoes.distribuicao).reduce((a, b) => a + b, 0) : 0;

  return (
    <Tela>
      <View style={s.trilha} accessibilityRole="navigation" accessibilityLabel="Você está em">
        <Pressable onPress={() => navigation.navigate('Abas', { screen: 'Home' })} accessibilityRole="link"><Text style={s.trilhaLink}>Início</Text></Pressable>
        <Ionicons name="chevron-forward" size={11} color={cores.textoApagado} />
        <Pressable onPress={() => navigation.navigate('Abas', { screen: 'Catalogo' })} accessibilityRole="link"><Text style={s.trilhaLink}>Capacetes</Text></Pressable>
        <Ionicons name="chevron-forward" size={11} color={cores.textoApagado} />
        <Text style={s.trilhaAtual} numberOfLines={1}>{ROTULO_CATEGORIA[produto.categoria]}</Text>
      </View>

      {/* Galeria */}
      <View style={s.fotoPrincipal}>
        <Image source={{ uri: urlImagem(fotos[fotoAtiva]) }} style={{ width: '100%', height: '100%' }} resizeMode="cover"
          accessibilityLabel={`Foto ${fotoAtiva + 1} de ${fotos.length} do ${produto.nome}`} />
        <Pressable onPress={favoritar} style={s.coracao} accessibilityRole="button" accessibilityState={{ selected: favorito }}
          accessibilityLabel={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
          <Ionicons name={favorito ? 'heart' : 'heart-outline'} size={24} color={favorito ? cores.vermelho : cores.texto} />
        </Pressable>
      </View>
      {fotos.length > 1 ? (
        <ScrollView horizontal style={{ flexGrow: 0, marginTop: 8 }}>
          {fotos.map((f, i) => (
            <Pressable key={f} onPress={() => setFotoAtiva(i)} accessibilityRole="button" accessibilityLabel={`Ver foto ${i + 1}`}
              accessibilityState={{ selected: i === fotoAtiva }} style={[s.miniatura, i === fotoAtiva && { borderColor: cores.vermelho }]}>
              <Image source={{ uri: urlImagem(f) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Titulo tamanho={38} style={{ marginTop: 16 }}>{produto.nome.toUpperCase()}</Titulo>
      <Text style={s.codigo}>Cód: {produto.codigo}</Text>
      <Pressable style={s.avaliacao} onPress={() => {}} accessibilityLabel={`Avaliação ${produto.avaliacao} de 5, ${produto.num_avaliacoes} avaliações`}>
        <Estrelas nota={produto.avaliacao} />
        <Text style={s.codigo}>  {produto.num_avaliacoes ? `${produto.avaliacao.toFixed(1)} · ${produto.num_avaliacoes} avaliações` : 'Ainda sem avaliações'}</Text>
      </Pressable>

      <View style={s.precos} accessibilityLabel={`${produto.desconto_percentual ? `De ${moeda(produto.preco_original)} por ` : ''}${moeda(produto.preco)}`}>
        {produto.desconto_percentual ? <Text style={[s.de, { textDecorationLine: 'none' }]}>De <Text style={s.de}>{moeda(produto.preco_original)}</Text></Text> : null}
        <View style={s.precoLinha}>
          <Text style={s.por}>{moeda(produto.preco)}</Text>
          {produto.desconto_percentual ? <Text style={s.economia}>-{produto.desconto_percentual}%</Text> : null}
        </View>
      </View>
      <View style={s.pixCaixa}>
        <Ionicons name="flash" size={16} color={cores.sucesso} />
        <Text style={s.pixTexto}>
          <Text style={s.pixValor}>{moeda(produto.preco * 0.95)}</Text> no Pix
          <Text style={s.pixSuave}>  ·  economize {moeda(produto.preco * 0.05)}</Text>
        </Text>
      </View>
      <Text style={s.info}>ou 10x de {moeda(produto.preco / 10)} sem juros no cartão</Text>

      <View style={s.tags}>
        <Text style={s.tag}><Ionicons name="shield-checkmark" size={12} color={cores.sucesso} /> {produto.certificacao}</Text>
        <Text style={s.tag}>{ROTULO_CATEGORIA[produto.categoria]}</Text>
        <Text style={s.tag}>Uso {ROTULO_USO[produto.uso].toLowerCase()}</Text>
      </View>

      <Text style={s.rotulo}>COR:</Text>
      <View style={[s.cor, { backgroundColor: produto.cor }]} accessibilityLabel="Cor principal do capacete" />

      <View style={s.linhaTamanho}>
        <Text style={[s.rotulo, avisoTamanho && !tamanho && { color: cores.erro }]}>
          TAMANHO:{tamanho ? ` ${tamanho}` : avisoTamanho ? ' escolha um tamanho' : ''}
        </Text>
        <Pressable onPress={() => setGuia(true)} accessibilityRole="button" accessibilityLabel="Abrir guia de tamanhos" style={s.guiaLink}>
          <Ionicons name="resize-outline" size={14} color={cores.vermelho} />
          <Text style={s.guiaLinkTexto}>Guia de tamanhos</Text>
        </Pressable>
      </View>
      <View style={s.linha}>
        {produto.tamanhos.map((t) => (
          <Pressable key={t} onPress={() => { setTamanho(t); setAvisoTamanho(false); }} accessibilityRole="radio" accessibilityState={{ checked: tamanho === t }}
            accessibilityLabel={`Tamanho ${t}`} style={[s.tamanho, tamanho === t && s.tamanhoAtivo, avisoTamanho && !tamanho && { borderColor: cores.erro }]}>
            <Text style={s.tamanhoTexto}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {/* Frete */}
      <View style={s.freteCaixa}>
        <Text style={s.freteTitulo}><Ionicons name="location" size={12} color={cores.vermelho} /> Calcular frete e prazo de entrega</Text>
        <View style={s.linha}>
          <TextInput value={cep} onChangeText={(v) => setCep(mascaraCep(v))} onSubmitEditing={calcularFrete} placeholder="00000-000"
            keyboardType="number-pad" placeholderTextColor={cores.textoApagado} accessibilityLabel="CEP para calcular o frete" style={s.cepInput} maxLength={9} />
          <Botao titulo="OK" onPress={calcularFrete} variante="contorno" style={{ minHeight: 44, paddingHorizontal: 16 }} tamanhoFonte={20} rotuloAcessivel="Calcular frete" />
        </View>
        {erroFrete ? <Text style={s.erroFrete} accessibilityRole="alert">{erroFrete}</Text> : null}
        {frete ? (
          <Text style={s.freteResultado} accessibilityLiveRegion="polite">
            {frete.valor === 0 ? 'Frete GRÁTIS' : `Frete: ${moeda(frete.valor)}`} · entrega em até {frete.prazo_dias_uteis} dias úteis
            {frete.valor > 0 ? `\nFrete grátis em compras a partir de ${moeda(frete.limite_frete_gratis)}` : ''}
          </Text>
        ) : null}
      </View>

      {/* Quantidade + comprar */}
      <View style={[s.linha, { marginTop: 14, alignItems: 'stretch', flexWrap: 'nowrap' }]}>
        <View style={s.qtd}>
          <Pressable onPress={() => setQuantidade(Math.max(1, quantidade - 1))} accessibilityRole="button" accessibilityLabel="Diminuir quantidade" style={s.qtdBotao}>
            <Text style={s.qtdSinal}>−</Text>
          </Pressable>
          <Text style={s.qtdValor} accessibilityLabel={`Quantidade ${quantidade}`}>{quantidade}</Text>
          <Pressable onPress={() => setQuantidade(Math.min(Math.max(1, disponivel), quantidade + 1))} accessibilityRole="button" accessibilityLabel="Aumentar quantidade" style={s.qtdBotao}>
            <Text style={s.qtdSinal}>+</Text>
          </Pressable>
        </View>
        <Botao titulo={esgotado ? 'ESGOTADO' : 'ADICIONAR AO CARRINHO'} onPress={() => adicionarAoCarrinho(false)} desabilitado={esgotado}
          style={{ flex: 1, marginLeft: 10 }} tamanhoFonte={22} />
      </View>
      {!esgotado ? <Botao titulo="COMPRAR AGORA" variante="contorno" onPress={() => adicionarAoCarrinho(true)} style={{ marginTop: 10 }} tamanhoFonte={22} /> : null}
      <Text style={[s.estoque, produto.estoque > 0 && produto.estoque <= 5 && { color: '#E8A33D' }]}>
        {esgotado ? 'Sem estoque no momento.' : produto.estoque <= 5 ? `Últimas ${produto.estoque} unidades!` : `${produto.estoque} unidades em estoque`}
        {noCarrinho ? ` · ${noCarrinho} no seu carrinho` : ''}
      </Text>

      <View style={s.garantias}>
        {[
          ['lock-closed-outline', 'Compra segura', 'Dados protegidos'],
          ['swap-horizontal-outline', 'Primeira troca grátis', 'Até 7 dias'],
          ['shield-checkmark-outline', 'Certificado', produto.certificacao],
        ].map(([icone, titulo, texto]) => (
          <View key={titulo} style={s.garantia} accessible accessibilityLabel={`${titulo}: ${texto}`}>
            <Ionicons name={icone} size={20} color={cores.textoSuave} />
            <Text style={s.garantiaTitulo}>{titulo}</Text>
            <Text style={s.garantiaTexto}>{texto}</Text>
          </View>
        ))}
      </View>
      <Text style={s.vendido}>Vendido e entregue por <Text style={{ fontFamily: fontes.corpoNegrito, color: cores.texto }}>Zentor</Text></Text>

      <Text style={[s.rotulo, { marginTop: 18 }]}>DESCRIÇÃO:</Text>
      <Text style={s.descricao}>{produto.descricao}</Text>

      <Sanfona titulo="FICHA TÉCNICA" aberto={aberto.ficha} onToggle={() => setAberto({ ...aberto, ficha: !aberto.ficha })}>
        {produto.ficha_tecnica.map((l) => {
          const [k, ...v] = l.split(':');
          return (
            <View key={l} style={s.ficha}>
              <Text style={s.fichaChave}>{v.length ? k : '•'}</Text>
              <Text style={s.fichaValor}>{v.length ? v.join(':').trim() : l}</Text>
            </View>
          );
        })}
      </Sanfona>
      <Sanfona titulo="TROCAS E DEVOLUÇÕES" aberto={aberto.trocas} onToggle={() => setAberto({ ...aberto, trocas: !aberto.trocas })}>
        <Text style={s.descricao}>
          Você tem até 7 dias corridos após o recebimento para desistir da compra (Código de Defesa do Consumidor, art. 49).
          Para troca de tamanho, o capacete deve estar sem uso, com etiquetas e na embalagem original. A primeira troca é gratuita.
        </Text>
      </Sanfona>

      {/* Avaliações */}
      <View style={{ marginTop: 26 }}>
        <TituloSecao>AVALIAÇÕES</TituloSecao>
        {avaliacoes && total > 0 ? (
          <View style={s.resumoNotas}>
            <View style={{ alignItems: 'center', width: 90 }}>
              <Text style={s.mediaGrande}>{produto.avaliacao.toFixed(1)}</Text>
              <Estrelas nota={produto.avaliacao} tamanho={13} />
              <Text style={s.codigo}>{total} avaliações</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <View key={n} style={s.barraLinha} accessibilityLabel={`${n} estrelas: ${avaliacoes.distribuicao[n]}`}>
                  <Text style={s.barraRotulo}>{n}★</Text>
                  <View style={s.barraFundo}><View style={[s.barraCheia, { width: `${(avaliacoes.distribuicao[n] / total) * 100}%` }]} /></View>
                  <Text style={s.barraRotulo}>{avaliacoes.distribuicao[n]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : <Text style={s.descricao}>Este capacete ainda não tem avaliações.</Text>}

        {avaliacoes?.pode_avaliar ? (
          <View style={s.minhaAvaliacao}>
            <Text style={s.rotulo}>{avaliacoes.minha ? 'SUA AVALIAÇÃO (VOCÊ PODE EDITAR)' : 'VOCÊ COMPROU ESTE CAPACETE. AVALIE:'}</Text>
            <Estrelas nota={minhaNota} tamanho={30} onChange={setMinhaNota} rotulo={`Sua nota: ${minhaNota} de 5`} />
            <TextInput value={meuComentario} onChangeText={setMeuComentario} placeholder="Conte como foi sua experiência (opcional)"
              placeholderTextColor={cores.textoApagado} multiline maxLength={500} style={s.comentario} accessibilityLabel="Comentário da avaliação" />
            <Botao titulo="PUBLICAR AVALIAÇÃO" onPress={enviarAvaliacao} carregando={enviandoAvaliacao} tamanhoFonte={20} />
          </View>
        ) : !usuario ? (
          <Text style={[s.descricao, { marginTop: 8 }]}>Comprou este capacete? Entre na sua conta para avaliar.</Text>
        ) : null}

        {(avaliacoes?.avaliacoes || []).map((a) => (
          <View key={a.id} style={s.avaliacaoItem}>
            <View style={s.avaliacaoTopo}>
              <Text style={s.autor}>{a.autor}{a.usuario_id === usuario?.id ? ' (você)' : ''}</Text>
              <Text style={s.codigo}>{dataCurta(a.criado_em)}</Text>
            </View>
            <Estrelas nota={a.nota} tamanho={13} />
            {a.comentario ? <Text style={[s.descricao, { marginTop: 4 }]}>{a.comentario}</Text> : null}
            <Text style={s.verificada}><Ionicons name="checkmark-circle" size={11} color={cores.sucesso} /> Compra verificada</Text>
          </View>
        ))}
      </View>

      {outros.length ? (
        <>
          <View style={s.separador} />
          <Titulo tamanho={34} style={{ textAlign: 'center', marginBottom: 12 }}>OUTRAS OPÇÕES:</Titulo>
          <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false}>
            {outros.map((p) => (
              <View key={p.id} style={{ width: 160, marginRight: 12 }}>
                <ProductCard produto={p} onPress={() => navigation.push('Produto', { id: p.id })} />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Modal visible={guia} transparent animationType="fade" onRequestClose={() => setGuia(false)}>
        <View style={s.modalFundo}>
          <View style={s.modal} accessibilityViewIsModal>
            <View style={s.modalTopo}>
              <Text style={s.modalTitulo}>GUIA DE TAMANHOS</Text>
              <Pressable onPress={() => setGuia(false)} accessibilityLabel="Fechar guia" hitSlop={8}>
                <Ionicons name="close" size={26} color={cores.texto} />
              </Pressable>
            </View>
            <Text style={s.descricao}>
              Passe uma fita métrica ao redor da cabeça, cerca de 2 cm acima das sobrancelhas e das orelhas. Use a medida em
              centímetros na tabela. Entre dois tamanhos, prefira o maior. O capacete deve ficar firme, sem apertar nem girar.
            </Text>
            <View style={s.tabela}>
              <View style={[s.tabelaLinha, { backgroundColor: '#222' }]}>
                <Text style={[s.tabelaCel, { fontFamily: fontes.corpoNegrito }]}>Tamanho</Text>
                <Text style={[s.tabelaCel, { fontFamily: fontes.corpoNegrito }]}>Circunferência</Text>
              </View>
              {GUIA.map(([t, cm]) => (
                <View key={t} style={[s.tabelaLinha, produto.tamanhos.includes(t) ? null : { opacity: 0.4 }]}>
                  <Text style={s.tabelaCel}>{t}</Text>
                  <Text style={s.tabelaCel}>{cm}{produto.tamanhos.includes(t) ? '' : ' (indisponível)'}</Text>
                </View>
              ))}
            </View>
            <Botao titulo="ENTENDI" onPress={() => setGuia(false)} tamanhoFonte={20} />
          </View>
        </View>
      </Modal>
    </Tela>
  );
}

function Sanfona({ titulo, aberto, onToggle, children }) {
  return (
    <View style={s.sanfona}>
      <Pressable onPress={onToggle} style={s.sanfonaCabeca} accessibilityRole="button" accessibilityState={{ expanded: aberto }} accessibilityLabel={titulo}>
        <Text style={s.sanfonaTitulo}>{titulo}</Text>
        <Ionicons name={aberto ? 'remove' : 'add'} size={18} color={cores.texto} />
      </Pressable>
      {aberto ? <View style={{ paddingBottom: 12 }}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  trilha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  trilhaLink: { color: cores.textoSuave, fontSize: 12, fontFamily: fontes.corpo, textDecorationLine: 'underline' },
  trilhaAtual: { color: cores.textoApagado, fontSize: 12, fontFamily: fontes.corpo, flexShrink: 1 },
  fotoPrincipal: { backgroundColor: '#1C1C1C', aspectRatio: 1, width: '100%', overflow: 'hidden' },
  selo: { position: 'absolute', top: 10, left: 10, backgroundColor: cores.vermelho, paddingHorizontal: 8, paddingVertical: 3 },
  seloTexto: { color: cores.texto, fontFamily: fontes.corpoNegrito },
  coracao: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 22, padding: 8 },
  miniatura: { width: 64, height: 64, backgroundColor: '#1C1C1C', marginRight: 8, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  codigo: { color: cores.textoSuave, fontSize: 11, marginTop: 4, fontFamily: fontes.corpo },
  avaliacao: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  precos: { marginTop: 14 },
  de: { color: cores.textoApagado, fontSize: 14, textDecorationLine: 'line-through', fontFamily: fontes.corpo, fontVariant: ['tabular-nums'] },
  precoLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  por: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 32, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  economia: { color: cores.texto, backgroundColor: cores.vermelho, fontFamily: fontes.corpoNegrito, fontSize: 13, paddingHorizontal: 6, paddingVertical: 2 },
  pixCaixa: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0E2318', borderLeftWidth: 3, borderLeftColor: cores.sucesso, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  pixTexto: { color: cores.texto, fontSize: 14, fontFamily: fontes.corpo, flexShrink: 1 },
  pixValor: { color: cores.sucesso, fontFamily: fontes.corpoNegrito, fontSize: 17, fontVariant: ['tabular-nums'] },
  pixSuave: { color: cores.textoSuave, fontSize: 12 },
  info: { color: cores.textoSuave, fontSize: 13, marginTop: 8, fontFamily: fontes.corpo },
  garantias: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cores.linha, paddingVertical: 12 },
  garantia: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  garantiaTitulo: { color: cores.texto, fontSize: 12, fontFamily: fontes.corpoSemi, textAlign: 'center' },
  garantiaTexto: { color: cores.textoApagado, fontSize: 11, fontFamily: fontes.corpo, textAlign: 'center' },
  vendido: { color: cores.textoSuave, fontSize: 12, marginTop: 10, fontFamily: fontes.corpo },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { color: cores.texto, backgroundColor: cores.fundoCard2, fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, fontFamily: fontes.corpo },
  rotulo: { color: cores.texto, fontSize: 11, marginTop: 14, marginBottom: 6, letterSpacing: 1, fontFamily: fontes.corpoNegrito },
  cor: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: cores.texto },
  linhaTamanho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  guiaLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 6 },
  guiaLinkTexto: { color: cores.vermelhoTexto, fontSize: 12, fontFamily: fontes.corpoNegrito },
  linha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tamanho: { borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 14, paddingVertical: 9, minWidth: 64, alignItems: 'center' },
  tamanhoAtivo: { borderColor: cores.vermelho, backgroundColor: '#2A0A0A' },
  tamanhoTexto: { color: cores.texto, fontFamily: fontes.corpoNegrito },
  freteCaixa: { borderWidth: 1, borderColor: '#444', padding: 10, marginTop: 16 },
  freteTitulo: { color: cores.texto, fontSize: 11, marginBottom: 6, fontFamily: fontes.corpo },
  cepInput: { flex: 1, borderWidth: 1, borderColor: '#777', color: cores.texto, paddingHorizontal: 10, height: 44, fontSize: 15, fontFamily: fontes.corpo },
  erroFrete: { color: cores.erro, fontSize: 12, marginTop: 6, fontFamily: fontes.corpo },
  freteResultado: { color: cores.sucesso, fontSize: 13, marginTop: 8, fontFamily: fontes.corpo },
  qtd: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#777' },
  qtdBotao: { paddingHorizontal: 12, paddingVertical: 10 },
  qtdSinal: { color: cores.texto, fontSize: 24, fontFamily: fontes.corpoNegrito },
  qtdValor: { color: cores.texto, fontSize: 24, minWidth: 28, textAlign: 'center', fontFamily: fontes.corpo },
  estoque: { color: cores.textoApagado, fontSize: 12, marginTop: 8, fontFamily: fontes.corpo },
  descricao: { color: cores.textoSuave, fontSize: 13, lineHeight: 19, fontFamily: fontes.corpo },
  ficha: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: cores.linha },
  fichaChave: { color: cores.textoApagado, fontSize: 13, width: 110, fontFamily: fontes.corpo },
  fichaValor: { color: cores.texto, fontSize: 13, flex: 1, fontFamily: fontes.corpo },
  sanfona: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#333', marginTop: 10 },
  sanfonaCabeca: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  sanfonaTitulo: { color: cores.texto, fontSize: 13, fontFamily: fontes.corpoNegrito, letterSpacing: 1 },
  resumoNotas: { flexDirection: 'row', gap: 16, alignItems: 'center', backgroundColor: cores.fundoCard, padding: 14 },
  mediaGrande: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 48, lineHeight: 50 },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barraRotulo: { color: cores.textoSuave, fontSize: 11, width: 22, fontFamily: fontes.corpo },
  barraFundo: { flex: 1, height: 6, backgroundColor: '#2A2A2A', borderRadius: 3 },
  barraCheia: { height: 6, backgroundColor: cores.vermelho, borderRadius: 3 },
  minhaAvaliacao: { borderWidth: 1, borderColor: cores.vermelho, padding: 14, marginTop: 14, gap: 10 },
  comentario: { borderWidth: 1, borderColor: cores.borda, color: cores.texto, padding: 10, minHeight: 80, textAlignVertical: 'top', backgroundColor: cores.fundoInput },
  avaliacaoItem: { borderBottomWidth: 1, borderBottomColor: cores.linha, paddingVertical: 12 },
  avaliacaoTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  autor: { color: cores.texto, fontFamily: fontes.corpoNegrito },
  verificada: { color: cores.sucesso, fontSize: 11, marginTop: 4, fontFamily: fontes.corpo },
  separador: { height: 1, backgroundColor: '#333', marginVertical: 24 },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: cores.fundoCard, borderTopWidth: 3, borderTopColor: cores.vermelho, padding: 16, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  modalTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 28 },
  tabela: { borderWidth: 1, borderColor: '#333' },
  tabelaLinha: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: cores.linha },
  tabelaCel: { flex: 1, color: cores.texto, padding: 8, fontSize: 13, fontFamily: fontes.corpo },
});
