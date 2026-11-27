import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores, fontes } from '../theme';
import { Botao } from './ui';
import Quadriculado from './Quadriculado';

/** Estrelas de avaliação (somente leitura ou clicáveis quando recebe onChange). */
export function Estrelas({ nota = 0, tamanho = 16, onChange, rotulo }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 1 }} accessibilityLabel={rotulo || `Nota ${nota} de 5`}
      accessibilityRole={onChange ? 'adjustable' : 'text'}>
      {[1, 2, 3, 4, 5].map((n) => {
        const nome = nota >= n - 0.25 ? 'star' : nota >= n - 0.75 ? 'star-half' : 'star-outline';
        const icone = <Ionicons name={nome} size={tamanho} color={cores.vermelho} />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} estrela${n > 1 ? 's' : ''}`} hitSlop={4}>
            {icone}
          </Pressable>
        ) : <View key={n}>{icone}</View>;
      })}
    </View>
  );
}

/** Bloco cinza pulsando enquanto carrega (skeleton). */
export function Esqueleto({ largura = '100%', altura = 16, style }) {
  const opacidade = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    let anim;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduzir) => { if (reduzir) anim?.stop(); }).catch(() => {});
    anim = Animated.loop(Animated.sequence([
      Animated.timing(opacidade, { toValue: 0.8, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacidade, { toValue: 0.35, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [opacidade]);
  return <Animated.View style={[{ width: largura, height: altura, backgroundColor: '#2C2C2C', opacity: opacidade }, style]} />;
}

/** Grade de cards "fantasmas" para o carregamento do catálogo. */
export function GradeEsqueleto({ quantidade = 4, largura = '48%' }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} accessibilityLabel="Carregando produtos">
      {Array.from({ length: quantidade }).map((_, i) => (
        <View key={i} style={{ width: largura, marginBottom: 14 }}>
          <Esqueleto altura={170} />
          <Esqueleto altura={14} style={{ marginTop: 10, width: '80%' }} />
          <Esqueleto altura={18} style={{ marginTop: 8, width: '50%' }} />
        </View>
      ))}
    </View>
  );
}

/** Estado vazio com ícone, texto e ação. */
export function Vazio({ icone = 'cube-outline', titulo, texto, acao, onAcao }) {
  return (
    <View style={s.vazio}>
      <Ionicons name={icone} size={56} color={cores.textoApagado} />
      <Text style={s.vazioTitulo}>{titulo}</Text>
      {texto ? <Text style={s.vazioTexto}>{texto}</Text> : null}
      {acao ? <Botao titulo={acao} onPress={onAcao} style={{ marginTop: 8, alignSelf: 'stretch' }} tamanhoFonte={22} /> : null}
    </View>
  );
}

/** Linha de menu (tela Minha conta, painel do admin). */
export function LinhaMenu({ icone, titulo, subtitulo, onPress, destaque, direita }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.linha, pressed && { backgroundColor: '#181818' }]}
      accessibilityRole="button" accessibilityLabel={subtitulo ? `${titulo}. ${subtitulo}` : titulo}>
      <View style={[s.linhaIcone, destaque && { backgroundColor: cores.vermelho }]}>
        <Ionicons name={icone} size={20} color={cores.texto} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.linhaTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={s.linhaSub}>{subtitulo}</Text> : null}
      </View>
      {direita}
      <Ionicons name="chevron-forward" size={18} color={cores.textoApagado} />
    </Pressable>
  );
}

/** Título de seção com linha vermelha (identidade do Figma). */
export function TituloSecao({ children, acao, onAcao }) {
  return (
    <View style={s.secao}>
      <View>
        <Text style={s.secaoTexto} accessibilityRole="header">{children}</Text>
        <Quadriculado colunas={8} linhas={2} tamanho={5} style={{ marginTop: 4 }} />
      </View>
      {acao ? (
        <Pressable onPress={onAcao} accessibilityRole="link" hitSlop={8}>
          <Text style={s.secaoAcao}>{acao}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Selo de status do pedido. */
export const COR_STATUS = {
  aguardando_pagamento: '#E8A33D', pago: '#3D9BE8', enviado: '#9B59B6', entregue: cores.sucesso, cancelado: '#777',
};
export function SeloStatus({ status, rotulo }) {
  return (
    <View style={[s.selo, { borderColor: COR_STATUS[status], backgroundColor: `${COR_STATUS[status]}22` }]}>
      <Text style={[s.seloTexto, { color: COR_STATUS[status] }]}>{rotulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  vazio: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 20 },
  vazioTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 26, textAlign: 'center' },
  vazioTexto: { color: cores.textoSuave, fontSize: 14, textAlign: 'center', fontFamily: fontes.corpo },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: cores.linha },
  linhaIcone: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  linhaTitulo: { color: cores.texto, fontSize: 15, fontFamily: fontes.corpoSemi },
  linhaSub: { color: cores.textoApagado, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  secao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  secaoTexto: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 30 },
  secaoAcao: { color: cores.vermelhoTexto, fontFamily: fontes.corpoNegrito, fontSize: 13 },
  selo: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  seloTexto: { fontSize: 12, fontFamily: fontes.corpoSemi },
});
