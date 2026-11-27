import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, MensagemErro, Titulo } from '../components/ui';
import { COR_STATUS, Esqueleto, LinhaMenu, TituloSecao, Vazio } from '../components/extras';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { cores, fontes } from '../theme';
import { moeda, ROTULO_STATUS } from '../utils/formatos';

/** Painel do administrador (Figma p. 12 ampliado): indicadores + atalhos para produtos e pedidos. */
export default function AdminScreen({ navigation }) {
  const { ehAdmin, usuario } = useAuth();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    if (!ehAdmin) return;
    api('/admin/resumo').then(setResumo).catch((e) => setErro(e.message));
  }, [ehAdmin]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (!ehAdmin) {
    return (
      <Tela>
        <Vazio icone="lock-closed-outline" titulo="ÁREA RESTRITA" texto={usuario ? 'Seu perfil não é de administrador.' : 'Entre com a conta de administrador.'}
          acao={usuario ? undefined : 'ENTRAR'} onAcao={() => navigation.navigate('Login', { voltarPara: 'Admin' })} />
      </Tela>
    );
  }

  const totalPedidos = resumo ? Object.values(resumo.por_status).reduce((a, b) => a + b, 0) : 0;

  return (
    <Tela refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={cores.vermelho} />}>
      <Titulo tamanho={44}>PAINEL DO{'\n'}ADMINISTRADOR</Titulo>
      <MensagemErro texto={erro} />

      {!resumo ? <Esqueleto altura={180} style={{ marginTop: 16 }} /> : (
        <>
          <View style={s.cards}>
            <Indicador icone="cash-outline" rotulo="Faturamento" valor={moeda(resumo.faturamento)} destaque />
            <Indicador icone="bag-check-outline" rotulo="Pedidos pagos" valor={resumo.pedidos_pagos} />
            <Indicador icone="trending-up-outline" rotulo="Ticket médio" valor={moeda(resumo.ticket_medio)} />
            <Indicador icone="people-outline" rotulo="Clientes" valor={resumo.total_clientes} />
          </View>

          <TituloSecao acao="Gerenciar" onAcao={() => navigation.navigate('AdminPedidos')}>PEDIDOS POR STATUS</TituloSecao>
          <View style={s.barraStatus}>
            {Object.entries(resumo.por_status).filter(([, q]) => q > 0).map(([st, q]) => (
              <View key={st} style={{ flex: q, backgroundColor: COR_STATUS[st] }} />
            ))}
          </View>
          <View style={s.legenda}>
            {Object.entries(resumo.por_status).map(([st, q]) => (
              <Pressable key={st} style={s.legendaItem} onPress={() => navigation.navigate('AdminPedidos', { status: st })}
                accessibilityRole="button" accessibilityLabel={`${ROTULO_STATUS[st]}: ${q} pedidos`}>
                <View style={[s.ponto, { backgroundColor: COR_STATUS[st] }]} />
                <Text style={s.legendaTexto}>{ROTULO_STATUS[st]} <Text style={{ color: cores.texto, fontFamily: fontes.corpoNegrito }}>{q}</Text></Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.nota}>{totalPedidos} pedidos no total</Text>

          {resumo.por_status.pago > 0 ? (
            <Pressable style={s.alerta} onPress={() => navigation.navigate('AdminPedidos', { status: 'pago' })} accessibilityRole="button">
              <Ionicons name="cube" size={20} color="#3D9BE8" />
              <Text style={s.alertaTexto}>{resumo.por_status.pago} pedido(s) pago(s) aguardando envio</Text>
              <Ionicons name="chevron-forward" size={16} color={cores.textoApagado} />
            </Pressable>
          ) : null}

          <TituloSecao>MAIS VENDIDOS</TituloSecao>
          {resumo.mais_vendidos.map((m, i) => (
            <View key={m.produto_id} style={s.ranking}>
              <Text style={s.posicao}>{i + 1}º</Text>
              <Text style={s.rankNome} numberOfLines={1}>{m.nome}</Text>
              <Text style={s.rankValor}>{m.unidades} un · {moeda(m.receita)}</Text>
            </View>
          ))}

          <TituloSecao acao="Ver produtos" onAcao={() => navigation.navigate('AdminProdutos')}>ESTOQUE BAIXO</TituloSecao>
          {resumo.estoque_baixo.length === 0 ? <Text style={s.nota}>Nenhum produto com 5 unidades ou menos.</Text> : null}
          {resumo.estoque_baixo.map((p) => (
            <Pressable key={p.id} style={s.ranking} onPress={() => navigation.navigate('AdminProdutoForm', { id: p.id })} accessibilityRole="button">
              <Ionicons name="warning" size={16} color={p.estoque === 0 ? cores.erro : '#E8A33D'} />
              <Text style={s.rankNome}>{p.nome}</Text>
              <Text style={[s.rankValor, { color: p.estoque === 0 ? cores.erro : '#E8A33D' }]}>{p.estoque} un</Text>
            </Pressable>
          ))}
        </>
      )}

      <View style={{ marginTop: 22 }}>
        <LinhaMenu icone="cube-outline" titulo="Produtos" subtitulo={resumo ? `${resumo.total_produtos} capacetes ativos` : ''} destaque
          onPress={() => navigation.navigate('AdminProdutos')} />
        <LinhaMenu icone="receipt-outline" titulo="Pedidos" subtitulo="Confirmar pagamento, enviar, entregar ou cancelar"
          onPress={() => navigation.navigate('AdminPedidos')} />
      </View>
      <Botao titulo="+ NOVO CAPACETE" onPress={() => navigation.navigate('AdminProdutoForm')} style={{ marginTop: 16 }} />
    </Tela>
  );
}

function Indicador({ icone, rotulo, valor, destaque }) {
  return (
    <View style={[s.card, destaque && { borderColor: cores.vermelho }]} accessibilityLabel={`${rotulo}: ${valor}`}>
      <Ionicons name={icone} size={20} color={cores.vermelho} />
      <Text style={s.cardValor} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
      <Text style={s.cardRotulo}>{rotulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 16 },
  card: { width: '48.5%', backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.linha, padding: 12, marginBottom: 10, gap: 2 },
  cardValor: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 28 },
  cardRotulo: { color: cores.textoApagado, fontSize: 12, fontFamily: fontes.corpo },
  barraStatus: { flexDirection: 'row', height: 12, borderRadius: 2, overflow: 'hidden', backgroundColor: '#222' },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  legendaTexto: { color: cores.textoSuave, fontSize: 12, fontFamily: fontes.corpo },
  nota: { color: cores.textoApagado, fontSize: 12, marginTop: 6, marginBottom: 16, fontFamily: fontes.corpo },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0E1A26', padding: 12, marginBottom: 18 },
  alertaTexto: { color: cores.texto, flex: 1, fontFamily: fontes.corpoSemi },
  ranking: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: cores.linha },
  posicao: { color: cores.vermelho, fontFamily: fontes.titulo, fontSize: 22, width: 30 },
  rankNome: { color: cores.texto, flex: 1 },
  rankValor: { color: cores.textoSuave, fontSize: 12, fontFamily: fontes.corpo },
});
