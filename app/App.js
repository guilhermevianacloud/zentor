import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';

import { AuthProvider } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { AccessibilityProvider, useAcessibilidade } from './src/context/AccessibilityContext';
import { ToastProvider } from './src/context/ToastContext';
import Header from './src/components/Header';
import AccessibilityPanel from './src/components/AccessibilityPanel';
import MenuPrincipal, { MenuProvider } from './src/components/MenuPrincipal';
import { cores, fontes } from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import CatalogoScreen from './src/screens/CatalogoScreen';
import FavoritosScreen from './src/screens/FavoritosScreen';
import CarrinhoScreen from './src/screens/CarrinhoScreen';
import ContaScreen from './src/screens/ContaScreen';
import ProdutoScreen from './src/screens/ProdutoScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import PedidoScreen from './src/screens/PedidoScreen';
import MeusPedidosScreen from './src/screens/MeusPedidosScreen';
import LoginScreen from './src/screens/LoginScreen';
import CadastroScreen from './src/screens/CadastroScreen';
import RecuperarSenhaScreen from './src/screens/RecuperarSenhaScreen';
import EditarPerfilScreen from './src/screens/EditarPerfilScreen';
import AlterarSenhaScreen from './src/screens/AlterarSenhaScreen';
import EnderecosScreen from './src/screens/EnderecosScreen';
import FaqScreen from './src/screens/FaqScreen';
import SobreScreen from './src/screens/SobreScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminProdutosScreen from './src/screens/AdminProdutosScreen';
import AdminProdutoFormScreen from './src/screens/AdminProdutoFormScreen';
import AdminPedidosScreen from './src/screens/AdminPedidosScreen';

const Stack = createNativeStackNavigator();

/**
 * Web: anel de foco branco para quem navega pelo teclado (o contorno padrão do
 * navegador é escuro e some no fundo preto) e animações desligadas quando o
 * sistema pede "reduzir movimento".
 */
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('zentor-foco')) {
  const css = document.createElement('style');
  css.id = 'zentor-foco';
  css.textContent = `
    [role="button"]:focus-visible, [role="link"]:focus-visible, [role="tab"]:focus-visible,
    [role="radio"]:focus-visible, [role="checkbox"]:focus-visible, [role="menuitem"]:focus-visible,
    button:focus-visible, a:focus-visible { outline: 2px solid #FFFFFF !important; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
  document.head.appendChild(css);
}
const Tab = createBottomTabNavigator();

// Nome falado/anunciado de cada tela (acessibilidade) e título da aba no navegador.
export const TITULOS = {
  Home: 'Início', Catalogo: 'Nossos capacetes', Favoritos: 'Favoritos', Carrinho: 'Carrinho', Conta: 'Minha conta',
  Produto: 'Detalhe do capacete', Checkout: 'Envio e checkout', Pedido: 'Detalhe do pedido', MeusPedidos: 'Meus pedidos',
  Login: 'Entrar', Cadastro: 'Cadastro', RecuperarSenha: 'Recuperar senha', EditarPerfil: 'Editar perfil',
  AlterarSenha: 'Alterar senha', Enderecos: 'Meus endereços', Faq: 'Perguntas frequentes', Sobre: 'Sobre nós',
  Admin: 'Painel do administrador', AdminProdutos: 'Produtos', AdminProdutoForm: 'Cadastro de capacete', AdminPedidos: 'Pedidos',
};
const TELAS_DE_FORMULARIO = ['Cadastro', 'Login', 'RecuperarSenha', 'Checkout', 'EditarPerfil', 'AlterarSenha', 'Enderecos', 'AdminProdutoForm'];

const ABAS = ['Home', 'Catalogo', 'Favoritos', 'Carrinho', 'Conta'];

const ICONES_ABA = {
  Home: ['home', 'home-outline'],
  Catalogo: ['grid', 'grid-outline'],
  Favoritos: ['heart', 'heart-outline'],
  Carrinho: ['cart', 'cart-outline'],
  Conta: ['person', 'person-outline'],
};

const tema = { ...DarkTheme, colors: { ...DarkTheme.colors, background: cores.fundo, card: cores.fundo, primary: cores.vermelho } };

function Abas() {
  const { quantidadeTotal } = useCart();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: cores.vermelho,
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarStyle: { backgroundColor: cores.fundoCard, borderTopColor: cores.linha, height: Platform.OS === 'web' ? 62 : undefined, paddingTop: 4 },
        tabBarLabelStyle: { fontFamily: fontes.titulo, fontSize: 14, letterSpacing: 0.5 },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={ICONES_ABA[route.name][focused ? 0 : 1]} size={size - 2} color={color} />
        ),
        tabBarAccessibilityLabel: TITULOS[route.name],
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Catalogo" component={CatalogoScreen} options={{ title: 'Capacetes' }} />
      <Tab.Screen name="Favoritos" component={FavoritosScreen} options={{ title: 'Favoritos' }} />
      <Tab.Screen
        name="Carrinho"
        component={CarrinhoScreen}
        options={{
          title: 'Carrinho',
          tabBarBadge: quantidadeTotal > 0 ? quantidadeTotal : undefined,
          tabBarBadgeStyle: { backgroundColor: cores.vermelho, color: cores.texto, fontSize: 11, fontFamily: fontes.corpo },
          tabBarAccessibilityLabel: `Carrinho com ${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'}`,
        }}
      />
      <Tab.Screen name="Conta" component={ContaScreen} options={{ title: 'Conta' }} />
    </Tab.Navigator>
  );
}

