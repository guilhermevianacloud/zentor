/**
 * PADRÃO OBSERVER (via Context API) — usuário logado.
 * O AuthProvider é o "sujeito": guarda o usuário e o token. Todo componente
 * que chama useAuth() vira um "observador" e é redesenhado automaticamente
 * quando alguém entra ou sai (ex.: o cabeçalho troca o ícone e o menu mostra
 * "Administrador" só para o perfil admin).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, definirToken } from '../config/api';

const CHAVE = '@zentor:sessao';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // "Lembrar de mim": restaura a sessão salva no aparelho.
  useEffect(() => {
    (async () => {
      try {
        const salvo = await AsyncStorage.getItem(CHAVE);
        if (salvo) {
          const { token } = JSON.parse(salvo);
          definirToken(token);
          const { usuario: u } = await api('/auth/me');
          setUsuario(u);
        }
      } catch {
        definirToken(null);
        await AsyncStorage.removeItem(CHAVE).catch(() => {});
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const iniciarSessao = useCallback(async ({ usuario: u, token }, lembrar) => {
    definirToken(token);
    setUsuario(u);
    if (lembrar) await AsyncStorage.setItem(CHAVE, JSON.stringify({ token }));
    else await AsyncStorage.removeItem(CHAVE);
  }, []);

  const entrar = useCallback(async (email, senha, lembrar) => {
    const dados = await api('/auth/login', { metodo: 'POST', corpo: { email, senha } });
    await iniciarSessao(dados, lembrar);
    return dados.usuario;
  }, [iniciarSessao]);

  const entrarComGoogle = useCallback(async () => {
    const dados = await api('/auth/google', { metodo: 'POST' });
    await iniciarSessao(dados, false);
    return dados.usuario;
  }, [iniciarSessao]);

  const cadastrar = useCallback(async (campos) => {
    const dados = await api('/auth/cadastro', { metodo: 'POST', corpo: campos });
    await iniciarSessao(dados, true);
    return dados.usuario;
  }, [iniciarSessao]);

  const atualizarPerfil = useCallback(async (dados) => {
    const r = await api('/auth/me', { metodo: 'PUT', corpo: dados });
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const sair = useCallback(async () => {
    definirToken(null);
    setUsuario(null);
    await AsyncStorage.removeItem(CHAVE);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, ehAdmin: usuario?.perfil === 'admin', entrar, entrarComGoogle, cadastrar, atualizarPerfil, sair }),
    [usuario, carregando, entrar, entrarComGoogle, cadastrar, atualizarPerfil, sair],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
