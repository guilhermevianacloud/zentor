import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tela from '../components/Tela';
import { Botao, Campo, MensagemErro, Titulo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { mascaraCpf, mascaraTelefone, soDigitos } from '../utils/formatos';

/** Editar nome, sobrenome e telefone. E-mail e CPF identificam a conta e não mudam. */
export default function EditarPerfilScreen({ navigation }) {
  const { usuario, atualizarPerfil } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ nome: usuario?.nome || '', sobrenome: usuario?.sobrenome || '', telefone: mascaraTelefone(usuario?.telefone || '') });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const e = {};
    if (!f.nome.trim()) e.nome = 'Informe o nome.';
    if (!f.sobrenome.trim()) e.sobrenome = 'Informe o sobrenome.';
    if (soDigitos(f.telefone).length < 10) e.telefone = 'Telefone com DDD.';
    setErros(e);
    if (Object.keys(e).length) return;
    setSalvando(true); setErro('');
    try {
      await atualizarPerfil({ ...f, telefone: soDigitos(f.telefone) });
      toast.sucesso('Dados atualizados.');
      navigation.goBack();
    } catch (err) {
      setErro(err.message); setErros(err.campos || {});
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Tela>
      <Titulo tamanho={40}>DADOS PESSOAIS</Titulo>
      <View style={s.fixos}>
        <Text style={s.fixo}>E-mail: {usuario?.email}</Text>
        <Text style={s.fixo}>CPF: {mascaraCpf(usuario?.cpf || '')}</Text>
        <Text style={s.nota}>E-mail e CPF identificam a conta e não podem ser alterados.</Text>
      </View>
      <Campo rotulo="NOME" value={f.nome} onChangeText={(v) => setF({ ...f, nome: v })} erro={erros.nome} autoComplete="given-name" />
      <Campo rotulo="SOBRENOME" value={f.sobrenome} onChangeText={(v) => setF({ ...f, sobrenome: v })} erro={erros.sobrenome} autoComplete="family-name" />
      <Campo rotulo="TELEFONE" value={f.telefone} onChangeText={(v) => setF({ ...f, telefone: mascaraTelefone(v) })} erro={erros.telefone}
        keyboardType="phone-pad" returnKeyType="done" onSubmitEditing={salvar} />
      <MensagemErro texto={erro} />
      <Botao titulo="SALVAR" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}

const s = StyleSheet.create({
  fixos: { backgroundColor: cores.fundoCard, padding: 12, marginVertical: 14 },
  fixo: { color: cores.texto, fontSize: 14, fontFamily: fontes.corpo },
  nota: { color: cores.textoApagado, fontSize: 11, marginTop: 4, fontFamily: fontes.corpo },
});
