import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Tela from '../components/Tela';
import ProductCard from '../components/ProductCard';
import { MensagemErro, Titulo } from '../components/ui';
import { GradeEsqueleto, Vazio } from '../components/extras';
import { useAuth } from '../context/AuthContext';
import { useFavoritos } from '../context/FavoritesContext';
import useLarguraCard from '../hooks/useLarguraCard';

/** Lista de desejos do cliente (citada no Figma: "acompanhar pedidos e favoritos"). */
export default function FavoritosScreen({ navigation }) {
  const { usuario } = useAuth();
  const { ids, recarregar } = useFavoritos();
  const [produtos, setProdutos] = useState(null);
  const [erro, setErro] = useState('');
  const { largura } = useLarguraCard();

  useFocusEffect(useCallback(() => {
    if (!usuario) return;
    recarregar().then(setProdutos).catch((e) => setErro(e.message));
  }, [usuario, recarregar]));

  if (!usuario) {
    return (
      <Tela>
        <Titulo tamanho={44}>FAVORITOS</Titulo>
        <Vazio icone="heart-outline" titulo="SALVE SEUS CAPACETES" texto="Entre na sua conta para guardar os capacetes que você curtiu."
          acao="ENTRAR" onAcao={() => navigation.navigate('Login')} />
      </Tela>
    );
  }

  // Esconde na hora o que foi desfavoritado nesta tela (o contexto já atualizou os ids).
  const visiveis = (produtos || []).filter((p) => ids.includes(p.id));

  return (
    <Tela>
      <Titulo tamanho={44}>FAVORITOS</Titulo>
      <MensagemErro texto={erro} />
      {produtos === null && !erro ? <GradeEsqueleto largura={largura} /> : null}
      {produtos && visiveis.length === 0 ? (
        <Vazio icone="heart-outline" titulo="NENHUM FAVORITO AINDA" texto="Toque no coração de um capacete para salvá-lo aqui."
          acao="VER CAPACETES" onAcao={() => navigation.navigate('Abas', { screen: 'Catalogo' })} />
      ) : null}
      <View style={s.grade}>
        {visiveis.map((p) => (
          <ProductCard key={p.id} produto={p} largura={largura} onPress={() => navigation.navigate('Produto', { id: p.id })} />
        ))}
      </View>
    </Tela>
  );
}

const s = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
});
