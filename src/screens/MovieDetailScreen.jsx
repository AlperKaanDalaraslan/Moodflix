import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchMovieDetail, hasApiKey} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useFavorites} from '../context/FavoritesContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

export function MovieDetailScreen() {
  const {params} = useRoute();
  const navigation = useNavigation();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const {toggleFavorite, isFavorite} = useFavorites();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const movieId = params?.movieId;

  const load = useCallback(async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      setLoading(false);
      return;
    }
    if (movieId == null) {
      setError('err');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const m = await fetchMovieDetail(locale, movieId);
      setMovie(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setLoading(false);
    }
  }, [locale, movieId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fav = movie ? isFavorite(movie.id) : false;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: movie
        ? () => (
            <TouchableOpacity
              onPress={() => toggleFavorite(movie)}
              style={{paddingHorizontal: 12, paddingVertical: 8}}>
              <Text style={{color: fav ? colors.primary : colors.text, fontSize: 18}}>
                {fav ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [colors.primary, colors.text, fav, movie, navigation, toggleFavorite]);

  const trailerKey = movie?.videos?.results?.find(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
  )?.key;

  const director =
    movie?.credits?.crew?.find(c => c.job === 'Director')?.name ?? '—';
  const writer =
    movie?.credits?.crew?.find(c => c.job === 'Writer' || c.job === 'Screenplay')
      ?.name ?? '—';

  const openTrailer = () => {
    if (!trailerKey) {
      return;
    }
    void Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
  };

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: colors.background}]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{color: colors.textMuted, marginTop: 10}}>{t(locale, 'loading')}</Text>
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={[styles.center, {backgroundColor: colors.background, padding: 20}]}>
        <Text style={{color: colors.text, textAlign: 'center'}}>
          {error === 'TMDB_API_KEY_MISSING' ? t(locale, 'missingKeyBody') : t(locale, 'error')}
        </Text>
        <TouchableOpacity
          onPress={() => void load()}
          style={[styles.cta, {backgroundColor: colors.primary, marginTop: 12}]}>
          <Text style={{color: colors.onPrimary, fontWeight: '800'}}>{t(locale, 'tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.background}} edges={['bottom']}>
      <ScrollView contentContainerStyle={{paddingBottom: 24}} showsVerticalScrollIndicator={false}>
        <View style={{paddingHorizontal: 16, paddingTop: 8}}>
          <View style={{aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden'}}>
            <PosterImage posterPath={movie.backdrop_path ?? movie.poster_path} colors={colors} size="large" />
            {trailerKey ? (
              <Pressable onPress={openTrailer} style={styles.play}>
                <View style={[styles.playBtn, {backgroundColor: colors.primary}]}>
                  <Text style={{color: colors.onPrimary, fontWeight: '900'}}>▶</Text>
                </View>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.title, {color: colors.text}]}>{movie.title}</Text>
          <Text style={{color: colors.textMuted, marginTop: 6}}>
            {year} · {t(locale, 'rating')}: ★ {movie.vote_average.toFixed(1)}
          </Text>

          <View style={styles.tags}>
            {(movie.genres ?? []).slice(0, 4).map(g => (
              <View key={g.id} style={[styles.tag, {backgroundColor: colors.primary}]}>
                <Text style={{color: colors.onPrimary, fontWeight: '800'}}>{g.name}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.metaCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Text style={{color: colors.textMuted}}>{t(locale, 'director')}</Text>
            <Text style={{color: colors.text, fontWeight: '700', marginTop: 4}}>{director}</Text>
            <Text style={{color: colors.textMuted, marginTop: 10}}>{t(locale, 'writer')}</Text>
            <Text style={{color: colors.text, fontWeight: '700', marginTop: 4}}>{writer}</Text>
            {movie.runtime ? (
              <>
                <Text style={{color: colors.textMuted, marginTop: 10}}>{t(locale, 'runtime')}</Text>
                <Text style={{color: colors.text, fontWeight: '700', marginTop: 4}}>
                  {movie.runtime} {t(locale, 'minutes')}
                </Text>
              </>
            ) : null}
          </View>

          {trailerKey ? (
            <TouchableOpacity
              onPress={openTrailer}
              style={[styles.ctaWide, {backgroundColor: colors.primary}]}>
              <Text style={{color: colors.onPrimary, fontWeight: '900'}}>{t(locale, 'trailer')}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.sectionTitle, {color: colors.text}]}>{t(locale, 'overview')}</Text>
          <Text style={{color: colors.textMuted, lineHeight: 20}}>{movie.overview || '—'}</Text>

          <Text style={[styles.sectionTitle, {color: colors.text, marginTop: 18}]}>
            {t(locale, 'cast')}
          </Text>
        </View>

        <FlatList
          horizontal
          data={(movie.credits?.cast ?? []).slice(0, 16)}
          keyExtractor={item => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 16, gap: 12}}
          renderItem={({item}) => (
            <View style={{width: 92}}>
              <View style={{aspectRatio: 1, borderRadius: 999, overflow: 'hidden'}}>
                <PosterImage posterPath={item.profile_path} colors={colors} size="small" />
              </View>
              <Text numberOfLines={2} style={{color: colors.text, marginTop: 8, fontWeight: '700'}}>
                {item.name}
              </Text>
              <Text numberOfLines={2} style={{color: colors.textMuted, fontSize: 12}}>
                {item.character}
              </Text>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 26, fontWeight: '900', marginTop: 14},
  tags: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  tag: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999},
  metaCard: {marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1},
  cta: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999},
  ctaWide: {marginTop: 14, paddingVertical: 14, borderRadius: 16, alignItems: 'center'},
  sectionTitle: {fontSize: 16, fontWeight: '900', marginBottom: 10, marginTop: 16},
  play: {...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center'},
  playBtn: {width: 54, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
});
