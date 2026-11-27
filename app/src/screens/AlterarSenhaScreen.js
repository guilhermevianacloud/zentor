import { useState } from 'react';
import Tela from '../components/Tela';
import { Botao, Campo, MensagemErro, Titulo } from '../components/ui';
import { api } from '../config/api';
import { useToast } from '../context/ToastContext';

/** Troca de senha (exige a senha atual). */
export default function AlterarSenhaScreen({ navigation }) {
  const toast = useToast();
  const [f, setF] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const e = {};
    if (!f.senhaAtual) e.senhaAtual = 'Informe a senha atual.';
    if (f.novaSenha.length < 6) e.novaSenha = 'Mínimo de 6 caracteres.';
    if (f.novaSenha === f.senhaAtual && f.novaSenha) e.novaSenha = 'A nova senha deve ser diferente da atual.';
    if (f.confirmar !== f.novaSenha) e.confirmar = 'As senhas não conferem.';
    setErros(e);
    if (Object.keys(e).length) return;
    setSalvando(true); setErro('');
    try {
      const r = await api('/auth/senha', { metodo: 'PUT', corpo: { senhaAtual: f.senhaAtual, novaSenha: f.novaSenha } });
      toast.sucesso(r.mensagem);
      navigation.goBack();
    } catch (err) {
      setErro(err.message); setErros(err.campos || {});
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Tela>
      <Titulo tamanho={40} style={{ marginBottom: 14 }}>ALTERAR SENHA</Titulo>
      <Campo rotulo="SENHA ATUAL" value={f.senhaAtual} onChangeText={(v) => setF({ ...f, senhaAtual: v })} erro={erros.senhaAtual} secureTextEntry autoComplete="current-password" />
      <Campo rotulo="NOVA SENHA" value={f.novaSenha} onChangeText={(v) => setF({ ...f, novaSenha: v })} erro={erros.novaSenha} secureTextEntry autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
      <Campo rotulo="CONFIRMAR NOVA SENHA" value={f.confirmar} onChangeText={(v) => setF({ ...f, confirmar: v })} erro={erros.confirmar} secureTextEntry
        returnKeyType="done" onSubmitEditing={salvar} />
      <MensagemErro texto={erro} />
      <Botao titulo="ALTERAR SENHA" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}
