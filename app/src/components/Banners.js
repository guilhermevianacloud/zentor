import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { anelFoco, cores, fontes } from '../theme';
import { useToast } from '../context/ToastContext';

/** Proporção das artes (2034 × 654), a mesma do banner original do Figma. */
export const PROPORCAO_BANNER = 654 / 2034;
const INTERVALO = 6000;

/** Banner de imagem clicável. O texto da arte vai no rótulo acessível (leitor de tela não lê imagem). */
export function BannerImagem({ fonte, rotulo, onPress, largura }) {
  // No navegador a imagem ignora aspectRatio e usa a altura original (654 px);
  // por isso a altura é calculada a partir da largura medida.
  const [medida, setMedida] = useState(0);
  const w = largura || medida;
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={rotulo}
      onLayout={largura ? undefined : (e) => setMedida(Math.round(e.nativeEvent.layout.width))}
      style={({ pressed, focused }) => [pressed && { opacity: 0.9 }, focused && anelFoco]}>
      {w ? <Image source={fonte} style={{ width: w, height: Math.round(w * PROPORCAO_BANNER) }} resizeMode="cover" />
        : <View style={{ height: 120 }} />}
    </Pressable>
  );
}

/**
 * Carrossel do topo. Decisões de UX/acessibilidade:
 * - troca sozinho a cada 6 s, mas PARA quando a pessoa arrasta, toca nos
 *   indicadores ou aperta "pausar" (WCAG 2.2.2: conteúdo em movimento precisa de pausa);
 * - não gira sozinho se o sistema estiver com "reduzir movimento" ligado;
 * - indicadores clicáveis com rótulo "Banner 2 de 3".
 */
export function CarrosselBanners({ slides }) {
  const ref = useRef(null);
  // Largura medida do espaço real (no navegador, a largura da janela inclui a barra de rolagem).
  const [largura, setLargura] = useState(0);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((r) => r && setPausado(true)).catch(() => {});
  }, []);

  const irPara = useCallback((i, animar = true) => {
    const n = (i + slides.length) % slides.length;
    ref.current?.scrollTo({ x: n * largura, animated: animar });
    setAtual(n);
  }, [largura, slides.length]);

  useEffect(() => {
    if (pausado || slides.length < 2 || !largura) return undefined;
    const t = setInterval(() => irPara(atual + 1), INTERVALO);
    return () => clearInterval(t);
  }, [pausado, atual, irPara, slides.length, largura]);

  // Se a largura mudar (girar o celular, redimensionar a janela), mantém o slide atual no lugar.
  useEffect(() => { if (largura) irPara(atual, false); }, [largura]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View accessibilityLabel="Destaques da loja" onLayout={(e) => setLargura(Math.round(e.nativeEvent.layout.width))}>
      {largura ? (<>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, width: largura }}
        onScrollBeginDrag={() => setPausado(true)}
        onMomentumScrollEnd={(e) => setAtual(Math.round(e.nativeEvent.contentOffset.x / largura))}
        scrollEventThrottle={16}>
        {slides.map((s, i) => (
          <View key={s.id} accessibilityElementsHidden={i !== atual} importantForAccessibility={i === atual ? 'auto' : 'no-hide-descendants'}>
            <BannerImagem fonte={s.fonte} rotulo={`Banner ${i + 1} de ${slides.length}: ${s.rotulo}`} onPress={s.onPress} largura={largura} />
          </View>
        ))}
      </ScrollView>
      </>) : <View style={{ aspectRatio: 1 / PROPORCAO_BANNER, backgroundColor: cores.fundoCard }} />}
      <View style={s.controles}>
        <View style={s.pontos}>
          {slides.map((sl, i) => (
            <Pressable key={sl.id} onPress={() => { setPausado(true); irPara(i); }} hitSlop={8}
              accessibilityRole="button" accessibilityLabel={`Ir para o banner ${i + 1} de ${slides.length}`} accessibilityState={{ selected: i === atual }}
              style={({ focused }) => [s.ponto, i === atual && s.pontoAtivo, focused && anelFoco]} />
          ))}
        </View>
        <Pressable onPress={() => setPausado((p) => !p)} hitSlop={8} accessibilityRole="button"
          accessibilityLabel={pausado ? 'Retomar troca automática dos banners' : 'Pausar troca automática dos banners'}
          style={({ focused }) => [s.pausa, focused && anelFoco]}>
          <Ionicons name={pausado ? 'play' : 'pause'} size={12} color={cores.textoSuave} />
        </Pressable>
      </View>
    </View>
  );
}

const CUPONS = [
  { codigo: 'BEMVINDO10', titulo: '10% off', texto: 'para começar bem' },
  { codigo: 'ZENTOR50', titulo: 'R$ 50 off', texto: 'a partir de R$ 500' },
  { codigo: 'FRETEGRATIS', titulo: 'Frete grátis', texto: 'a partir de R$ 300' },
];

/** Faixa de cupons com "copiar": a pessoa não precisa decorar nem digitar o código. */
export function FaixaCupons() {
  const toast = useToast();
  const [copiado, setCopiado] = useState(null);
  const copiar = async (c) => {
    try {
      await Clipboard.setStringAsync(c.codigo);
      setCopiado(c.codigo);
      toast.sucesso(`Cupom ${c.codigo} copiado. Cole no carrinho.`);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      toast.erro(`Não deu para copiar. O código é ${c.codigo}.`);
    }
  };
  return (
    <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={s.cupons}>
      {CUPONS.map((c) => (
        <View key={c.codigo} style={s.cupom}>
          <View style={s.cupomFaixa} />
          <View style={{ flex: 1 }}>
            <Text style={s.cupomTitulo}>{c.titulo}</Text>
            <Text style={s.cupomTexto}>{c.texto}</Text>
            <Text style={s.cupomCodigo}>{c.codigo}</Text>
          </View>
          <Pressable onPress={() => copiar(c)} accessibilityRole="button" accessibilityLabel={`Copiar cupom ${c.codigo}: ${c.titulo} ${c.texto}`}
            style={({ hovered, focused }) => [s.copiar, hovered && { borderColor: cores.texto }, focused && anelFoco]}>
            <Ionicons name={copiado === c.codigo ? 'checkmark' : 'copy-outline'} size={14} color={copiado === c.codigo ? cores.sucesso : cores.texto} />
            <Text style={[s.copiarTexto, copiado === c.codigo && { color: cores.sucesso }]}>{copiado === c.codigo ? 'Copiado' : 'Copiar'}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 14 },
  pontos: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A4A4A' },
  pontoAtivo: { width: 22, backgroundColor: cores.vermelho },
  pausa: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' },
  cupons: { paddingHorizontal: 16, gap: 10 },
  cupom: { width: 250, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.linha, borderStyle: 'dashed', paddingVertical: 12, paddingRight: 12, overflow: 'hidden' },
  cupomFaixa: { width: 4, alignSelf: 'stretch', backgroundColor: cores.vermelho },
  cupomTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 24, lineHeight: 25 },
  cupomTexto: { color: cores.textoApagado, fontSize: 12, fontFamily: fontes.corpo },
  cupomCodigo: { color: cores.vermelhoTexto, fontSize: 12, marginTop: 4, letterSpacing: 1, fontFamily: fontes.corpoNegrito },
  copiar: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 10, paddingVertical: 7 },
  copiarTexto: { color: cores.texto, fontSize: 12, fontFamily: fontes.corpoSemi },
});
