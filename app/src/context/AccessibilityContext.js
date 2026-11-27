/**
 * Acessibilidade: "Áudio opcional" do painel de ajuda (desligado por padrão).
 * Quando ligado, o app anuncia por voz (expo-speech) a tela aberta e o
 * resultado das ações (ex.: "Capacete adicionado ao carrinho").
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { AccessibilityInfo } from 'react-native';

const CHAVE = '@zentor:audio';
const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [audio, setAudio] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE).then((v) => setAudio(v === '1')).catch(() => {});
  }, []);

  const definirAudio = useCallback((ligado) => {
    setAudio(ligado);
    AsyncStorage.setItem(CHAVE, ligado ? '1' : '0').catch(() => {});
  }, []);

  /** Anuncia o texto: por voz (se o áudio estiver ligado) e para leitores de tela. */
  const anunciar = useCallback((texto) => {
    AccessibilityInfo.announceForAccessibility?.(texto);
    if (audio) {
      Speech.stop();
      Speech.speak(texto, { language: 'pt-BR' });
    }
  }, [audio]);

  const valor = useMemo(
    () => ({ audio, definirAudio, anunciar, painelAberto, abrirPainel: () => setPainelAberto(true), fecharPainel: () => setPainelAberto(false) }),
    [audio, definirAudio, anunciar, painelAberto],
  );
  return <AccessibilityContext.Provider value={valor}>{children}</AccessibilityContext.Provider>;
}

export const useAcessibilidade = () => useContext(AccessibilityContext);
