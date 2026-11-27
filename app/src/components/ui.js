import { forwardRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { anelFoco, cores, fontes } from '../theme';

export function Titulo({ children, tamanho = 40, style, ...props }) {
  return (
    <Text accessibilityRole="header" style={[estilos.titulo, { fontSize: tamanho, lineHeight: tamanho * 1.05 }, style]} {...props}>
      {children}
    </Text>
  );
}

export function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado, rotuloAcessivel, style, tamanhoFonte = 26 }) {
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel || titulo}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      style={({ pressed, hovered, focused }) => [
        estilos.botao,
        variante === 'primario' && estilos.botaoPrimario,
        variante === 'escuro' && estilos.botaoEscuro,
        variante === 'contorno' && estilos.botaoContorno,
        hovered && !inativo && (variante === 'primario' ? estilos.botaoPrimarioHover : estilos.botaoNeutroHover),
        focused && anelFoco,
        pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
        inativo && { opacity: 0.5 },
        style,
      ]}
    >
      {carregando ? <ActivityIndicator color={cores.texto} /> : <Text style={[estilos.botaoTexto, { fontSize: tamanhoFonte }]}>{titulo}</Text>}
    </Pressable>
  );
}

/** Campo com rótulo visível + rótulo acessível + mensagem de erro anunciada. */
export const Campo = forwardRef(function Campo({ rotulo, erro, style, rotuloTamanho = 26, ...props }, ref) {
  const [focado, setFocado] = useState(false);
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {rotulo ? <Text style={[estilos.rotulo, { fontSize: rotuloTamanho }]}>{rotulo}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={cores.textoApagado}
        accessibilityLabel={rotulo}
        accessibilityHint={erro || undefined}
        {...props}
        style={[estilos.input, focado && estilos.inputFocado, erro && { borderColor: cores.erro }]}
        /* Foco: borda branca (o contorno azul padrão do navegador some no fundo preto). */
        onFocus={(e) => { setFocado(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocado(false); props.onBlur?.(e); }}
      />
      {erro ? (
        <Text style={estilos.erro} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}
    </View>
  );
});

export function Chip({ rotulo, ativo, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      accessibilityLabel={`Filtro ${rotulo}${ativo ? ', selecionado' : ''}`}
      style={({ hovered, focused }) => [estilos.chip, hovered && !ativo && estilos.chipHover, ativo && estilos.chipAtivo, focused && anelFoco]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: cores.texto }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function MensagemErro({ texto }) {
  if (!texto) return null;
  return (
    <Text style={[estilos.erro, { textAlign: 'center', marginVertical: 8 }]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
      {texto}
    </Text>
  );
}

export function Carregando() {
  return (
    <View style={{ padding: 40, alignItems: 'center' }} accessibilityLabel="Carregando">
      <ActivityIndicator size="large" color={cores.vermelho} />
    </View>
  );
}

/** Alert funciona no celular; no navegador o Alert do RN não aparece, então usamos window.alert. */
export function avisar(titulo, mensagem) {
  if (Platform.OS === 'web') window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
  else Alert.alert(titulo, mensagem);
}

export function confirmar(titulo, mensagem) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, color: cores.texto, letterSpacing: 0.5 },
  botao: { minHeight: 50, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  botaoPrimario: { backgroundColor: cores.vermelho },
  botaoEscuro: { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.borda },
  botaoContorno: { backgroundColor: 'transparent', borderWidth: 1, borderColor: cores.texto },
  botaoPrimarioHover: { backgroundColor: '#F2121F' },
  botaoNeutroHover: { borderColor: cores.texto, backgroundColor: cores.fundoCard },
  botaoTexto: { fontFamily: fontes.titulo, color: cores.texto, letterSpacing: 0.8 },
  rotulo: { fontFamily: fontes.titulo, color: cores.texto, marginBottom: 6 },
  input: {
    backgroundColor: cores.fundoInput, borderWidth: 1, borderColor: cores.borda, color: cores.texto,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 48, fontFamily: fontes.corpo,
    outlineStyle: 'none',
  },
  inputFocado: { borderColor: cores.texto },
  erro: { color: cores.erro, fontSize: 13, marginTop: 4, fontFamily: fontes.corpo },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: cores.fundoCard },
  chipHover: { borderColor: cores.textoSuave },
  chipAtivo: { backgroundColor: cores.vermelho, borderColor: cores.vermelho },
  chipTexto: { color: cores.textoSuave, fontSize: 14, fontFamily: fontes.corpoSemi },
});
