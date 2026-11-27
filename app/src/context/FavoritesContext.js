/**
 * Favoritos (Observer via Context): o coração no card, no detalhe e a aba
 * Favoritos se atualizam juntos. Salvo na API, por cliente.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../config/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { usuario } = useAuth();
  const [ids, setIds] = useState([]);

  const recarregar = useCallback(async () => {
    if (!usuario) { setIds([]); return []; }
    const r = await api('/favoritos');
    setIds(r.ids);
    return r.produtos;
  }, [usuario]);

  useEffect(() => { recarregar().catch(() => {}); }, [recarregar]);

  /** Liga/desliga o favorito. Devolve true/false (novo estado) ou null se precisa de login. */
  const alternar = useCallback(async (produtoId) => {
    if (!usuario) return null;
    const ehFavorito = ids.includes(produtoId);
    setIds((a) => (ehFavorito ? a.filter((i) => i !== produtoId) : [produtoId, ...a])); // resposta imediata
    try {
      const r = await api(`/favoritos/${produtoId}`, { metodo: ehFavorito ? 'DELETE' : 'POST' });
      setIds(r.ids);
      return !ehFavorito;
    } catch (e) {
      setIds((a) => (ehFavorito ? [produtoId, ...a] : a.filter((i) => i !== produtoId)));
      throw e;
    }
  }, [usuario, ids]);

  const valor = useMemo(() => ({ ids, ehFavorito: (id) => ids.includes(id), alternar, recarregar }), [ids, alternar, recarregar]);
  return <FavoritesContext.Provider value={valor}>{children}</FavoritesContext.Provider>;
}

export const useFavoritos = () => useContext(FavoritesContext);
