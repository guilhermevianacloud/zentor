import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, Campo, confirmar, MensagemErro, Titulo } from '../components/ui';
import { Esqueleto, Vazio } from '../components/extras';
import { api } from '../config/api';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { mascaraCep, soDigitos } from '../utils/formatos';

const VAZIO = { apelido: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };

/** Endereços salvos: listar, cadastrar, editar, definir principal e excluir. */
export default function EnderecosScreen() {
  const toast = useToast();
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(null); // null = fechado; { ...dados, id? }
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => api('/enderecos').then(setLista).catch((e) => setErro(e.message)), []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  // CEP → ViaCEP preenche rua, bairro, cidade e estado.
  const cep = soDigitos(form?.cep);
  useEffect(() => {
    if (cep.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json()).then((d) => {
      if (d.erro) return;
      setForm((f) => f && ({ ...f, endereco: d.logradouro || f.endereco, bairro: d.bairro || f.bairro, cidade: d.localidade || f.cidade, estado: d.uf || f.estado }));
    }).catch(() => {});
  }, [cep]);

  const salvar = async () => {
    setSalvando(true); setErro(''); setErros({});
    try {
      const corpo = { ...form, apelido: form.apelido || 'Casa' };
      if (form.id) await api(`/enderecos/${form.id}`, { metodo: 'PUT', corpo });
      else await api('/enderecos', { metodo: 'POST', corpo });
      toast.sucesso(form.id ? 'Endereço atualizado.' : 'Endereço salvo.');
      setForm(null);
      carregar();
    } catch (e) {
      setErro(e.message); setErros(e.campos || {});
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (e) => {
    if (!(await confirmar('Excluir endereço', `Excluir o endereço "${e.apelido}"?`))) return;
    await api(`/enderecos/${e.id}`, { metodo: 'DELETE' }).catch((err) => toast.erro(err.message));
    toast.info('Endereço excluído.');
    carregar();
  };

  const principal = async (e) => {
    await api(`/enderecos/${e.id}`, { metodo: 'PUT', corpo: { principal: true } });
    toast.sucesso(`"${e.apelido}" agora é o endereço principal.`);
    carregar();
  };

  const muda = (campo, mascara) => (v) => setForm((f) => ({ ...f, [campo]: mascara ? mascara(v) : v }));

  if (form) {
    return (
      <Tela>
        <Titulo tamanho={36} style={{ marginBottom: 12 }}>{form.id ? 'EDITAR ENDEREÇO' : 'NOVO ENDEREÇO'}</Titulo>
        <Campo rotulo="NOME DO ENDEREÇO" rotuloTamanho={18} placeholder="Casa, Trabalho..." value={form.apelido} onChangeText={muda('apelido')} />
        <Campo rotulo="CEP" rotuloTamanho={18} placeholder="00000-000" value={mascaraCep(form.cep)} onChangeText={muda('cep', mascaraCep)} erro={erros.cep} keyboardType="number-pad" />
        <Campo rotulo="ENDEREÇO" rotuloTamanho={18} value={form.endereco} onChangeText={muda('endereco')} erro={erros.endereco} />
        <View style={s.linha}>
          <Campo style={{ flex: 1 }} rotulo="NÚMERO" rotuloTamanho={18} value={form.numero} onChangeText={muda('numero')} erro={erros.numero} />
          <Campo style={{ flex: 1 }} rotulo="COMPLEMENTO" rotuloTamanho={18} value={form.complemento} onChangeText={muda('complemento')} />
        </View>
        <Campo rotulo="BAIRRO" rotuloTamanho={18} value={form.bairro} onChangeText={muda('bairro')} />
        <View style={s.linha}>
          <Campo style={{ flex: 2 }} rotulo="CIDADE" rotuloTamanho={18} value={form.cidade} onChangeText={muda('cidade')} erro={erros.cidade} />
          <Campo style={{ flex: 1 }} rotulo="UF" rotuloTamanho={18} value={form.estado} onChangeText={(v) => setForm((f) => ({ ...f, estado: v.toUpperCase().slice(0, 2) }))} erro={erros.estado} />
        </View>
        <MensagemErro texto={erro} />
        <Botao titulo="SALVAR ENDEREÇO" onPress={salvar} carregando={salvando} />
        <Botao titulo="CANCELAR" variante="escuro" onPress={() => setForm(null)} style={{ marginTop: 10 }} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Titulo tamanho={40}>MEUS ENDEREÇOS</Titulo>
      <MensagemErro texto={erro} />
      {lista === null && !erro ? <Esqueleto altura={90} style={{ marginTop: 14 }} /> : null}
      {lista?.length === 0 ? <Vazio icone="location-outline" titulo="NENHUM ENDEREÇO" texto="Cadastre um endereço para agilizar suas compras." /> : null}
      {lista?.map((e) => (
        <View key={e.id} style={[s.card, e.principal && { borderColor: cores.vermelho }]}>
          <View style={s.topo}>
            <Text style={s.apelido}>{e.apelido}</Text>
            {e.principal ? <Text style={s.principal}>PRINCIPAL</Text> : null}
          </View>
          <Text style={s.texto}>{e.endereco}, {e.numero}{e.complemento ? ` – ${e.complemento}` : ''}</Text>
          <Text style={s.texto}>{e.bairro ? `${e.bairro} · ` : ''}{e.cidade}/{e.estado} · CEP {mascaraCep(e.cep)}</Text>
          <View style={s.acoes}>
            <Acao icone="create-outline" rotulo="Editar" onPress={() => setForm({ ...e })} />
            {!e.principal ? <Acao icone="star-outline" rotulo="Tornar principal" onPress={() => principal(e)} /> : null}
            <Acao icone="trash-outline" rotulo="Excluir" onPress={() => excluir(e)} />
          </View>
        </View>
      ))}
      <Botao titulo="+ NOVO ENDEREÇO" onPress={() => setForm({ ...VAZIO })} style={{ marginTop: 16 }} />
    </Tela>
  );
}

function Acao({ icone, rotulo, onPress }) {
  return (
    <Pressable onPress={onPress} style={s.acao} accessibilityRole="button" accessibilityLabel={rotulo} hitSlop={6}>
      <Ionicons name={icone} size={15} color={cores.vermelho} />
      <Text style={s.acaoTexto}>{rotulo}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 10 },
  card: { backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.linha, padding: 14, marginTop: 14 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  apelido: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 15 },
  principal: { color: cores.vermelhoTexto, fontSize: 11, fontFamily: fontes.corpoNegrito },
  texto: { color: cores.textoSuave, fontSize: 13, fontFamily: fontes.corpo },
  acoes: { flexDirection: 'row', gap: 18, marginTop: 10 },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  acaoTexto: { color: cores.vermelhoTexto, fontSize: 13, fontFamily: fontes.corpoNegrito },
});
