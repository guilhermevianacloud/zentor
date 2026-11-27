import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Tela from '../components/Tela';
import { Botao, confirmar, Titulo } from '../components/ui';
import { LinhaMenu, Vazio } from '../components/extras';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useFavoritos } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { mascaraCpf, mascaraTelefone } from '../utils/formatos';

/** Aba "Conta": perfil e atalhos para pedidos, favoritos, endereços, senha, ajuda e (admin) painel. */
export default function ContaScreen({ navigation }) {
  const { usuario, ehAdmin, sair } = useAuth();
  const { ids } = useFavoritos();
  const toast = useToast();
  const [pedidos, setPedidos] = useState(null);
  const [enderecos, setEnderecos] = useState(null);

  useFocusEffect(useCallback(() => {
    if (!usuario) return;
    api('/pedidos/meus').then(setPedidos).catch(() => {});
    api('/enderecos').then(setEnderecos).catch(() => {});
  }, [usuario]));

  if (!usuario) {
    return (
      <Tela rodape>
        <Titulo tamanho={44}>MINHA CONTA</Titulo>
        <Vazio icone="person-circle-outline" titulo="BEM-VINDO À ZENTOR" texto="Entre para comprar, acompanhar pedidos, salvar favoritos e endereços."
          acao="ENTRAR" onAcao={() => navigation.navigate('Login')} />
        <Botao titulo="CRIAR CONTA" variante="escuro" onPress={() => navigation.navigate('Cadastro')} tamanhoFonte={22} style={{ marginHorizontal: 20 }} />
        <View style={{ marginTop: 24 }}>
          <LinhaMenu icone="help-circle-outline" titulo="Perguntas frequentes" onPress={() => navigation.navigate('Faq')} />
          <LinhaMenu icone="information-circle-outline" titulo="Sobre a Zentor" onPress={() => navigation.navigate('Sobre')} />
        </View>
      </Tela>
    );
  }

  const pendentes = (pedidos || []).filter((p) => p.status === 'aguardando_pagamento').length;
  const emAndamento = (pedidos || []).filter((p) => ['pago', 'enviado'].includes(p.status)).length;

  const fazerLogout = async () => {
    if (!(await confirmar('Sair', 'Deseja sair da sua conta?'))) return;
    await sair();
    toast.info('Você saiu da conta.');
    navigation.navigate('Abas', { screen: 'Home' });
  };

  return (
    <Tela rodape>
      <View style={s.perfil}>
        <View style={s.avatar}><Text style={s.iniciais}>{usuario.nome[0]}{usuario.sobrenome[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.nome}>{usuario.nome} {usuario.sobrenome}</Text>
          <Text style={s.dado}>{usuario.email}</Text>
          <Text style={s.dado}>{mascaraTelefone(usuario.telefone)} · CPF {mascaraCpf(usuario.cpf).replace(/^\d{3}\.\d{3}/, '***.***')}</Text>
          {ehAdmin ? <Text style={s.admin}>ADMINISTRADOR</Text> : null}
        </View>
      </View>

      <View style={s.numeros}>
        <Numero valor={pedidos ? pedidos.length : '–'} rotulo="Pedidos" />
        <Numero valor={pedidos ? emAndamento : '–'} rotulo="Em andamento" />
        <Numero valor={ids.length} rotulo="Favoritos" />
      </View>

      {ehAdmin ? (
        <LinhaMenu icone="speedometer-outline" titulo="Painel do administrador" subtitulo="Indicadores, produtos e pedidos" destaque
          onPress={() => navigation.navigate('Admin')} />
      ) : null}
      <LinhaMenu icone="receipt-outline" titulo="Meus pedidos"
        subtitulo={pendentes ? `${pendentes} aguardando pagamento` : 'Acompanhe status e rastreio'} onPress={() => navigation.navigate('MeusPedidos')}
        direita={pendentes ? <View style={s.badge}><Text style={s.badgeTexto}>{pendentes}</Text></View> : null} />
      <LinhaMenu icone="heart-outline" titulo="Favoritos" subtitulo={`${ids.length} capacete(s) salvo(s)`} onPress={() => navigation.navigate('Abas', { screen: 'Favoritos' })} />
      <LinhaMenu icone="location-outline" titulo="Meus endereços" subtitulo={enderecos ? `${enderecos.length} cadastrado(s)` : ''}
        onPress={() => navigation.navigate('Enderecos')} />
      <LinhaMenu icone="create-outline" titulo="Editar dados pessoais" subtitulo="Nome e telefone" onPress={() => navigation.navigate('EditarPerfil')} />
      <LinhaMenu icone="key-outline" titulo="Alterar senha" onPress={() => navigation.navigate('AlterarSenha')} />
      <LinhaMenu icone="help-circle-outline" titulo="Perguntas frequentes" onPress={() => navigation.navigate('Faq')} />
      <LinhaMenu icone="information-circle-outline" titulo="Sobre a Zentor" onPress={() => navigation.navigate('Sobre')} />

      <Botao titulo="SAIR DA CONTA" variante="escuro" onPress={fazerLogout} style={{ marginTop: 22 }} tamanhoFonte={20} />
    </Tela>
  );
}

function Numero({ valor, rotulo }) {
  return (
    <View style={s.numero} accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={s.numeroValor}>{valor}</Text>
      <Text style={s.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: cores.fundoCard, padding: 16, borderLeftWidth: 4, borderLeftColor: cores.vermelho },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: cores.vermelho, alignItems: 'center', justifyContent: 'center' },
  iniciais: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 28 },
  nome: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 26 },
  dado: { color: cores.textoSuave, fontSize: 12, marginTop: 1, fontFamily: fontes.corpo },
  admin: { color: cores.vermelhoTexto, fontSize: 11, fontFamily: fontes.corpoNegrito, marginTop: 4, letterSpacing: 1 },
  numeros: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  numero: { flex: 1, backgroundColor: cores.fundoCard, paddingVertical: 12, alignItems: 'center' },
  numeroValor: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 30 },
  numeroRotulo: { color: cores.textoApagado, fontSize: 11, fontFamily: fontes.corpo },
  badge: { backgroundColor: '#E8A33D', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeTexto: { color: '#000', fontSize: 11, fontFamily: fontes.corpoNegrito },
});
