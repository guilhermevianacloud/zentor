import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tela from '../components/Tela';
import { Botao, Campo, MensagemErro, Titulo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAcessibilidade } from '../context/AccessibilityContext';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { cpfValido, emailValido, mascaraCpf, mascaraTelefone, soDigitos } from '../utils/formatos';

/**
 * Tela de cadastro (Figma p. 2). Mudança registrada na documentação:
 * o Figma só tinha nome, sobrenome, CPF e telefone; foram incluídos
 * E-MAIL e SENHA porque o login exige esses dados.
 */
export default function CadastroScreen({ navigation, route }) {
  const { cadastrar } = useAuth();
  const { anunciar } = useAcessibilidade();
  const toast = useToast();
  const [f, setF] = useState({ nome: '', sobrenome: '', cpf: '', telefone: '', email: '', senha: '', confirmar: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const refs = { sobrenome: useRef(), cpf: useRef(), telefone: useRef(), email: useRef(), senha: useRef(), confirmar: useRef() };

  const muda = (campo, mascara) => (v) => {
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e)); // o erro some ao corrigir o campo
    setF((a) => ({ ...a, [campo]: mascara ? mascara(v) : v }));
  };

  const validar = () => {
    const e = {};
    if (!f.nome.trim()) e.nome = 'Informe o nome.';
    if (!f.sobrenome.trim()) e.sobrenome = 'Informe o sobrenome.';
    if (!cpfValido(f.cpf)) e.cpf = 'CPF inválido.';
    if (soDigitos(f.telefone).length < 10) e.telefone = 'Telefone com DDD.';
    if (!emailValido(f.email)) e.email = 'E-mail inválido.';
    if (f.senha.length < 6) e.senha = 'Mínimo de 6 caracteres.';
    if (f.confirmar !== f.senha) e.confirmar = 'As senhas não conferem.';
    return e;
  };

  const salvar = async () => {
    setErroGeral('');
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) {
      anunciar('Verifique os campos destacados.');
      return;
    }
    setEnviando(true);
    try {
      const { confirmar, ...dados } = f;
      const u = await cadastrar(dados);
      toast.sucesso(`Cadastro concluído. Bem-vindo, ${u.nome}!`);
      const destino = route.params?.voltarPara;
      if (destino) navigation.replace(destino);
      else navigation.navigate('Abas', { screen: 'Conta' });
    } catch (err) {
      setErros(err.campos || {});
      setErroGeral(err.message);
      anunciar(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const proximo = (campo) => () => refs[campo]?.current?.focus();

  return (
    <Tela rodape={false} fundoRadial>
      <View style={s.cartao}>
        <Titulo style={{ textAlign: 'center' }}>CADASTRO</Titulo>
        <Text style={s.sub}>Faça o seu cadastro</Text>

        <View style={s.linha}>
          <Campo style={s.metade} rotulo="NOME" placeholder="Insira seu Nome" value={f.nome} onChangeText={muda('nome')}
            erro={erros.nome} autoComplete="given-name" returnKeyType="next" onSubmitEditing={proximo('sobrenome')} />
          <Campo ref={refs.sobrenome} style={s.metade} rotulo="SOBRENOME" placeholder="Insira seu Sobrenome" value={f.sobrenome}
            onChangeText={muda('sobrenome')} erro={erros.sobrenome} autoComplete="family-name" returnKeyType="next" onSubmitEditing={proximo('cpf')} />
        </View>
        <View style={s.linha}>
          <Campo ref={refs.cpf} style={s.metade} rotulo="CPF" placeholder="Insira seu CPF" value={f.cpf} onChangeText={muda('cpf', mascaraCpf)}
            erro={erros.cpf} keyboardType="number-pad" returnKeyType="next" onSubmitEditing={proximo('telefone')} />
          <Campo ref={refs.telefone} style={s.metade} rotulo="TELEFONE" placeholder="EX: (11) 99999-9999" value={f.telefone}
            onChangeText={muda('telefone', mascaraTelefone)} erro={erros.telefone} keyboardType="phone-pad" autoComplete="tel"
            returnKeyType="next" onSubmitEditing={proximo('email')} />
        </View>
        <Campo ref={refs.email} rotulo="E-MAIL" placeholder="seuemail@gmail.com" value={f.email} onChangeText={muda('email')} erro={erros.email}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next" onSubmitEditing={proximo('senha')} />
        <View style={s.linha}>
          <Campo ref={refs.senha} style={s.metade} rotulo="SENHA" placeholder="Mínimo 6 caracteres" value={f.senha} onChangeText={muda('senha')}
            erro={erros.senha} secureTextEntry autoComplete="new-password" returnKeyType="next" onSubmitEditing={proximo('confirmar')} />
          <Campo ref={refs.confirmar} style={s.metade} rotulo="CONFIRMAR" placeholder="Repita a senha" value={f.confirmar}
            onChangeText={muda('confirmar')} erro={erros.confirmar} secureTextEntry returnKeyType="done" onSubmitEditing={salvar} />
        </View>

        <MensagemErro texto={erroGeral} />
        <Botao titulo="SALVAR" onPress={salvar} carregando={enviando} style={s.botao} rotuloAcessivel="Salvar cadastro" />
        <Text style={s.jaPossui}>Já possui uma conta?</Text>
        <Botao titulo="LOGIN" variante="escuro" onPress={() => navigation.navigate('Login', route.params)} style={s.botao} rotuloAcessivel="Ir para o login" />
      </View>
    </Tela>
  );
}

export const estilosConta = StyleSheet.create({
  cartao: {
    backgroundColor: 'rgba(30,22,22,0.92)', borderWidth: 1, borderColor: '#3A3030', paddingHorizontal: 20, paddingVertical: 28,
    marginTop: 24, marginBottom: 24, width: '100%', maxWidth: 460, alignSelf: 'center',
  },
  sub: { color: cores.texto, textAlign: 'center', marginBottom: 20, fontSize: 14, fontFamily: fontes.corpo },
  linha: { flexDirection: 'row', gap: 10 },
  metade: { flex: 1 },
  botao: { marginTop: 8, marginHorizontal: 16 },
  jaPossui: { color: cores.texto, textAlign: 'center', marginTop: 18, marginBottom: 6, fontSize: 13, fontFamily: fontes.corpo },
});
const s = estilosConta;
