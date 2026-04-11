import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {discoverMovies, fetchGenreList, hasApiKey} from '../api/tmdbClient';
import {MOOD_GENRES} from '../constants/moodGenres';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';

const MOODS = [
  {id: 'happy', emoji: '😄', labelKey: 'moodHappy'},
  {id: 'sad', emoji: '😢', labelKey: 'moodSad'},
  {id: 'scared', emoji: '😱', labelKey: 'moodScared'},
];

export function DiscoverScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const route = useRoute();
  const navigation = useNavigation();

  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [mood, setMood] = useState(null);
  const [minYear, setMinYear] = useState(2005);
  const [maxYear, setMaxYear] = useState(new Date().getFullYear());
  const [minVote, setMinVote] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const initialGenreId = route.params?.initialGenreId;

  useEffect(() => {
    if (initialGenreId) {
      setSelectedGenre(initialGenreId);
    }
  }, [initialGenreId]);

  const loadGenres = useCallback(async () => {
    if (!hasApiKey()) {
      return;
    }
    try {
      const g = await fetchGenreList(locale);
      setGenres(g.genres);
    } catch {
      /* ignore */
    }
  }, [locale]);

  useEffect(() => {
    void loadGenres();
  }, [loadGenres]);

  const withGenres = useMemo(() => {
    if (selectedGenre) {
      return String(selectedGenre);
    }
    if (mood) {
      return MOOD_GENRES[mood].join(',');
    }
    return undefined;
  }, [mood, selectedGenre]);

  const recommend = async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const page = 1 + Math.floor(Math.random() * 3);
      const res = await discoverMovies(locale, {
        with_genres: withGenres,
        'primary_release_date.gte': `${minYear}-01-01`,
        'primary_release_date.lte': `${maxYear}-12-31`,
        'vote_average.gte': minVote,
        page,
      });
      const pool = res.results.filter(r => r.poster_path);
      if (!pool.length) {
        setError('empty');
        return;
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      navigation.navigate('MovieDetail', {movieId: pick.id});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setBusy(false);
    }
  };

  const bumpYear = (which, delta) => {
    const y = new Date().getFullYear();
    if (which === 'min') {
      setMinYear(v => Math.min(maxYear, Math.max(1970, v + delta)));
    } else {
      setMaxYear(v => Math.min(y, Math.max(minYear, v + delta)));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.top}>
        <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'discover')}</Text>
        <Text style={{color: colors.textMuted, marginTop: 6}}>{t(locale, 'filters')}</Text>
      </View>

      {!hasApiKey() ? (
        <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={{color: colors.text}}>{t(locale, 'missingKeyBody')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 32}}>
          <Text style={[styles.label, {color: colors.text}]}>{t(locale, 'moodTitle')}</Text>
          <View style={styles.row}>
            {MOODS.map(m => {
              const active = mood === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setMood(active ? null : m.id)}
                  style={[
                    styles.mood,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.surfaceElevated : colors.surface,
                    },
                    active ? shadow.soft : null,
                  ]}>
                  <Text style={{fontSize: 28}}>{m.emoji}</Text>
                  <Text style={{color: colors.text, marginTop: 6, fontWeight: '700'}}>
                    {t(locale, m.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, {color: colors.text, marginTop: 18}]}>{t(locale, 'genre')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10}}>
            <TouchableOpacity
              onPress={() => setSelectedGenre(null)}
              style={[
                styles.chip,
                {
                  borderColor: selectedGenre ? colors.border : colors.primary,
                  backgroundColor: selectedGenre ? colors.surface : colors.primary,
                },
              ]}>
              <Text
                style={{
                  color: selectedGenre ? colors.text : colors.onPrimary,
                  fontWeight: '800',
                }}>
                {t(locale, 'allGenres')}
              </Text>
            </TouchableOpacity>
            {genres.map(g => {
              const active = selectedGenre === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => setSelectedGenre(active ? null : g.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.surfaceElevated : colors.surface,
                    },
                  ]}>
                  <Text style={{color: colors.text, fontWeight: '700'}}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, {color: colors.text, marginTop: 18}]}>{t(locale, 'yearFrom')}</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => bumpYear('min', -1)}
              style={[styles.stepBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.text, fontWeight: '900'}}>−</Text>
            </TouchableOpacity>
            <Text style={{color: colors.text, fontSize: 18, fontWeight: '800', minWidth: 64, textAlign: 'center'}}>
              {minYear}
            </Text>
            <TouchableOpacity
              onPress={() => bumpYear('min', 1)}
              style={[styles.stepBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.text, fontWeight: '900'}}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, {color: colors.text, marginTop: 14}]}>{t(locale, 'yearTo')}</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => bumpYear('max', -1)}
              style={[styles.stepBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.text, fontWeight: '900'}}>−</Text>
            </TouchableOpacity>
            <Text style={{color: colors.text, fontSize: 18, fontWeight: '800', minWidth: 64, textAlign: 'center'}}>
              {maxYear}
            </Text>
            <TouchableOpacity
              onPress={() => bumpYear('max', 1)}
              style={[styles.stepBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.text, fontWeight: '900'}}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, {color: colors.text, marginTop: 14}]}>{t(locale, 'minRating')}</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => setMinVote(v => Math.max(0, Math.round((v - 0.5) * 10) / 10))}
              style={[styles.stepBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.text, fontWeight: '900'}}>−</Text>
            </TouchableOpacity>
            <Text style={{color: colors.text, fontSize: 18, fontWeight: '800', minWidth: 64, textAlign: 'center'}}>
              {minVote.toFixed(1)}
            </Text>
            <TouchableOpacity
              onPress={() => setMinVote(v => Math.min(10, Math.round((v + 0.5) * 10) / 10))}
              style={[styles.stepBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.text, fontWeight: '900'}}>+</Text>
            </TouchableOpacity>
          </View>

          {error === 'empty' ? (
            <Text style={{color: colors.pass, marginTop: 12}}>{t(locale, 'noResults')}</Text>
          ) : error ? (
            <Text style={{color: colors.pass, marginTop: 12}}>{t(locale, 'error')}</Text>
          ) : null}

          <TouchableOpacity
            disabled={busy}
            onPress={() => void recommend()}
            style={[styles.cta, {backgroundColor: colors.primary, opacity: busy ? 0.6 : 1}, shadow.hero]}>
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={{color: colors.onPrimary, fontWeight: '900', fontSize: 16}}>
                {t(locale, 'recommend')}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{color: colors.textMuted, marginTop: 10, lineHeight: 18}}>{t(locale, 'pickForYou')}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  top: {paddingHorizontal: 16, paddingBottom: 8},
  title: {fontSize: 28, fontWeight: '900'},
  card: {margin: 16, padding: 16, borderRadius: 16, borderWidth: 1},
  label: {fontSize: 14, fontWeight: '800', marginBottom: 10},
  row: {flexDirection: 'row', gap: 10},
  mood: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chip: {paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: 12},
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cta: {marginTop: 18, paddingVertical: 16, borderRadius: 16, alignItems: 'center'},
});
