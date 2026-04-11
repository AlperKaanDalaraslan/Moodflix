import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {hasApiKey, searchMovies} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

export function SearchScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const navigation = useNavigation();

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const runSearch = useCallback(async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      return;
    }
    if (!canSearch) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchMovies(locale, q.trim(), 1);
      setResults(res.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setLoading(false);
    }
  }, [canSearch, locale, q]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <Text style={{color: colors.text, fontSize: 22, fontWeight: '900'}}>{t(locale, 'search')}</Text>
      </View>

      <View style={{paddingHorizontal: 16}}>
        <View style={[styles.inputWrap, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={{color: colors.textMuted, marginRight: 8}}>🔎</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t(locale, 'searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => void runSearch()}
            style={[styles.input, {color: colors.text}]}
            returnKeyType="search"
          />
          <TouchableOpacity
            disabled={!canSearch || loading}
            onPress={() => void runSearch()}
            style={[styles.go, {backgroundColor: colors.primary, opacity: !canSearch || loading ? 0.45 : 1}]}>
            <Text style={{color: colors.onPrimary, fontWeight: '900'}}>Go</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!hasApiKey() ? (
        <View style={styles.center}>
          <Text style={{color: colors.text, textAlign: 'center', paddingHorizontal: 18}}>
            {t(locale, 'missingKeyBody')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{color: colors.text}}>{t(locale, 'error')}</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{gap: 12, paddingHorizontal: 16}}
          contentContainerStyle={{paddingTop: 14, paddingBottom: 24, gap: 14}}
          ListEmptyComponent={
            <Text style={{color: colors.textMuted, paddingHorizontal: 16, marginTop: 10}}>
              {t(locale, 'noResults')}
            </Text>
          }
          renderItem={({item}) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('MovieDetail', {movieId: item.id})}
              style={{flex: 1}}>
              <View style={{aspectRatio: 2 / 3, borderRadius: 16, overflow: 'hidden'}}>
                <PosterImage posterPath={item.poster_path} colors={colors} size="medium" />
              </View>
              <Text numberOfLines={2} style={{color: colors.text, marginTop: 8, fontWeight: '700'}}>
                {item.title}
              </Text>
              <Text style={{color: colors.textMuted, marginTop: 4}}>★ {item.vote_average.toFixed(1)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {flex: 1, paddingVertical: 0},
  go: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
