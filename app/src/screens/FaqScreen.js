import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Tela from '../components/Tela';
import { Titulo } from '../components/ui';
import { cores, fontes } from '../theme';

const PERGUNTAS = [
  {
    p: 'Como sei o tamanho certo do meu capacete?',
    r: 'Meça a circunferência da cabeça com uma fita métrica, cerca de 2 cm acima das sobrancelhas. O número em centímetros é o tamanho: 56 cm = 56/S, 60 cm = 60/L, 62 cm = 62/XL. Se ficar entre dois tamanhos, prefira o maior. O capacete deve ficar firme, sem apertar.',
  },
  {
    p: 'Qual o prazo de entrega dos pedidos?',
    r: 'Para CEPs da região Sudeste, até 3 dias úteis; para as demais regiões, até 7 dias úteis após a confirmação do pagamento. O frete custa R$ 34,99 e é grátis em compras a partir de R$ 1.500,00. Você pode simular na página do produto.',
  },
  {
    p: 'Como funciona a troca de um produto?',
    r: 'Você tem 7 dias corridos após o recebimento para desistir da compra. Para trocar de tamanho, o capacete deve estar sem uso, com etiquetas e na embalagem original. A primeira troca é gratuita.',
  },
  {
    p: 'Os capacetes Zentor são aprovados pelo Inmetro?',
    r: 'Sim. Todos os capacetes vendidos têm certificação Inmetro (selo holográfico e etiqueta interna), exigida para uso no Brasil. A certificação aparece na página de cada produto.',
  },
  {
    p: 'Quais formas de pagamento vocês aceitam?',
    r: 'Cartão de crédito em até 10x sem juros (Visa, Mastercard, Elo, Amex), Pix com 5% de desconto e boleto bancário. Também aceitamos cupons de desconto no carrinho.',
  },
  {
    p: 'Posso cancelar um pedido?',
    r: 'Sim, enquanto ele não for enviado. Abra o pedido em "Meus pedidos" e toque em "Cancelar pedido". Se já tiver sido pago, o valor é estornado.',
  },
  {
    p: 'Como acompanho o status do meu pedido?',
    r: 'Toque na aba Conta e depois em "Meus pedidos". Cada pedido mostra a linha do tempo (recebido, pago, enviado, entregue), o código de rastreio quando é enviado e, se estiver aguardando, o QR Code do Pix ou a linha do boleto.',
  },
];

/** Perguntas frequentes em acordeão (Figma p. 10). */
export default function FaqScreen() {
  const [aberta, setAberta] = useState(0);
  return (
    <Tela rodape>
      <Titulo tamanho={52} style={{ textAlign: 'center', marginVertical: 12 }}>PERGUNTAS FREQUENTES</Titulo>
      {PERGUNTAS.map((item, i) => {
        const estaAberta = aberta === i;
        return (
          <View key={item.p} style={s.item}>
            <Pressable onPress={() => setAberta(estaAberta ? -1 : i)} style={s.cabeca} accessibilityRole="button"
              accessibilityState={{ expanded: estaAberta }} accessibilityLabel={item.p}>
              <Text style={s.pergunta}>{item.p}</Text>
              <View style={s.sinal}><Text style={s.sinalTexto}>{estaAberta ? '−' : '+'}</Text></View>
            </Pressable>
            {estaAberta ? <Text style={s.resposta}>{item.r}</Text> : null}
          </View>
        );
      })}
    </Tela>
  );
}

const s = StyleSheet.create({
  item: { borderBottomWidth: 1, borderBottomColor: '#888' },
  cabeca: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  pergunta: { color: cores.texto, fontSize: 15, flex: 1, fontFamily: fontes.corpo },
  sinal: { width: 30, height: 30, borderWidth: 1.5, borderColor: cores.texto, alignItems: 'center', justifyContent: 'center' },
  sinalTexto: { color: cores.texto, fontSize: 20, fontFamily: fontes.corpoNegrito, lineHeight: 22 },
  resposta: { color: cores.textoSuave, fontSize: 14, lineHeight: 20, paddingBottom: 16, fontFamily: fontes.corpo },
});
