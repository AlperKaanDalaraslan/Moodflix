import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PosterImage} from '../components/PosterImage';
import {useFavorites} from '../context/FavoritesContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

export function FavoritesScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const {favorites, toggleFavorite} = useFavorites();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <Text style={{color: colors.text, fontSize: 22, fontWeight: '900'}}>{t(locale, 'favorites')}</Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{gap: 12, paddingHorizontal: 16}}
        contentContainerStyle={{paddingBottom: 24, gap: 14, flexGrow: 1}}
        ListEmptyComponent={
          <View style={{paddingHorizontal: 16, paddingTop: 18}}>
            <Text style={{color: colors.textMuted, lineHeight: 20}}>{t(locale, 'favoritesEmpty')}</Text>
          </View>
        }
        renderItem={({item}) => (
          <View style={{flex: 1}}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MovieDetail', {movieId: item.id})}
              style={{aspectRatio: 2 / 3, borderRadius: 16, overflow: 'hidden'}}>
              <PosterImage posterPath={item.poster_path} colors={colors} size="medium" />
            </TouchableOpacity>
            <Text numberOfLines={2} style={{color: colors.text, marginTop: 8, fontWeight: '700'}}>
              {item.title}
            </Text>
            <TouchableOpacity onPress={() => toggleFavorite(item)} style={{marginTop: 8}}>
              <Text style={{color: colors.pass, fontWeight: '800'}}>{t(locale, 'removeFavorite')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
});
