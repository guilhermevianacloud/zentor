import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Tela from '../components/Tela';
import { Botao, Campo, MensagemErro, Titulo } from '../components/ui';
import { Vazio } from '../components/extras';
import { api } from '../config/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAcessibilidade } from '../context/AccessibilityContext';
import { cores, fontes } from '../theme';
import {
  bandeiraCartao, cartaoValido, mascaraCartao, mascaraCep, mascaraValidade, moeda, soDigitos,
} from '../utils/formatos';
import { ResumoPedido } from './CarrinhoScreen';
import { abrirPagamento, fecharJanela, reservarJanela } from '../utils/mercadoPago';

const FORMAS = [
  { id: 'cartao', rotulo: 'Cartão de crédito', sub: 'Até 10x sem juros', icone: 'card-outline' },
  { id: 'pix', rotulo: 'Pix — 5% de desconto', sub: 'Aprovação imediata após o pagamento', icone: 'flash-outline' },
  { id: 'boleto', rotulo: 'Boleto bancário', sub: 'Vence em 3 dias úteis', icone: 'document-text-outline' },
];
const ENDERECO_VAZIO = { cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };

/**
 * Envio e checkout (Figma p. 9). O resumo é calculado pela API
 * (POST /pedidos/simular) com cupom e estratégia de pagamento.
 * Pagamento SIMULADO: cartão é "aprovado" na hora; Pix e boleto geram código.
 * Correção do Figma: "COMFIRMAR PEDIDO" → "CONFIRMAR PEDIDO".
 */
