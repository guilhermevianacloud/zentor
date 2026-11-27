import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tela from '../components/Tela';
import { Botao, Campo, MensagemErro, Titulo } from '../components/ui';
import { api } from '../config/api';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { estilosConta } from './CadastroScreen';

/**
 * Recuperação de senha. O envio de e-mail é SIMULADO: a API devolve o código
 * de 6 dígitos e o app mostra na tela (num sistema real, iria por e-mail).
 */
export default function RecuperarSenhaScreen({ navigation, route }) {
  const toast = useToast();
  const [etapa, setEtapa] = useState(1);
  const [email, setEmail] = useState(route.params?.email || '');
  const [codigoSimulado, setCodigoSimulado] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const pedirCodigo = async () => {
    setErro('');
    setEnviando(true);
    try {
      const r = await api('/auth/esqueci-senha', { metodo: 'POST', corpo: { email } });
      setCodigoSimulado(r.codigo_simulado || '');
      setEtapa(2);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const redefinir = async () => {
    setErro('');
    setEnviando(true);
    try {
      const r = await api('/auth/redefinir-senha', { metodo: 'POST', corpo: { email, codigo, novaSenha } });
      toast.sucesso(r.mensagem);
      navigation.navigate('Login');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tela rodape={false} fundoRadial>
      <View style={estilosConta.cartao}>
        <Titulo style={{ textAlign: 'center' }}>RECUPERAR SENHA</Titulo>
        {etapa === 1 ? (
          <>
            <Text style={estilosConta.sub}>Informe o e-mail da sua conta para receber um código.</Text>
            <Campo rotulo="E-MAIL" placeholder="seuemail@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address"
              autoCapitalize="none" returnKeyType="send" onSubmitEditing={pedirCodigo} />
            <MensagemErro texto={erro} />
            <Botao titulo="ENVIAR CÓDIGO" onPress={pedirCodigo} carregando={enviando} style={estilosConta.botao} />
          </>
        ) : (
          <>
            <Text style={estilosConta.sub}>Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos.</Text>
            {codigoSimulado ? (
              <View style={s.simulado} accessibilityLiveRegion="polite">
                <Text style={s.simuladoTitulo}>E-MAIL SIMULADO</Text>
                <Text style={s.simuladoTexto}>Seu código de recuperação é <Text style={s.codigo}>{codigoSimulado}</Text> (válido por 15 minutos).</Text>
              </View>
            ) : null}
            <Campo rotulo="CÓDIGO" placeholder="000000" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={6} />
            <Campo rotulo="NOVA SENHA" placeholder="Mínimo 6 caracteres" value={novaSenha} onChangeText={setNovaSenha} secureTextEntry
              returnKeyType="done" onSubmitEditing={redefinir} />
            <MensagemErro texto={erro} />
            <Botao titulo="REDEFINIR SENHA" onPress={redefinir} carregando={enviando} style={estilosConta.botao} />
          </>
        )}
        <Botao titulo="VOLTAR AO LOGIN" variante="escuro" onPress={() => navigation.navigate('Login')} style={[estilosConta.botao, { marginTop: 16 }]} />
      </View>
    </Tela>
  );
}

const s = StyleSheet.create({
  simulado: { borderWidth: 1, borderColor: cores.vermelho, borderStyle: 'dashed', padding: 12, marginBottom: 16 },
  simuladoTitulo: { color: cores.vermelhoTexto, fontFamily: fontes.corpoNegrito, fontSize: 12, marginBottom: 4 },
  simuladoTexto: { color: cores.texto, fontSize: 14, fontFamily: fontes.corpo },
  codigo: { fontFamily: fontes.corpoNegrito, fontSize: 18, letterSpacing: 2 },
});
