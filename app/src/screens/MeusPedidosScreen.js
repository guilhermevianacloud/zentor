import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { MensagemErro, Titulo } from '../components/ui';
import { Esqueleto, SeloStatus, Vazio } from '../components/extras';
import { api, urlImagem } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { cores, fontes } from '../theme';
import { dataCurta, moeda, ROTULO_PAGAMENTO, ROTULO_STATUS } from '../utils/formatos';

/** Lista de pedidos do cliente; cada card abre o detalhe com a linha do tempo. */
export default function MeusPedidosScreen({ navigation }) {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    if (!usuario) return;
    api('/pedidos/meus').then(setPedidos).catch((e) => setErro(e.message));
  }, [usuario]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (!usuario) {
    return (
      <Tela>
        <Vazio icone="receipt-outline" titulo="MEUS PEDIDOS" texto="Entre na sua conta para acompanhar seus pedidos."
          acao="ENTRAR" onAcao={() => navigation.navigate('Login', { voltarPara: 'MeusPedidos' })} />
      </Tela>
    );
  }

  return (
    <Tela refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={cores.vermelho} />}>
      <Titulo tamanho={44}>MEUS PEDIDOS</Titulo>
      <MensagemErro texto={erro} />
      {pedidos === null && !erro ? [1, 2, 3].map((i) => <Esqueleto key={i} altura={110} style={{ marginTop: 14 }} />) : null}
      {pedidos?.length === 0 ? (
        <Vazio icone="bag-handle-outline" titulo="NENHUM PEDIDO AINDA" texto="Quando você comprar, seus pedidos aparecem aqui."
          acao="VER CAPACETES" onAcao={() => navigation.navigate('Abas', { screen: 'Catalogo' })} />
      ) : null}
      {pedidos?.map((p) => (
        <Pressable key={p.id} style={({ pressed }) => [s.card, pressed && { borderColor: cores.vermelho }]} onPress={() => navigation.navigate('Pedido', { id: p.id })}
          accessibilityRole="button" accessibilityLabel={`Pedido ${p.id}, ${ROTULO_STATUS[p.status]}, total ${moeda(p.total)}. Ver detalhes`}>
          <View style={s.topo}>
            <View>
              <Text style={s.numero}>PEDIDO Nº {p.id}</Text>
              <Text style={s.data}>{dataCurta(p.criado_em)} · {ROTULO_PAGAMENTO[p.forma_pagamento]}</Text>
            </View>
            <SeloStatus status={p.status} rotulo={ROTULO_STATUS[p.status]} />
          </View>
          <View style={s.fotos}>
            {p.itens.slice(0, 4).map((i) => (
              <Image key={i.id} source={{ uri: urlImagem(i.imagem) }} style={s.foto} resizeMode="contain" />
            ))}
            <View style={{ flex: 1 }}>
              <Text style={s.texto} numberOfLines={2}>{p.itens.map((i) => `${i.quantidade}x ${i.nome_produto}`).join(', ')}</Text>
            </View>
          </View>
          <View style={s.rodape}>
            <Text style={s.total}>{moeda(p.total)}</Text>
            <Text style={s.ver}>
              {p.status === 'aguardando_pagamento' ? 'Concluir pagamento' : 'Ver detalhes'} <Ionicons name="chevron-forward" size={12} />
            </Text>
          </View>
        </Pressable>
      ))}
    </Tela>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.linha, padding: 14, marginTop: 14 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  numero: { color: cores.texto, fontFamily: fontes.corpoNegrito },
  data: { color: cores.textoApagado, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  fotos: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  foto: { width: 48, height: 48, backgroundColor: '#1C1C1C' },
  texto: { color: cores.textoSuave, fontSize: 13, fontFamily: fontes.corpo },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 22 },
  ver: { color: cores.vermelhoTexto, fontFamily: fontes.corpoNegrito, fontSize: 13 },
});
