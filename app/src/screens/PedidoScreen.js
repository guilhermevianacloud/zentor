import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Tela from '../components/Tela';
import { Botao, confirmar, MensagemErro, Titulo } from '../components/ui';
import { Esqueleto, SeloStatus } from '../components/extras';
import { api, urlImagem } from '../config/api';
import { useToast } from '../context/ToastContext';
import { cores, fontes } from '../theme';
import { dataHora, mascaraCep, moeda, ROTULO_PAGAMENTO, ROTULO_STATUS } from '../utils/formatos';
import { ResumoPedido } from './CarrinhoScreen';
import { abrirPagamento } from '../utils/mercadoPago';

const ETAPAS = [
  { status: 'aguardando_pagamento', rotulo: 'Pedido recebido', icone: 'receipt-outline' },
  { status: 'pago', rotulo: 'Pagamento aprovado', icone: 'card-outline' },
  { status: 'enviado', rotulo: 'Enviado', icone: 'cube-outline' },
  { status: 'entregue', rotulo: 'Entregue', icone: 'home-outline' },
];

/** Detalhe do pedido: status (padrão State no backend), linha do tempo, pagamento, itens e endereço. */
export default function PedidoScreen({ route, navigation }) {
  const { id, novo } = route.params;
  const toast = useToast();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState('');
  const [agindo, setAgindo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setPedido(await api(`/pedidos/${id}`));
    } catch (e) {
      setErro(e.message);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  // Mercado Pago: quando a pessoa volta da página de pagamento para o app (ou para esta aba),
  // a loja confere sozinha se o pagamento já foi aprovado.
  const pendenteMp = pedido?.status === 'aguardando_pagamento' && !!pedido?.mp_checkout_url;
  const verificandoRef = useRef(false);
  const verificarMp = useCallback(async ({ silencioso = false } = {}) => {
    if (verificandoRef.current) return;
    verificandoRef.current = true;
    if (!silencioso) setAgindo(true);
    try {
      const atualizado = await api(`/pedidos/${id}/mercadopago/verificar`, { metodo: 'POST' });
      if (atualizado.status === 'pago') toast.sucesso('Pagamento aprovado pelo Mercado Pago! Seu pedido já está sendo preparado.');
      else if (!silencioso) toast.info?.('Ainda não recebemos a confirmação do Mercado Pago. Se você acabou de pagar, aguarde alguns segundos.');
      await carregar();
    } catch (e) {
      if (!silencioso) toast.erro(e.message);
    } finally {
      verificandoRef.current = false;
      setAgindo(false);
    }
  }, [id, carregar, toast]);

  useEffect(() => {
    if (!pendenteMp) return undefined;
    const sub = AppState.addEventListener('change', (estado) => { if (estado === 'active') verificarMp({ silencioso: true }); });
    return () => sub.remove();
  }, [pendenteMp, verificarMp]);

  if (erro) return <Tela><MensagemErro texto={erro} /></Tela>;
  if (!pedido) {
    return (
      <Tela>
        <Esqueleto altura={40} style={{ width: '60%' }} />
        <Esqueleto altura={90} style={{ marginTop: 16 }} />
        <Esqueleto altura={200} style={{ marginTop: 16 }} />
      </Tela>
    );
  }

  const cancelado = pedido.status === 'cancelado';
  const indice = ETAPAS.findIndex((e) => e.status === pedido.status);
  const quando = (status) => pedido.historico.find((h) => h.status === status)?.criado_em;

  const acao = async (tipo) => {
    if (tipo === 'cancelar' && !(await confirmar('Cancelar pedido', `Cancelar o pedido nº ${pedido.id}? Os itens voltam ao estoque.`))) return;
    setAgindo(true);
    try {
      await api(`/pedidos/${pedido.id}/${tipo}`, { metodo: 'POST' });
      toast.sucesso(tipo === 'pagar' ? 'Pagamento confirmado! Seu pedido já está sendo preparado.' : 'Pedido cancelado.');
      await carregar();
    } catch (e) {
      toast.erro(e.message);
    } finally {
      setAgindo(false);
    }
  };

  const copiar = async (texto, oque) => {
    await Clipboard.setStringAsync(texto);
    toast.sucesso(`${oque} copiado.`);
  };

  return (
    <Tela refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={cores.vermelho} />}>
      {novo ? (
        <View style={s.sucesso} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={44} color={cores.sucesso} />
          <View style={{ flex: 1 }}>
            <Text style={s.sucessoTitulo}>PEDIDO CONFIRMADO!</Text>
            <Text style={s.texto}>
              {pedido.status === 'pago' ? 'Pagamento aprovado. Vamos preparar o envio.' : 'Agora é só concluir o pagamento abaixo.'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={s.topo}>
        <Titulo tamanho={36}>PEDIDO Nº {pedido.id}</Titulo>
        <SeloStatus status={pedido.status} rotulo={ROTULO_STATUS[pedido.status]} />
      </View>
      <Text style={s.data}>Feito em {dataHora(pedido.criado_em)}</Text>

      {/* Linha do tempo */}
      {cancelado ? (
        <View style={s.cancelado}>
          <Ionicons name="close-circle" size={22} color="#999" />
          <Text style={s.texto}>Pedido cancelado em {dataHora(quando('cancelado'))}. Os itens voltaram ao estoque.</Text>
        </View>
      ) : (
        <View style={s.timeline} accessibilityLabel={`Status: ${ROTULO_STATUS[pedido.status]}`}>
          {ETAPAS.map((e, i) => {
            const feito = i <= indice;
            return (
              <View key={e.status} style={s.passo}>
                <View style={s.passoEsquerda}>
                  <View style={[s.bola, feito && s.bolaFeita]}>
                    <Ionicons name={feito ? 'checkmark' : e.icone} size={14} color={feito ? cores.texto : '#666'} />
                  </View>
                  {i < ETAPAS.length - 1 ? <View style={[s.trilho, i < indice && { backgroundColor: cores.vermelho }]} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={[s.passoTexto, !feito && { color: '#666' }]}>{e.rotulo}</Text>
                  {feito && quando(e.status) ? <Text style={s.passoData}>{dataHora(quando(e.status))}</Text> : null}
                  {e.status === 'enviado' && pedido.codigo_rastreio ? (
                    <Pressable onPress={() => copiar(pedido.codigo_rastreio, 'Código de rastreio')} accessibilityRole="button"
                      accessibilityLabel={`Código de rastreio ${pedido.codigo_rastreio}. Toque para copiar`}>
                      <Text style={s.rastreio}>Rastreio: {pedido.codigo_rastreio} <Ionicons name="copy-outline" size={12} /></Text>
                    </Pressable>
                  ) : null}
                  {e.status === 'entregue' && !feito && pedido.status !== 'aguardando_pagamento' ? (
                    <Text style={s.passoData}>Previsão: até {pedido.prazo_dias} dias úteis após o pagamento</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Pagamento pendente no Mercado Pago */}
      {pendenteMp ? (
        <View style={s.caixaPagamento}>
          <Text style={s.caixaTitulo}>PAGAMENTO NO MERCADO PAGO</Text>
          <Text style={s.texto}>
            {pedido.forma_pagamento === 'pix' ? 'Pague com Pix pelo QR Code ou pelo código copia e cola, na página do Mercado Pago.'
              : pedido.forma_pagamento === 'boleto' ? 'Gere o boleto na página do Mercado Pago e pague até o vencimento.'
                : 'Digite os dados do cartão na página segura do Mercado Pago.'}
            {' '}Quando voltar, conferimos o pagamento automaticamente.
          </Text>
          <Text style={s.valorPagar}>{moeda(pedido.total)}</Text>
          <Botao titulo="PAGAR NO MERCADO PAGO" onPress={() => abrirPagamento(pedido.mp_checkout_url)} tamanhoFonte={20}
            rotuloAcessivel="Abrir a página de pagamento do Mercado Pago" />
          <Botao titulo="JÁ PAGUEI, VERIFICAR" variante="contorno" onPress={() => verificarMp()} carregando={agindo} tamanhoFonte={20} style={{ marginTop: 8 }} />
          {pedido.mp_status === 'rejected' ? (
            <Text style={[s.simulado, { color: cores.erro }]} accessibilityLiveRegion="polite">O último pagamento foi recusado. Nenhum valor foi cobrado; tente de novo ou use outro meio.</Text>
          ) : null}
        </View>
      ) : null}

      {/* Pagamento pendente simulado: Pix ou boleto */}
      {!pendenteMp && pedido.status === 'aguardando_pagamento' && pedido.forma_pagamento === 'pix' ? (
        <View style={s.caixaPagamento}>
          <Text style={s.caixaTitulo}>PAGUE COM PIX</Text>
          <Text style={s.texto}>Abra o app do seu banco, escolha Pix e leia o QR Code ou use o código copia e cola.</Text>
          {pedido.qr_code ? (
            <Image source={{ uri: pedido.qr_code }} style={s.qr} accessibilityLabel="QR Code do Pix" />
          ) : null}
          <Text style={s.valorPagar}>{moeda(pedido.total)}</Text>
          <Text style={s.codigo} numberOfLines={2}>{pedido.codigo_pagamento}</Text>
          <Botao titulo="COPIAR CÓDIGO PIX" variante="contorno" onPress={() => copiar(pedido.codigo_pagamento, 'Código Pix')} tamanhoFonte={20} />
          <Botao titulo="JÁ PAGUEI (SIMULAR PAGAMENTO)" onPress={() => acao('pagar')} carregando={agindo} tamanhoFonte={20} style={{ marginTop: 8 }} />
          <Text style={s.simulado}>Simulação: nenhum pagamento real é feito. O botão acima confirma o pagamento.</Text>
        </View>
      ) : null}
      {!pendenteMp && pedido.status === 'aguardando_pagamento' && pedido.forma_pagamento === 'boleto' ? (
        <View style={s.caixaPagamento}>
          <Text style={s.caixaTitulo}>BOLETO BANCÁRIO</Text>
          <Text style={s.texto}>Pague no app do banco ou na lotérica até o vencimento (3 dias úteis).</Text>
          <Text style={s.valorPagar}>{moeda(pedido.total)}</Text>
          <Text style={[s.codigo, { fontSize: 13, letterSpacing: 0.5 }]} selectable>{pedido.codigo_pagamento}</Text>
          <Botao titulo="COPIAR LINHA DIGITÁVEL" variante="contorno" onPress={() => copiar(pedido.codigo_pagamento, 'Linha digitável')} tamanhoFonte={20} />
          <Botao titulo="SIMULAR PAGAMENTO DO BOLETO" onPress={() => acao('pagar')} carregando={agindo} tamanhoFonte={20} style={{ marginTop: 8 }} />
          <Text style={s.simulado}>Simulação: nenhum pagamento real é feito.</Text>
        </View>
      ) : null}

      {/* Itens */}
      <Text style={s.secao}>ITENS</Text>
      {pedido.itens.map((i) => (
        <Pressable key={i.id} style={s.item} onPress={() => navigation.navigate('Produto', { id: i.produto_id })}
          accessibilityRole="link" accessibilityLabel={`${i.quantidade} ${i.nome_produto}, tamanho ${i.tamanho}. Ver produto`}>
          <Image source={{ uri: urlImagem(i.imagem) }} style={s.foto} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={s.itemNome}>{i.nome_produto}</Text>
            <Text style={s.texto}>Tamanho {i.tamanho} · {i.quantidade}x {moeda(i.preco_unitario)}</Text>
            {pedido.status === 'entregue' ? <Text style={s.avaliar}><Ionicons name="star-outline" size={12} /> Avaliar este capacete</Text> : null}
          </View>
          <Text style={s.itemPreco}>{moeda(i.preco_unitario * i.quantidade)}</Text>
        </Pressable>
      ))}

      <ResumoPedido subtotal={pedido.subtotal} frete={pedido.frete} descontoCupom={pedido.desconto_cupom} cupom={pedido.cupom}
        desconto={pedido.desconto} total={pedido.total} titulo="VALORES" />

      <Text style={s.secao}>PAGAMENTO</Text>
      <Text style={s.texto}>
        {ROTULO_PAGAMENTO[pedido.forma_pagamento]}
        {pedido.forma_pagamento === 'cartao' ? `${pedido.cartao_final ? ` ${pedido.cartao_bandeira || ''} final ${pedido.cartao_final}` : ''} · ${pedido.parcelas}x de ${moeda(pedido.valor_parcela)}` : ''}
      </Text>

      <Text style={s.secao}>ENTREGA</Text>
      <Text style={s.texto}>{pedido.endereco}, {pedido.numero}{pedido.complemento ? ` – ${pedido.complemento}` : ''}</Text>
      <Text style={s.texto}>{pedido.bairro ? `${pedido.bairro} · ` : ''}{pedido.cidade}/{pedido.estado} · CEP {mascaraCep(pedido.cep)}</Text>

      {pedido.acoes?.includes('cancelar') ? (
        <Botao titulo="CANCELAR PEDIDO" variante="escuro" onPress={() => acao('cancelar')} carregando={agindo} style={{ marginTop: 24 }} tamanhoFonte={20} />
      ) : null}
      <Botao titulo="CONTINUAR COMPRANDO" variante={novo ? 'primario' : 'escuro'} onPress={() => navigation.navigate('Abas', { screen: 'Catalogo' })} style={{ marginTop: 10 }} tamanhoFonte={20} />
      <Pressable onPress={() => navigation.navigate('MeusPedidos')} style={{ alignSelf: 'center', padding: 12 }} accessibilityRole="link">
        <Text style={{ color: cores.textoSuave, textDecorationLine: 'underline' }}>Ver todos os meus pedidos</Text>
      </Pressable>
    </Tela>
  );
}

const s = StyleSheet.create({
  sucesso: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0F2A18', padding: 14, marginBottom: 16 },
  sucessoTitulo: { color: cores.sucesso, fontFamily: fontes.titulo, fontSize: 26 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  data: { color: cores.textoApagado, fontSize: 12, marginBottom: 16, fontFamily: fontes.corpo },
  texto: { color: cores.textoSuave, fontSize: 14, lineHeight: 20, fontFamily: fontes.corpo },
  cancelado: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: cores.fundoCard, padding: 14 },
  timeline: { backgroundColor: cores.fundoCard, padding: 14 },
  passo: { flexDirection: 'row', gap: 12 },
  passoEsquerda: { alignItems: 'center' },
  bola: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#444', alignItems: 'center', justifyContent: 'center' },
  bolaFeita: { backgroundColor: cores.vermelho, borderColor: cores.vermelho },
  trilho: { width: 2, flex: 1, backgroundColor: '#333', minHeight: 18 },
  passoTexto: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 14, marginTop: 4 },
  passoData: { color: cores.textoApagado, fontSize: 12, marginTop: 2, fontFamily: fontes.corpo },
  rastreio: { color: cores.vermelhoTexto, fontSize: 12, marginTop: 4, fontFamily: fontes.corpoNegrito },
  caixaPagamento: { borderWidth: 1, borderColor: '#E8A33D', padding: 16, marginTop: 16, gap: 10, alignItems: 'stretch' },
  caixaTitulo: { color: '#E8A33D', fontFamily: fontes.titulo, fontSize: 26 },
  qr: { width: 220, height: 220, alignSelf: 'center', backgroundColor: '#fff' },
  valorPagar: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 34, textAlign: 'center' },
  codigo: { color: cores.textoSuave, fontSize: 11, backgroundColor: cores.fundoCard, padding: 10, fontFamily: 'monospace' },
  simulado: { color: cores.textoApagado, fontSize: 11, textAlign: 'center', fontFamily: fontes.corpo },
  secao: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 22, marginTop: 22, marginBottom: 8 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: cores.linha },
  foto: { width: 64, height: 64, backgroundColor: '#1C1C1C' },
  itemNome: { color: cores.texto, fontFamily: fontes.corpoNegrito },
  itemPreco: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18 },
  avaliar: { color: cores.vermelhoTexto, fontSize: 12, marginTop: 3, fontFamily: fontes.corpoNegrito },
});