function Navegacao() {
  const navRef = useNavigationContainerRef();
  const rotaAnterior = useRef();
  const [rotaAtual, setRotaAtual] = useState('Home');
  const { anunciar } = useAcessibilidade();

  const aoMudarTela = () => {
    const nome = navRef.getCurrentRoute()?.name;
    if (nome && nome !== rotaAnterior.current) {
      rotaAnterior.current = nome;
      setRotaAtual(nome);
      anunciar(`Tela ${TITULOS[nome] || nome}`);
    }
  };

  return (
    <NavigationContainer
      ref={navRef}
      theme={tema}
      onReady={aoMudarTela}
      onStateChange={aoMudarTela}
      documentTitle={{ formatter: (_, route) => `Zentor · ${TITULOS[route?.name] || 'Loja de capacetes'}` }}
    >
      <Stack.Navigator
        initialRouteName="Abas"
        screenOptions={{
          header: (props) => <Header {...props} />,
          contentStyle: { backgroundColor: cores.fundo },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Abas" component={Abas} />
        <Stack.Screen name="Produto" component={ProdutoScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Pedido" component={PedidoScreen} />
        <Stack.Screen name="MeusPedidos" component={MeusPedidosScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Cadastro" component={CadastroScreen} />
        <Stack.Screen name="RecuperarSenha" component={RecuperarSenhaScreen} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
        <Stack.Screen name="AlterarSenha" component={AlterarSenhaScreen} />
        <Stack.Screen name="Enderecos" component={EnderecosScreen} />
        <Stack.Screen name="Faq" component={FaqScreen} />
        <Stack.Screen name="Sobre" component={SobreScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="AdminProdutos" component={AdminProdutosScreen} />
        <Stack.Screen name="AdminProdutoForm" component={AdminProdutoFormScreen} />
        <Stack.Screen name="AdminPedidos" component={AdminPedidosScreen} />
      </Stack.Navigator>
      <MenuPrincipal navegar={(tela) => (ABAS.includes(tela) ? navRef.navigate('Abas', { screen: tela }) : navRef.navigate(tela))} />
      <AccessibilityPanel contexto={TELAS_DE_FORMULARIO.includes(rotaAtual) ? 'cadastro' : 'loja'} />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontesCarregadas] = useFonts({ BebasNeue_400Regular, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold });

  if (!fontesCarregadas) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={cores.vermelho} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AccessibilityProvider>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <CartProvider>
                <MenuProvider>
                  <StatusBar style="light" />
                  <Navegacao />
                </MenuProvider>
              </CartProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </AccessibilityProvider>
    </SafeAreaProvider>
  );
}
