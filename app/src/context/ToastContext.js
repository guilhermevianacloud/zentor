/**
 * Notificações rápidas (toast) no lugar de alert(): aparecem no rodapé,
 * somem sozinhas e são anunciadas ao leitor de tela.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cores, fontes } from '../theme';
import { useAcessibilidade } from './AccessibilityContext';

const ToastContext = createContext(null);
const ICONES = { sucesso: 'checkmark-circle', erro: 'alert-circle', info: 'information-circle' };
const COR = { sucesso: cores.sucesso, erro: cores.erro, info: cores.texto };

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const { anunciar } = useAcessibilidade();
  const [toast, setToast] = useState(null);
  const opacidade = useRef(new Animated.Value(0)).current;
  const timer = useRef();

  const mostrar = useCallback((mensagem, tipo = 'sucesso') => {
    clearTimeout(timer.current);
    setToast({ mensagem, tipo });
    anunciar(mensagem);
    Animated.timing(opacidade, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacidade, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setToast(null));
    }, 2800);
  }, [anunciar, opacidade]);

  const valor = useMemo(() => ({
    sucesso: (m) => mostrar(m, 'sucesso'),
    erro: (m) => mostrar(m, 'erro'),
    info: (m) => mostrar(m, 'info'),
  }), [mostrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[s.toast, { bottom: insets.bottom + 76, opacity: opacidade }]}>
          <View style={[s.caixa, { borderLeftColor: COR[toast.tipo] }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Ionicons name={ICONES[toast.tipo]} size={20} color={COR[toast.tipo]} />
            <Text style={s.texto}>{toast.mensagem}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 999 },
  caixa: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cores.fundoCard, borderLeftWidth: 4,
    paddingHorizontal: 14, paddingVertical: 12, maxWidth: 520, width: '100%', borderRadius: 2,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  texto: { color: cores.texto, fontSize: 14, flex: 1, fontFamily: fontes.corpo },
});
