import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cores, fontes } from '../theme';
import { useAuth } from '../context/AuthContext';

/**
 * Menu principal (☰). Fica na raiz do app, e não dentro do cabeçalho:
 * no navegador, um Modal dentro do cabeçalho do native-stack não aparecia.
 */
const MenuContext = createContext(null);

export function MenuProvider({ children }) {
  const [aberto, setAberto] = useState(false);
  const abertoEm = useRef(0);
  const valor = useMemo(() => ({
    aberto,
    abrir: () => { abertoEm.current = Date.now(); setAberto(true); },
    // Ignora o mesmo clique que abriu o menu.
    fechar: () => { if (Date.now() - abertoEm.current > 300) setAberto(false); },
    fecharAgora: () => setAberto(false),
  }), [aberto]);
  return <MenuContext.Provider value={valor}>{children}</MenuContext.Provider>;
}

export const useMenu = () => useContext(MenuContext);

export default function MenuPrincipal({ navegar }) {
  const insets = useSafeAreaInsets();
  const { aberto, fechar, fecharAgora } = useMenu();
  const { usuario, ehAdmin, sair } = useAuth();

  const ir = (tela) => {
    fecharAgora();
    navegar(tela);
  };

  const itens = [
    { tela: 'Home', rotulo: 'Início', icone: 'home-outline' },
    { tela: 'Catalogo', rotulo: 'Capacetes', icone: 'grid-outline' },
    ...(usuario ? [{ tela: 'MeusPedidos', rotulo: 'Meus pedidos', icone: 'receipt-outline' }] : []),
    { tela: 'Favoritos', rotulo: 'Favoritos', icone: 'heart-outline' },
    { tela: 'Faq', rotulo: 'Perguntas frequentes', icone: 'help-circle-outline' },
    { tela: 'Sobre', rotulo: 'Sobre nós', icone: 'information-circle-outline' },
    ...(ehAdmin ? [{ tela: 'Admin', rotulo: 'Painel do administrador', icone: 'speedometer-outline' }] : []),
  ];

  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={fecharAgora}>
      <Pressable style={s.fundo} onPress={fechar} accessibilityLabel="Fechar menu">
        <View style={[s.menu, { marginTop: insets.top + 64 }]} accessibilityRole="menu">
          {usuario ? <Text style={s.ola}>Olá, {usuario.nome}</Text> : null}
          {itens.map((item) => (
            <Pressable key={item.tela} onPress={() => ir(item.tela)} style={s.item} accessibilityRole="menuitem" accessibilityLabel={item.rotulo}>
              <Ionicons name={item.icone} size={20} color={cores.vermelho} />
              <Text style={s.itemTexto}>{item.rotulo}</Text>
            </Pressable>
          ))}
          {usuario ? (
            <Pressable onPress={() => { fecharAgora(); sair(); navegar('Home'); }} style={s.item} accessibilityRole="menuitem" accessibilityLabel="Sair">
              <Ionicons name="log-out-outline" size={20} color={cores.vermelho} />
              <Text style={s.itemTexto}>Sair</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => ir('Login')} style={s.item} accessibilityRole="menuitem" accessibilityLabel="Entrar / Cadastrar">
              <Ionicons name="log-in-outline" size={20} color={cores.vermelho} />
              <Text style={s.itemTexto}>Entrar / Cadastrar</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'flex-end' },
  menu: { backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.borda, marginRight: 10, minWidth: 240, paddingVertical: 8 },
  ola: { color: cores.textoSuave, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, fontFamily: fontes.corpo },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  itemTexto: { color: cores.texto, fontSize: 16, fontFamily: fontes.corpo },
});
