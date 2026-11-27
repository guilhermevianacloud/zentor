import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Tela from '../components/Tela';
import { Chip, confirmar, MensagemErro, Titulo } from '../components/ui';
import { Esqueleto, SeloStatus, Vazio } from '../components/extras';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { dataHora, moeda, ROTULO_PAGAMENTO, ROTULO_STATUS } from '../utils/formatos';

const ACOES = {
  pagar: { rotulo: 'CONFIRMAR PAGAMENTO', cor: '#3D9BE8' },
  enviar: { rotulo: 'MARCAR COMO ENVIADO', cor: '#9B59B6' },
  entregar: { rotulo: 'MARCAR COMO ENTREGUE', cor: cores.sucesso },
  cancelar: { rotulo: 'CANCELAR', cor: '#555' },
};

/**
 * Gestão de pedidos. Os botões mostrados vêm da API (padrão State):
 * cada status só oferece as ações permitidas para ele.
 */
export default function AdminPedidosScreen({ route, navigation }) {
  const { ehAdmin } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState(route.params?.status || null);
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState('');
  const [agindo, setAgindo] = useState(null);

  const carregar = useCallback(() => {
    api(`/admin/pedidos${status ? `?status=${status}` : ''}`).then(setPedidos).catch((e) => setErro(e.message));
  }, [status]);
  useFocusEffect(useCallback(() => { if (ehAdmin) carregar(); }, [ehAdmin, carregar]));

  if (!ehAdmin) return <Tela><MensagemErro texto="Acesso restrito ao administrador." /></Tela>;

  const executar = async (pedido, acao) => {
    if (acao === 'cancelar' && !(await confirmar('Cancelar pedido', `Cancelar o pedido nº ${pedido.id}? Os itens voltam ao estoque.`))) return;
    setAgindo(`${pedido.id}-${acao}`);
    try {
      const r = await api(`/admin/pedidos/${pedido.id}/acao`, { metodo: 'POST', corpo: { acao } });
      toast.sucesso(`Pedido nº ${r.id}: ${ROTULO_STATUS[r.status].toLowerCase()}${r.codigo_rastreio && acao === 'enviar' ? ` (rastreio ${r.codigo_rastreio})` : ''}.`);
      carregar();
    } catch (e) {
      toast.erro(e.message);
    } finally {
      setAgindo(null);
    }
  };

  return (
    <Tela refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={cores.vermelho} />}>
      <Titulo tamanho={44}>PEDIDOS</Titulo>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginVertical: 12 }} contentContainerStyle={{ alignItems: 'flex-start' }}>
        <Chip rotulo="Todos" ativo={!status} onPress={() => { setStatus(null); setPedidos(null); }} />
        {Object.entries(ROTULO_STATUS).map(([v, r]) => (
          <Chip key={v} rotulo={r} ativo={status === v} onPress={() => { setStatus(v); setPedidos(null); }} />
        ))}
      </ScrollView>
      <MensagemErro texto={erro} />
      {pedidos === null ? [1, 2].map((i) => <Esqueleto key={i} altura={150} style={{ marginBottom: 14 }} />) : null}
      {pedidos?.length === 0 ? <Vazio icone="file-tray-outline" titulo="NENHUM PEDIDO" texto="Nenhum pedido com esse status." /> : null}
      {pedidos?.map((p) => (
        <View key={p.id} style={s.card}>
          <Pressable onPress={() => navigation.navigate('Pedido', { id: p.id })} accessibilityRole="link" accessibilityLabel={`Ver detalhe do pedido ${p.id}`}>
            <View style={s.topo}>
              <Text style={s.numero}>Nº {p.id} · {p.cliente}</Text>
              <SeloStatus status={p.status} rotulo={ROTULO_STATUS[p.status]} />
            </View>
            <Text style={s.texto}>{dataHora(p.criado_em)} · {ROTULO_PAGAMENTO[p.forma_pagamento]}{p.cupom ? ` · cupom ${p.cupom}` : ''}</Text>
            {p.itens.map((i) => <Text key={i.id} style={s.item}>{i.quantidade}x {i.nome_produto} ({i.tamanho})</Text>)}
            <Text style={s.texto}>Entrega: {p.cidade}/{p.estado}{p.codigo_rastreio ? ` · rastreio ${p.codigo_rastreio}` : ''}</Text>
            <Text style={s.total}>{moeda(p.total)}</Text>
          </Pressable>
          {p.acoes.length ? (
            <View style={s.acoes}>
              {p.acoes.map((a) => (
                <Pressable key={a} onPress={() => executar(p, a)} disabled={!!agindo}
                  style={[s.acao, { backgroundColor: ACOES[a].cor }, agindo === `${p.id}-${a}` && { opacity: 0.5 }]} accessibilityRole="button"
                  accessibilityLabel={`${ACOES[a].rotulo} pedido ${p.id}`}>
                  <Text style={s.acaoTexto}>{agindo === `${p.id}-${a}` ? 'AGUARDE...' : ACOES[a].rotulo}</Text>
                </Pressable>
              ))}
            </View>
          ) : <Text style={s.final}>Pedido finalizado — nenhuma ação disponível.</Text>}
        </View>
      ))}
    </Tela>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: cores.fundoCard, borderWidth: 1, borderColor: cores.linha, padding: 14, marginBottom: 14 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  numero: { color: cores.texto, fontFamily: fontes.corpoNegrito, flex: 1 },
  texto: { color: cores.textoApagado, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  item: { color: cores.textoSuave, fontSize: 13, marginTop: 4, fontFamily: fontes.corpo },
  total: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 22, marginTop: 6 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  acao: { paddingHorizontal: 10, paddingVertical: 8 },
  acaoTexto: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 16 },
  final: { color: cores.textoApagado, fontSize: 12, marginTop: 10, fontStyle: 'italic', fontFamily: fontes.corpo },
});
