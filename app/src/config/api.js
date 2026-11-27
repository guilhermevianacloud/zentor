import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PORTA_API = 3333;

/**
 * Descobre o endereço da API:
 * 1) EXPO_PUBLIC_API_URL no arquivo .env (tem prioridade);
 * 2) no navegador, o mesmo host da página;
 * 3) no celular (Expo Go), o IP do computador que está rodando o Expo;
 * 4) emulador Android usa 10.0.2.2 para chegar ao localhost do PC.
 */
function detectarApi() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:${PORTA_API}`;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(':')[0]}:${PORTA_API}`;
  return Platform.OS === 'android' ? `http://10.0.2.2:${PORTA_API}` : `http://localhost:${PORTA_API}`;
}

export const API_URL = detectarApi();

let tokenAtual = null;
export function definirToken(token) {
  tokenAtual = token;
}

export class ApiError extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos || {};
  }
}

/** fetch com JSON, token e mensagens de erro em português. */
export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${API_URL}/api${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(tokenAtual ? { Authorization: `Bearer ${tokenAtual}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ApiError(`Não foi possível conectar à API (${API_URL}). Verifique se o backend está rodando.`, 0);
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ApiError(dados.erro || 'Erro inesperado.', resposta.status, dados.campos);
  return dados;
}

/** Monta a URL de uma imagem vinda do banco (/img/..., data URI ou http). */
export function urlImagem(caminho) {
  if (!caminho) return null;
  if (caminho.startsWith('data:') || caminho.startsWith('http')) return caminho;
  return `${API_URL}${caminho}`;
}
