import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, Campo, MensagemErro, Titulo } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAcessibilidade } from '../context/AccessibilityContext';
import { cores, fontes } from '../theme';
import { estilosConta } from './CadastroScreen';

/** Tela de login (Figma p. 3). "Entrar com Google" é SIMULADO. */
export default function LoginScreen({ navigation, route }) {
  const { entrar, entrarComGoogle } = useAuth();
  const { anunciar } = useAcessibilidade();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const senhaRef = useRef();

  const depoisDeEntrar = (u) => {
    toast.sucesso(`Bem-vindo, ${u.nome}!`);
    const destino = route.params?.voltarPara;
    if (destino) navigation.replace(destino);
    else if (u.perfil === 'admin') navigation.replace('Admin');
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Abas', { screen: 'Home' });
  };

  const fazerLogin = async () => {
    setErro('');
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      anunciar('Informe e-mail e senha.');
      return;
    }
    setEnviando(true);
    try {
      depoisDeEntrar(await entrar(email, senha, lembrar));
    } catch (e) {
      setErro(e.message);
      anunciar(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const google = async () => {
    try {
      const u = await entrarComGoogle();
      toast.info('Login com Google simulado: você entrou com uma conta de demonstração.');
      depoisDeEntrar(u);
    } catch (e) {
      setErro(e.message);
    }
  };

  return (
    <Tela rodape={false} fundoRadial>
      <View style={estilosConta.cartao}>
        <Titulo style={{ textAlign: 'center' }}>ENTRAR</Titulo>
        <Text style={estilosConta.sub}>Acesse sua conta para acompanhar pedidos e favoritos</Text>

        <Campo rotulo="E-MAIL" placeholder="seuemail@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" autoComplete="email" returnKeyType="next" onSubmitEditing={() => senhaRef.current?.focus()} />
        <Campo ref={senhaRef} rotulo="SENHA" placeholder="••••••••" value={senha} onChangeText={setSenha} secureTextEntry
          autoComplete="current-password" returnKeyType="go" onSubmitEditing={fazerLogin} />

        <View style={s.opcoes}>
          <Pressable
            onPress={() => setLembrar(!lembrar)}
            style={s.lembrar}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: lembrar }}
            accessibilityLabel="Lembrar de mim"
          >
            <Ionicons name={lembrar ? 'checkbox' : 'square-outline'} size={20} color={lembrar ? cores.vermelho : cores.textoApagado} />
            <Text style={s.opcaoTexto}>Lembrar de mim</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('RecuperarSenha', { email })} accessibilityRole="link" accessibilityLabel="Esqueci minha senha">
            <Text style={s.opcaoTexto}>Esqueci minha senha</Text>
          </Pressable>
        </View>

        <MensagemErro texto={erro} />
        <Botao titulo="ENTRAR" onPress={fazerLogin} carregando={enviando} style={estilosConta.botao} />

        <Text style={estilosConta.jaPossui}>ou continue com</Text>
        <Pressable onPress={google} style={s.google} accessibilityRole="button" accessibilityLabel="Entrar com Google (simulado)">
          <Text style={s.g}>G</Text>
          <Text style={s.googleTexto}>Entrar com Google</Text>
        </Pressable>

        <Text style={estilosConta.jaPossui}>Ainda não tem conta?</Text>
        <Botao titulo="CRIAR CADASTRO" variante="escuro" onPress={() => navigation.navigate('Cadastro', route.params)} style={estilosConta.botao} />
      </View>
    </Tela>
  );
}

const s = StyleSheet.create({
  opcoes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  lembrar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opcaoTexto: { color: cores.textoSuave, fontSize: 13, fontFamily: fontes.corpo },
  google: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: cores.fundo,
    borderWidth: 1, borderColor: cores.borda, minHeight: 50, marginHorizontal: 16,
  },
  g: { color: '#4285F4', fontSize: 22, fontFamily: fontes.corpoNegrito },
  googleTexto: { color: cores.textoSuave, fontSize: 17, fontFamily: fontes.corpoSemi },
});