export default function CheckoutScreen({ navigation }) {
  const carrinho = useCart();
  const toast = useToast();
  const { anunciar } = useAcessibilidade();
  const [salvos, setSalvos] = useState(null);
  const [enderecoId, setEnderecoId] = useState(null); // id do endereço salvo ou 'novo'
  const [end, setEnd] = useState(ENDERECO_VAZIO);
  const [salvarEndereco, setSalvarEndereco] = useState(true);
  const [erros, setErros] = useState({});
  const [metodo, setMetodo] = useState('cartao');
  const [parcelas, setParcelas] = useState(1);
  const [mostrarParcelas, setMostrarParcelas] = useState(false);
  const [cartao, setCartao] = useState({ numero: '', nome: '', validade: '', cvv: '' });
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Pagamento real (Mercado Pago) ou simulado: quem decide é a API (credencial no backend/.env).
  const [config, setConfig] = useState({ mercadopago: false, modo_teste: false });
  const mp = config.mercadopago;
  const numeroRef = useRef();

  useEffect(() => { api('/pagamentos/config').then(setConfig).catch(() => {}); }, []);

  const itensApi = carrinho.paraApi();
  const chaveItens = JSON.stringify(itensApi);
  const enderecoAtual = enderecoId && enderecoId !== 'novo' ? salvos?.find((e) => e.id === enderecoId) : end;
  const cupom = carrinho.cupomValido ? carrinho.cupom?.codigo : undefined;

  useFocusEffect(useCallback(() => {
    api('/enderecos').then((lista) => {
      setSalvos(lista);
      setEnderecoId((atual) => atual || (lista.length ? (lista.find((e) => e.principal) || lista[0]).id : 'novo'));
    }).catch(() => { setSalvos([]); setEnderecoId('novo'); });
  }, []));

  useEffect(() => {
    if (!itensApi.length) return;
    api('/pedidos/simular', { metodo: 'POST', corpo: { itens: itensApi, cupom, cep: enderecoAtual?.cep, pagamento: { metodo, parcelas } } })
      .then((r) => { setResumo(r); setErro(''); })
      .catch((e) => setErro(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveItens, metodo, parcelas, cupom, enderecoAtual?.cep]);

  // Autopreenche o endereço pelo CEP (ViaCEP, serviço público). Se falhar, o usuário digita.
  useEffect(() => {
    const cep = soDigitos(end.cep);
    if (cep.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) { setErros((e) => ({ ...e, cep: 'CEP não encontrado. Preencha o endereço manualmente.' })); return; }
        setErros((e) => ({ ...e, cep: undefined }));
        setEnd((a) => ({ ...a, endereco: d.logradouro || a.endereco, bairro: d.bairro || a.bairro, cidade: d.localidade || a.cidade, estado: d.uf || a.estado }));
        numeroRef.current?.focus();
      })
      .catch(() => {});
  }, [end.cep]);

  if (!carrinho.itens.length) {
    return (
      <Tela>
        <Vazio icone="cart-outline" titulo="CARRINHO VAZIO" texto="Adicione capacetes para finalizar a compra."
          acao="VER CAPACETES" onAcao={() => navigation.navigate('Abas', { screen: 'Catalogo' })} />
      </Tela>
    );
  }

  // Ao editar um campo, a mensagem de erro dele some (só volta se continuar inválido ao confirmar).
  const limparErro = (chave) => setErros((e) => (e[chave] ? { ...e, [chave]: undefined } : e));
  const muda = (campo, mascara) => (v) => { limparErro(campo); setEnd((a) => ({ ...a, [campo]: mascara ? mascara(v) : v })); };
  const ERRO_CARTAO = { numero: 'numero_cartao', nome: 'nome_cartao', validade: 'validade', cvv: 'cvv' };
  const mudaCartao = (campo, mascara) => (v) => { limparErro(ERRO_CARTAO[campo]); setCartao((a) => ({ ...a, [campo]: mascara ? mascara(v) : v })); };

  const validar = () => {
    const e = {};
    if (enderecoId === 'novo') {
      if (soDigitos(end.cep).length !== 8) e.cep = 'CEP com 8 dígitos.';
      if (!end.endereco.trim()) e.endereco = 'Informe o endereço.';
      if (!end.numero.trim()) e.numero = 'Informe o número.';
      if (!end.cidade.trim()) e.cidade = 'Informe a cidade.';
      if (!/^[A-Za-z]{2}$/.test(end.estado.trim())) e.estado = 'Sigla (ex.: SP).';
    }
    if (metodo === 'cartao' && !mp) {
      if (!cartaoValido(cartao.numero)) e.numero_cartao = 'Número do cartão inválido.';
      if (cartao.nome.trim().length < 3) e.nome_cartao = 'Nome como está no cartão.';
      const [m, a] = cartao.validade.split('/').map(Number);
      if (!m || m > 12 || !a || new Date(2000 + a, m, 1) <= new Date()) e.validade = 'Validade inválida (MM/AA).';
      if (!/^\d{3,4}$/.test(cartao.cvv)) e.cvv = '3 ou 4 dígitos.';
    }
    return e;
  };

  const confirmar = async () => {
    setErro('');
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) {
      toast.erro('Verifique os campos destacados.');
      anunciar('Verifique os campos destacados.');
      return;
    }
    setEnviando(true);
    // Mercado Pago: a aba é aberta já no clique (senão o navegador bloqueia como pop-up).
    const janela = mp ? reservarJanela() : null;
    try {
      const endereco = enderecoId === 'novo' ? end : enderecoAtual;
      let pagamento = { metodo };
      if (metodo === 'cartao') pagamento = mp ? { metodo, parcelas } : { metodo, parcelas, cartao: { ...cartao, numero: soDigitos(cartao.numero) } };
      const pedido = await api('/pedidos', { metodo: 'POST', corpo: { itens: itensApi, endereco, pagamento, cupom } });
      if (pedido.checkout_url) abrirPagamento(pedido.checkout_url, janela);
      if (enderecoId === 'novo' && salvarEndereco) {
        await api('/enderecos', { metodo: 'POST', corpo: { apelido: salvos?.length ? 'Outro' : 'Casa', ...end } }).catch(() => {});
      }
      carrinho.limpar();
      anunciar(`Pedido número ${pedido.id} confirmado.`);
      navigation.reset({ index: 1, routes: [{ name: 'Abas' }, { name: 'Pedido', params: { id: pedido.id, novo: true } }] });
    } catch (err) {
      fecharJanela(janela);
      setErro(err.message);
      toast.erro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const totalBruto = resumo ? resumo.subtotal - resumo.desconto_cupom + resumo.frete : carrinho.total;
  const marca = bandeiraCartao(cartao.numero);

  return (
    <Tela>
      <Titulo tamanho={40}>ENVIO E CHECKOUT</Titulo>
      <Etapas />

      <Titulo tamanho={28} style={{ marginTop: 18, marginBottom: 8 }}>1. ENDEREÇO DE ENTREGA</Titulo>
      {(salvos || []).map((e) => (
        <Pressable key={e.id} onPress={() => setEnderecoId(e.id)} style={[s.opcao, enderecoId === e.id && s.opcaoAtiva]}
          accessibilityRole="radio" accessibilityState={{ checked: enderecoId === e.id }}
          accessibilityLabel={`${e.apelido}: ${e.endereco}, ${e.numero}, ${e.cidade}`}>
          <Ionicons name={enderecoId === e.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={cores.vermelho} />
          <View style={{ flex: 1 }}>
            <Text style={s.opcaoTexto}>{e.apelido}{e.principal ? ' · principal' : ''}</Text>
            <Text style={s.opcaoSub}>{e.endereco}, {e.numero}{e.complemento ? ` – ${e.complemento}` : ''}</Text>
            <Text style={s.opcaoSub}>{e.bairro ? `${e.bairro} · ` : ''}{e.cidade}/{e.estado} · CEP {mascaraCep(e.cep)}</Text>
          </View>
        </Pressable>
      ))}
      {salvos?.length ? (
        <Pressable onPress={() => setEnderecoId('novo')} style={[s.opcao, enderecoId === 'novo' && s.opcaoAtiva]} accessibilityRole="radio"
          accessibilityState={{ checked: enderecoId === 'novo' }} accessibilityLabel="Entregar em outro endereço">
          <Ionicons name={enderecoId === 'novo' ? 'radio-button-on' : 'radio-button-off'} size={20} color={cores.vermelho} />
          <Text style={s.opcaoTexto}>Entregar em outro endereço</Text>
        </Pressable>
      ) : null}

      {enderecoId === 'novo' ? (
        <View style={{ marginTop: 6 }}>
          <Campo rotulo="CEP" rotuloTamanho={18} placeholder="00000-000" value={end.cep} onChangeText={muda('cep', mascaraCep)} erro={erros.cep}
            keyboardType="number-pad" autoComplete="postal-code" />
          <Campo rotulo="ENDEREÇO" rotuloTamanho={18} placeholder="Rua, avenida..." value={end.endereco} onChangeText={muda('endereco')} erro={erros.endereco} />
          <View style={s.linha}>
            <Campo ref={numeroRef} style={s.metade} rotulo="NÚMERO" rotuloTamanho={18} placeholder="Nº" value={end.numero} onChangeText={muda('numero')} erro={erros.numero} />
            <Campo style={s.metade} rotulo="COMPLEMENTO" rotuloTamanho={18} placeholder="Apto, bloco (opcional)" value={end.complemento} onChangeText={muda('complemento')} />
          </View>
          <Campo rotulo="BAIRRO" rotuloTamanho={18} placeholder="Bairro" value={end.bairro} onChangeText={muda('bairro')} />
          <View style={s.linha}>
            <Campo style={{ flex: 2 }} rotulo="CIDADE" rotuloTamanho={18} placeholder="São Paulo" value={end.cidade} onChangeText={muda('cidade')} erro={erros.cidade} />
            <Campo style={s.metade} rotulo="ESTADO" rotuloTamanho={18} placeholder="SP" value={end.estado}
              onChangeText={(v) => muda('estado')(v.toUpperCase().slice(0, 2))} erro={erros.estado} autoCapitalize="characters" />
          </View>
          <Pressable onPress={() => setSalvarEndereco(!salvarEndereco)} style={s.check} accessibilityRole="checkbox" accessibilityState={{ checked: salvarEndereco }}>
            <Ionicons name={salvarEndereco ? 'checkbox' : 'square-outline'} size={20} color={salvarEndereco ? cores.vermelho : cores.textoApagado} />
            <Text style={s.opcaoSub}>Salvar este endereço para as próximas compras</Text>
          </Pressable>
        </View>
      ) : null}
      {resumo?.prazo_dias ? (
        <Text style={s.prazo}><Ionicons name="time-outline" size={13} color={cores.sucesso} /> Entrega em até {resumo.prazo_dias} dias úteis após a confirmação do pagamento</Text>
      ) : null}

      <View style={s.pagamento}>
        <Text style={s.pagTitulo}>2. FORMA DE PAGAMENTO</Text>
        {FORMAS.map((f) => (
          <View key={f.id}>
            <Pressable onPress={() => { setMetodo(f.id); if (f.id !== 'cartao') setParcelas(1); }} style={[s.opcao, metodo === f.id && s.opcaoAtiva]}
              accessibilityRole="radio" accessibilityState={{ checked: metodo === f.id }} accessibilityLabel={`${f.rotulo}. ${f.sub}`}>
              <Ionicons name={metodo === f.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={cores.vermelho} />
              <View style={{ flex: 1 }}>
                <Text style={s.opcaoTexto}>{f.rotulo}</Text>
                <Text style={s.opcaoSub}>{f.sub}</Text>
              </View>
              <Ionicons name={f.icone} size={20} color="#E8C26A" />
            </Pressable>

            {f.id === 'cartao' && metodo === 'cartao' && mp ? (
              <View style={s.cartaoForm}>
                <Text style={[s.explica, { marginLeft: 0 }]}>Você digita os dados do cartão na página segura do Mercado Pago, que abre ao confirmar. A Zentor não recebe o número do cartão.</Text>
                <Pressable onPress={() => setMostrarParcelas(!mostrarParcelas)} style={s.select} accessibilityRole="button"
                  accessibilityLabel={`Parcelamento sugerido: ${parcelas} vezes. Toque para alterar`} accessibilityState={{ expanded: mostrarParcelas }}>
                  <Text style={s.opcaoTexto}>{parcelas}x de {moeda(totalBruto / parcelas)} sem juros</Text>
                  <Ionicons name={mostrarParcelas ? 'chevron-up' : 'chevron-down'} size={16} color={cores.texto} />
                </Pressable>
                {mostrarParcelas ? (
                  <View style={s.lista}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <Pressable key={n} onPress={() => { setParcelas(n); setMostrarParcelas(false); }} style={s.itemLista}
                        accessibilityRole="button" accessibilityLabel={`${n} vezes de ${moeda(totalBruto / n)}`}>
                        <Text style={[s.opcaoTexto, n === parcelas && { color: cores.vermelho }]}>{n}x de {moeda(totalBruto / n)} sem juros</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            {f.id === 'cartao' && metodo === 'cartao' && !mp ? (
              <View style={s.cartaoForm}>
                <Campo rotulo={`NÚMERO DO CARTÃO${marca ? ` · ${marca.toUpperCase()}` : ''}`} rotuloTamanho={16} placeholder="0000 0000 0000 0000"
                  value={cartao.numero} onChangeText={mudaCartao('numero', mascaraCartao)} erro={erros.numero_cartao} keyboardType="number-pad" autoComplete="cc-number" />
                <Campo rotulo="NOME IMPRESSO NO CARTÃO" rotuloTamanho={16} placeholder="COMO ESTÁ NO CARTÃO" value={cartao.nome}
                  onChangeText={(v) => mudaCartao('nome')(v.toUpperCase())} erro={erros.nome_cartao} autoComplete="cc-name" autoCapitalize="characters" />
                <View style={s.linha}>
                  <Campo style={s.metade} rotulo="VALIDADE" rotuloTamanho={16} placeholder="MM/AA" value={cartao.validade}
                    onChangeText={mudaCartao('validade', mascaraValidade)} erro={erros.validade} keyboardType="number-pad" autoComplete="cc-exp" />
                  <Campo style={s.metade} rotulo="CVV" rotuloTamanho={16} placeholder="123" value={cartao.cvv}
                    onChangeText={mudaCartao('cvv', (v) => soDigitos(v).slice(0, 4))} erro={erros.cvv} keyboardType="number-pad" secureTextEntry autoComplete="cc-csc" />
                </View>
                <Pressable onPress={() => setMostrarParcelas(!mostrarParcelas)} style={s.select} accessibilityRole="button"
                  accessibilityLabel={`Parcelamento: ${parcelas} vezes. Toque para alterar`} accessibilityState={{ expanded: mostrarParcelas }}>
                  <Text style={s.opcaoTexto}>{parcelas}x de {moeda(totalBruto / parcelas)} sem juros</Text>
                  <Ionicons name={mostrarParcelas ? 'chevron-up' : 'chevron-down'} size={16} color={cores.texto} />
                </Pressable>
                {mostrarParcelas ? (
                  <View style={s.lista}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <Pressable key={n} onPress={() => { setParcelas(n); setMostrarParcelas(false); }} style={s.itemLista}
                        accessibilityRole="button" accessibilityLabel={`${n} vezes de ${moeda(totalBruto / n)}`}>
                        <Text style={[s.opcaoTexto, n === parcelas && { color: cores.vermelho }]}>{n}x de {moeda(totalBruto / n)} sem juros</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <Text style={s.seguro}><Ionicons name="lock-closed" size={11} color={cores.textoApagado} /> Os dados do cartão não são gravados: guardamos só os 4 últimos dígitos.</Text>
              </View>
            ) : null}
            {f.id === 'pix' && metodo === 'pix' ? (
              <Text style={s.explica}>{mp
                ? 'Ao confirmar, o Mercado Pago abre com o QR Code e o código "copia e cola", já com os 5% de desconto. O pedido é liberado assim que o pagamento é aprovado.'
                : 'Depois de confirmar, mostramos o QR Code e o código "copia e cola". O pedido é liberado assim que o pagamento é confirmado.'}</Text>
            ) : null}
            {f.id === 'boleto' && metodo === 'boleto' ? (
              <Text style={s.explica}>{mp
                ? 'Ao confirmar, o Mercado Pago abre para você gerar o boleto. A compensação pode levar até 2 dias úteis.'
                : 'A linha digitável aparece após confirmar. A compensação pode levar até 2 dias úteis.'}</Text>
            ) : null}
          </View>
        ))}
        {mp ? (
          <View style={s.mpSelo} accessibilityLabel={config.modo_teste ? 'Pagamento pelo Mercado Pago em modo de teste: nada é cobrado de verdade' : 'Pagamento processado pelo Mercado Pago'}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#4DA3FF" />
            <Text style={s.mpTexto}>
              Pagamento processado pelo <Text style={{ fontFamily: fontes.corpoNegrito, color: cores.texto }}>Mercado Pago</Text>.
              {config.modo_teste ? ' Modo de teste: use os cartões e contas de teste; nada é cobrado de verdade.' : ''}
            </Text>
          </View>
        ) : (
          <Text style={s.simulado}>Pagamento simulado (projeto acadêmico): nenhuma cobrança real é feita.</Text>
        )}
      </View>

      <MensagemErro texto={erro} />
      {resumo ? (
        <ResumoPedido
          titulo="3. RESUMO DO PEDIDO"
          subtotal={resumo.subtotal}
          frete={resumo.frete}
          descontoCupom={resumo.desconto_cupom}
          cupom={resumo.cupom?.codigo}
          desconto={resumo.desconto}
          total={resumo.total}
          rotuloQtd={`${carrinho.quantidadeTotal} ${carrinho.quantidadeTotal === 1 ? 'item' : 'itens'}`}
        >
          {metodo === 'cartao' && resumo.parcelas > 1 ? (
            <Text style={[s.opcaoTexto, { marginBottom: 10 }]}>{resumo.parcelas}x de {moeda(resumo.valor_parcela)} sem juros</Text>
          ) : null}
          <Botao titulo={mp ? 'CONFIRMAR E PAGAR' : 'CONFIRMAR PEDIDO'} onPress={confirmar} carregando={enviando} tamanhoFonte={22}
            rotuloAcessivel={mp ? 'Confirmar pedido e abrir o pagamento no Mercado Pago' : undefined} />
        </ResumoPedido>
      ) : null}
    </Tela>
  );
}

function Etapas() {
  const passos = ['Carrinho', 'Entrega e pagamento', 'Confirmação'];
  return (
    <View style={s.etapas} accessibilityLabel="Etapa 2 de 3: entrega e pagamento">
      {passos.map((p, i) => (
        <View key={p} style={s.etapa}>
          <View style={[s.etapaBola, i <= 1 && { backgroundColor: cores.vermelho, borderColor: cores.vermelho }]}>
            {i === 0 ? <Ionicons name="checkmark" size={12} color={cores.texto} /> : <Text style={s.etapaNum}>{i + 1}</Text>}
          </View>
          <Text style={[s.etapaTexto, i === 1 && { color: cores.texto }]}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 10 },
  metade: { flex: 1 },
  etapas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  etapa: { alignItems: 'center', flex: 1, gap: 4 },
  etapaBola: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  etapaNum: { color: cores.texto, fontSize: 11, fontFamily: fontes.corpoNegrito },
  etapaTexto: { color: cores.textoApagado, fontSize: 11, textAlign: 'center', fontFamily: fontes.corpo },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#3A3A3A', padding: 12, marginBottom: 10 },
  opcaoAtiva: { borderColor: cores.vermelho, backgroundColor: '#1A0C0C' },
  opcaoTexto: { color: cores.texto, fontSize: 14, fontFamily: fontes.corpoSemi },
  opcaoSub: { color: cores.textoApagado, fontSize: 12, marginTop: 1, fontFamily: fontes.corpo },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  prazo: { color: cores.sucesso, fontSize: 12, marginTop: 4, fontFamily: fontes.corpo },
  pagamento: { backgroundColor: '#140F0F', borderWidth: 1, borderColor: '#2A2A2A', padding: 14, marginTop: 18 },
  pagTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 26, marginBottom: 12 },
  cartaoForm: { borderLeftWidth: 2, borderLeftColor: cores.vermelho, paddingLeft: 12, marginBottom: 14 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#555', padding: 12 },
  lista: { borderWidth: 1, borderColor: '#555', borderTopWidth: 0, backgroundColor: cores.fundoCard },
  itemLista: { paddingHorizontal: 12, paddingVertical: 9 },
  seguro: { color: cores.textoApagado, fontSize: 11, marginTop: 8, fontFamily: fontes.corpo },
  explica: { color: cores.textoSuave, fontSize: 12, marginBottom: 12, marginLeft: 30, fontFamily: fontes.corpo },
  simulado: { color: cores.textoApagado, fontSize: 11, fontFamily: fontes.corpo },
  mpSelo: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingTop: 10 },
  mpTexto: { flex: 1, color: cores.textoSuave, fontSize: 12, lineHeight: 17, fontFamily: fontes.corpo },
});
