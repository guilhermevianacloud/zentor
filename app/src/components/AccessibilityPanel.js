import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { cores, fontes } from '../theme';
import { useAcessibilidade } from '../context/AccessibilityContext';

const DICAS_CADASTRO = [
  { icone: 'arrow-forward', titulo: 'Tab: próximo campo', texto: 'Use Tab (teclado) ou "Próximo" (teclado do celular) para avançar entre os campos.' },
  { icone: 'arrow-back', titulo: 'Shift + Tab: campo anterior', texto: 'Use Shift + Tab para voltar ao campo anterior e revisar o preenchimento.' },
  { icone: 'return-down-forward', titulo: 'Enter: acionar botão', texto: 'Enter no último campo envia o formulário (Salvar ou Entrar).' },
  { icone: 'alert-circle-outline', titulo: 'Rótulos e erros', texto: 'Todo campo tem rótulo. Mensagens de erro aparecem abaixo do campo e são anunciadas pelo leitor de tela.' },
];
const DICAS_LOJA = [
  { icone: 'arrow-forward', titulo: 'Tab: próximo elemento', texto: 'Tab avança entre links, produtos e botões.' },
  { icone: 'arrow-back', titulo: 'Shift + Tab: elemento anterior', texto: 'Shift + Tab retorna ao elemento anterior.' },
  { icone: 'return-down-forward', titulo: 'Enter: acionar botão', texto: 'Enter abre o produto ou aciona o link/botão em foco.' },
  { icone: 'pricetag-outline', titulo: 'Nomes e preços', texto: 'Cada produto anuncia nome, preço (de/por) e tamanhos para o leitor de tela.' },
  { icone: 'image-outline', titulo: 'Descrição de imagens', texto: 'As fotos têm descrição (texto alternativo) para leitores de tela.' },
];

/** Painel "Ajuda no cadastro" / "Ajuda na loja" do Figma (páginas 13 e 14). */
export default function AccessibilityPanel({ contexto = 'loja' }) {
  const { painelAberto, fecharPainel, audio, definirAudio, anunciar } = useAcessibilidade();
  const [audioLocal, setAudioLocal] = useState(audio);
  useEffect(() => { if (painelAberto) setAudioLocal(audio); }, [painelAberto, audio]);

  const cadastro = contexto === 'cadastro';
  const dicas = cadastro ? DICAS_CADASTRO : DICAS_LOJA;

  const aplicar = () => {
    definirAudio(audioLocal);
    fecharPainel();
    if (audioLocal) setTimeout(() => anunciar('Áudio de ajuda ativado.'), 300);
  };

  return (
    <Modal visible={painelAberto} transparent animationType="fade" onRequestClose={fecharPainel}>
      <View style={s.fundo}>
        <View style={s.painel} accessibilityViewIsModal>
          <ScrollView>
            <Text style={s.titulo} accessibilityRole="header">{cadastro ? 'AJUDA NO CADASTRO' : 'AJUDA NA LOJA'}</Text>
            <Text style={s.sub}>
              {cadastro ? 'Dicas para navegar e preencher o formulário com leitores de tela e teclado.' : 'Orientações para navegar pelos produtos com teclado e leitor de tela.'}
            </Text>
            <View style={s.item}>
              <View style={s.linha}>
                <Ionicons name="volume-high-outline" size={16} color={cores.texto} />
                <Text style={s.itemTitulo}>Áudio opcional</Text>
              </View>
              <Text style={s.itemTexto}>Ative para ouvir avisos sonoros durante a navegação. Desligado por padrão.</Text>
              <Switch
                value={audioLocal}
                onValueChange={setAudioLocal}
                accessibilityLabel="Áudio opcional"
                trackColor={{ true: cores.vermelho, false: '#555' }}
                thumbColor={cores.texto}
                style={{ marginTop: 6 }}
              />
            </View>
            {dicas.map((d) => (
              <View key={d.titulo} style={s.item}>
                <View style={s.linha}>
                  <Ionicons name={d.icone} size={16} color={cores.texto} />
                  <Text style={s.itemTitulo}>{d.titulo}</Text>
                </View>
                <Text style={s.itemTexto}>{d.texto}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={s.botoes}>
            <Pressable onPress={fecharPainel} style={s.cancelar} accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={s.botaoTexto}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={aplicar} style={s.aplicar} accessibilityRole="button" accessibilityLabel="Aplicar">
              <Text style={s.botaoTexto}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  painel: { backgroundColor: '#1E1414', borderWidth: 1, borderColor: cores.vermelhoEscuro, borderRadius: 2, padding: 16, maxHeight: '90%', maxWidth: 480, width: '100%', alignSelf: 'center' },
  titulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 26 },
  sub: { color: cores.textoSuave, fontSize: 13, marginBottom: 10, fontFamily: fontes.corpo },
  item: { backgroundColor: '#2A1E1E', borderRadius: 2, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#3A2A2A' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitulo: { color: cores.texto, fontFamily: fontes.corpoNegrito, fontSize: 14 },
  itemTexto: { color: cores.textoSuave, fontSize: 12, marginTop: 4, fontFamily: fontes.corpo },
  botoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cancelar: { backgroundColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 2 },
  aplicar: { backgroundColor: cores.vermelho, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 2 },
  botaoTexto: { color: cores.texto, fontFamily: fontes.corpoNegrito },
});
