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
import {hasApiKey, searchMoviesForQuery} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {WatchPriceLine} from '../components/WhereToWatch';
import {SearchEmptyState} from '../components/SearchEmptyState';
import {useAuth} from '../context/AuthContext';
import {useProfile} from '../context/ProfileContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';
import {kindLabel} from '../utils/catalog';

function normalizeLooseQuery(input) {
  return String(input ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ı]/g, 'i')
    .replace(/[İ]/g, 'i')
    .replace(/[ş]/g, 's')
    .replace(/[ğ]/g, 'g')
    .replace(/[ç]/g, 'c')
    .replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/['".,!?;:()[\]{}\-_/\\|@#$%^&*+=~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function SearchScreen() {
  const {locale, theme} = useSettings();
  const {hydrated, isLoggedIn, token} = useAuth();
  const {submitSearchLog} = useProfile();
  const colors = getTheme(theme);
  const navigation = useNavigation();

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  /** Last query we actually sent to the API — drives empty-state copy */
  const [searchedFor, setSearchedFor] = useState('');

  const canSearch = useMemo(() => normalizeLooseQuery(q).length >= 2, [q]);

  const emptyVariant = useMemo(() => {
    if (!canSearch) {
      return 'idle';
    }
    if (searchedFor === q.trim()) {
      return 'noMatch';
    }
    return 'ready';
  }, [canSearch, q, searchedFor]);

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
      const raw = q.trim();
      const res = await searchMoviesForQuery(locale, raw, 1);
      setResults(res.results ?? []);
      setSearchedFor(raw);
      if (hydrated && isLoggedIn && token) {
        void submitSearchLog(raw);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setLoading(false);
    }
  }, [canSearch, locale, q, hydrated, isLoggedIn, token, submitSearchLog]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <Text style={{color: colors.text, fontSize: 22, fontWeight: '900'}}>{t(locale, 'search')}</Text>
      </View>

      <View style={{paddingHorizontal: 16}}>
        <View
          style={[
            styles.inputWrap,
            {backgroundColor: colors.surfaceElevated, borderColor: colors.border},
            shadow.soft,
          ]}>
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
          keyExtractor={item => `${item.media_type || 'movie'}:${item.id}`}
          numColumns={2}
          columnWrapperStyle={{gap: 12, paddingHorizontal: 16}}
          contentContainerStyle={
            results.length === 0
              ? {
                  paddingTop: 14,
                  paddingBottom: 24,
                  flexGrow: 1,
                  justifyContent: 'center',
                }
              : {paddingTop: 14, paddingBottom: 24, gap: 14}
          }
          ListEmptyComponent={
            <SearchEmptyState colors={colors} locale={locale} variant={emptyVariant} />
          }
          renderItem={({item}) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('MovieDetail', {
                  movieId: item.id,
                  mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
                })
              }
              style={{flex: 1}}>
              <View style={[shadow.poster, {borderRadius: 16, backgroundColor: '#000'}]}>
                <View style={{aspectRatio: 2 / 3, borderRadius: 16, overflow: 'hidden'}}>
                  <PosterImage posterPath={item.poster_path} colors={colors} size="medium" />
                  <View
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: 8,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: 'rgba(0,0,0,0.72)',
                    }}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 10,
                        fontWeight: '700',
                        letterSpacing: 0.4,
                      }}>
                      {kindLabel(item, locale)}
                    </Text>
                  </View>
                </View>
              </View>
              <Text
                numberOfLines={2}
                style={{color: colors.text, marginTop: 10, fontWeight: '700', fontSize: 14, letterSpacing: -0.2}}>
                {item.title}
              </Text>
              {item.original_title && item.original_title !== item.title ? (
                <Text
                  numberOfLines={1}
                  style={{color: colors.textMuted, marginTop: 2, fontSize: 12, fontWeight: '500'}}>
                  {item.original_title}
                </Text>
              ) : null}
              <Text style={{color: colors.textMuted, marginTop: 4, fontWeight: '600'}}>
                ★ {(item.vote_average ?? 0).toFixed(1)}
              </Text>
              <WatchPriceLine movie={item} locale={locale} colors={colors} lines={2} />
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
