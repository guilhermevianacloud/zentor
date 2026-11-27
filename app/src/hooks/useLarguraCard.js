import { useWindowDimensions } from 'react-native';

/**
 * Grade de 2 colunas no celular (3 em telas largas). Usa porcentagem para não
 * depender da largura exata da janela (no navegador a barra de rolagem ocupa espaço).
 */
export default function useLarguraCard() {
  const { width } = useWindowDimensions();
  const colunas = Math.min(width, 720) > 590 ? 3 : 2;
  return { largura: colunas === 3 ? '31.5%' : '48%', gap: 0, colunas };
}
