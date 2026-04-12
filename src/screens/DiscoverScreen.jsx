import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {discoverMovies, fetchGenreList, hasApiKey} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {MOOD_GENRES} from '../constants/moodGenres';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';

const PICK_COUNT = 5;
const FETCH_PAGE_WINDOW = 4;
const MATCH_PERCENT_CAP = 99;
/** TMDB discover; 1970 altı yıllar da desteklenir (klavye/− ile uğraşmadan aralık seçimi). */
const MIN_RELEASE_YEAR = 1900;

function rndInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function parseYearInput(raw, fallback, lo, hi) {
  const s = String(raw ?? '').trim();
  if (!s) {
    return fallback;
  }
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(hi, Math.max(lo, n));
}

function parseVoteInput(raw, fallback) {
  const s = String(raw ?? '')
    .trim()
    .replace(',', '.');
  if (!s) {
    return fallback;
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  const clamped = Math.min(10, Math.max(0, n));
  return Math.round(clamped * 10) / 10;
}

function parseReleaseYear(movie) {
  const raw = movie.release_date;
  if (typeof raw === 'string' && raw.length >= 4) {
    const y = Number(raw.slice(0, 4));
    if (Number.isFinite(y)) {
      return y;
    }
  }
  return null;
}

/**
 * @param {object} movie TMDB discover row
 * @param {{ targetGenreIds: number[], minYear: number, maxYear: number, minVote: number }} ctx
 * @returns {number} 0..1 raw fit (not rounded)
 */
function computeDiscoverRawBlend(movie, ctx) {
  const {targetGenreIds, minYear, maxYear, minVote} = ctx;
  const midYear = (minYear + maxYear) / 2;
  const span = Math.max(1, maxYear - minYear);
  let year = parseReleaseYear(movie);
  if (year == null) {
    year = midYear;
  }
  const inRange = year >= minYear && year <= maxYear;
  const yearFit = inRange ? 1 - Math.min(1, Math.abs(year - midYear) / span) : 0.28;

  const va = typeof movie.vote_average === 'number' ? movie.vote_average : minVote;
  const voteFit = Math.min(1, Math.max(0, (va - minVote + 0.2) / Math.max(0.15, 10 - minVote)));

  let genreFit = 0.76;
  if (targetGenreIds.length) {
    const set = new Set(targetGenreIds);
    const hits = (movie.genre_ids || []).filter(id => set.has(id)).length;
    genreFit = Math.min(1, hits / Math.max(1, targetGenreIds.length));
  }

  const wGenre = targetGenreIds.length ? 0.48 : 0;
  const wVote = targetGenreIds.length ? 0.34 : 0.44;
  const wYear = targetGenreIds.length ? 0.18 : 0.56;
  const sum = wGenre + wVote + wYear;
  return (wGenre * genreFit + wVote * voteFit + wYear * yearFit) / sum;
}

/**
 * Display % for each pick: still strictly best → worst, but each run uses
 * random gaps (2–11) and jitter so values are not a fixed ladder (e.g. 95,90,85…).
 * @param {Array<{movie: object, rawBlend: number}>} sortedDesc
 */
function assignRandomSpreadMatchPercents(sortedDesc) {
  let prev = 101;
  return sortedDesc.map(row => {
    const ideal = Math.round(56 + 43 * row.rawBlend);
    const jitter = rndInt(-7, 7);
    const gap = rndInt(2, 11);
    const cap = prev - gap;
    let pct = Math.min(ideal + jitter, cap);
    if (pct >= prev) {
      pct = prev - rndInt(2, 9);
    }
    pct = Math.max(44, Math.min(MATCH_PERCENT_CAP, pct));
    prev = pct;
    return {movie: row.movie, matchPercent: pct};
  });
}

/** Sıra: genelde en çok tercih edilen hisler önce (kaydırmada öne çıkar). */
const MOODS = [
  {id: 'happy', emoji: '😄', labelKey: 'moodHappy'},
  {id: 'chill', emoji: '😎', labelKey: 'moodChill'},
  {id: 'romantic', emoji: '🥰', labelKey: 'moodRomantic'},
  {id: 'sad', emoji: '😢', labelKey: 'moodSad'},
  {id: 'hyped', emoji: '🤩', labelKey: 'moodHyped'},
  {id: 'scared', emoji: '😱', labelKey: 'moodScared'},
  {id: 'cozy', emoji: '☕', labelKey: 'moodCozy'},
  {id: 'thoughtful', emoji: '🤔', labelKey: 'moodThoughtful'},
  {id: 'adventurous', emoji: '🧭', labelKey: 'moodAdventurous'},
  {id: 'fantasy', emoji: '✨', labelKey: 'moodFantasy'},
  {id: 'crime', emoji: '🕵️', labelKey: 'moodCrime'},
  {id: 'curious', emoji: '🧐', labelKey: 'moodCurious'},
  {id: 'nostalgic', emoji: '😌', labelKey: 'moodNostalgic'},
  {id: 'melancholic', emoji: '😔', labelKey: 'moodMelancholic'},
  {id: 'playful', emoji: '😜', labelKey: 'moodPlayful'},
  {id: 'heroic', emoji: '⚔️', labelKey: 'moodHeroic'},
  {id: 'inspired', emoji: '💡', labelKey: 'moodInspired'},
  {id: 'angry', emoji: '😤', labelKey: 'moodAngry'},
  {id: 'weird', emoji: '🤪', labelKey: 'moodWeird'},
  {id: 'dark', emoji: '🖤', labelKey: 'moodDark'},
];

/** Yıl/puan stepper +/−; koyu temada basılıyken sarı (primary) dolgu. */
function DiscoverStepButton({onPress, colors, theme, label, hitSlop}) {
  const isDark = theme === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop ?? {top: 8, bottom: 8, left: 8, right: 8}}
      onPress={onPress}
      style={({pressed}) => [
        styles.stepBtn,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated,
        },
        pressed &&
          isDark && {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
          },
        pressed &&
          !isDark && {
            borderColor: colors.primaryDark,
            backgroundColor: colors.primaryDark,
          },
      ]}>
      {({pressed}) => (
        <Text style={[styles.stepGlyph, {color: pressed ? colors.onPrimary : colors.text}]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function DiscoverScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const chipBase = [
    styles.chip,
    {
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.surfaceElevated,
    },
  ];
  const route = useRoute();
  const navigation = useNavigation();

  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [mood, setMood] = useState(null);
  const currentCalendarYear = new Date().getFullYear();
  const [minYear, setMinYear] = useState(2005);
  const [maxYear, setMaxYear] = useState(currentCalendarYear);
  const [minVote, setMinVote] = useState(6);
  const [minYearText, setMinYearText] = useState('2005');
  const [maxYearText, setMaxYearText] = useState(String(currentCalendarYear));
  const [minVoteText, setMinVoteText] = useState('6.0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

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

  const targetGenreIds = useMemo(() => {
    if (selectedGenre) {
      return [selectedGenre];
    }
    if (mood && MOOD_GENRES[mood]) {
      return MOOD_GENRES[mood];
    }
    return [];
  }, [mood, selectedGenre]);

  useEffect(() => {
    setMinYearText(String(minYear));
  }, [minYear]);

  useEffect(() => {
    setMaxYearText(String(maxYear));
  }, [maxYear]);

  useEffect(() => {
    setMinVoteText(minVote.toFixed(1));
  }, [minVote]);

  useEffect(() => {
    setRecommendations([]);
  }, [mood, selectedGenre]);

  const clearPicks = useCallback(() => {
    setRecommendations([]);
  }, []);

  const recommend = async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      return;
    }
    setBusy(true);
    setError(null);
    setRecommendations([]);

    let maxParsed = parseYearInput(maxYearText, maxYear, MIN_RELEASE_YEAR, currentCalendarYear);
    let minParsed = parseYearInput(minYearText, minYear, MIN_RELEASE_YEAR, maxParsed);
    if (minParsed > maxParsed) {
      maxParsed = minParsed;
    }
    maxParsed = Math.min(currentCalendarYear, Math.max(maxParsed, minParsed));
    minParsed = Math.max(MIN_RELEASE_YEAR, Math.min(minParsed, maxParsed));
    const voteParsed = parseVoteInput(minVoteText, minVote);

    setMinYear(minParsed);
    setMaxYear(maxParsed);
    setMinVote(voteParsed);

    try {
      const base = {
        with_genres: withGenres,
        'primary_release_date.gte': `${minParsed}-01-01`,
        'primary_release_date.lte': `${maxParsed}-12-31`,
        'vote_average.gte': voteParsed,
      };
      const startPage = 1 + Math.floor(Math.random() * 5);
      const pages = Array.from({length: FETCH_PAGE_WINDOW}, (_, i) => startPage + i);
      const responses = await Promise.all(
        pages.map(page => discoverMovies(locale, {...base, page})),
      );

      const seen = new Set();
      const pool = [];
      for (const res of responses) {
        for (const r of res.results ?? []) {
          if (!r?.poster_path || seen.has(r.id)) {
            continue;
          }
          seen.add(r.id);
          pool.push(r);
        }
      }

      if (!pool.length) {
        setError('empty');
        return;
      }

      const ctx = {targetGenreIds, minYear: minParsed, maxYear: maxParsed, minVote: voteParsed};
      const scored = pool.map(movie => ({
        movie,
        rawBlend: computeDiscoverRawBlend(movie, ctx),
      }));
      scored.sort((a, b) => {
        let d = b.rawBlend - a.rawBlend;
        if (d) {
          return d;
        }
        d = (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0);
        if (d) {
          return d;
        }
        return (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0);
      });

      const top = assignRandomSpreadMatchPercents(scored.slice(0, PICK_COUNT));
      setRecommendations(top);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setBusy(false);
    }
  };

  const bumpYear = (which, delta) => {
    clearPicks();
    if (which === 'min') {
      setMinYear(v => Math.min(maxYear, Math.max(MIN_RELEASE_YEAR, v + delta)));
    } else {
      setMaxYear(v => Math.min(currentCalendarYear, Math.max(minYear, v + delta)));
    }
  };

  const commitMinYearInput = () => {
    const y = parseYearInput(minYearText, minYear, MIN_RELEASE_YEAR, maxYear);
    if (y !== minYear) {
      clearPicks();
    }
    setMinYear(y);
    setMinYearText(String(y));
  };

  const commitMaxYearInput = () => {
    const y = parseYearInput(maxYearText, maxYear, minYear, currentCalendarYear);
    if (y !== maxYear) {
      clearPicks();
    }
    setMaxYear(y);
    setMaxYearText(String(y));
  };

  const commitMinVoteInput = () => {
    const v = parseVoteInput(minVoteText, minVote);
    if (v !== minVote) {
      clearPicks();
    }
    setMinVote(v);
    setMinVoteText(v.toFixed(1));
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.head}>
        <Text style={[styles.screenTitle, {color: colors.text}]}>{t(locale, 'discover')}</Text>
        <Text style={[styles.screenSubtitle, {color: colors.textMuted}]}>{t(locale, 'whatToday')}</Text>
      </View>

      {!hasApiKey() ? (
        <View style={[styles.banner, {borderColor: colors.primary, backgroundColor: colors.surface}]}>
          <Text style={{color: colors.text, lineHeight: 20}}>{t(locale, 'missingKeyBody')}</Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{paddingBottom: 28}}
          showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.heading, {color: colors.text}]}>{t(locale, 'moodTitle')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {MOODS.map(m => {
                const active = mood === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.88}
                    onPress={() => setMood(active ? null : m.id)}
                    style={[
                      styles.chip,
                      styles.moodChip,
                      active
                        ? {borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary}
                        : {
                            borderWidth: 1,
                            borderColor: colors.primary,
                            backgroundColor: colors.surfaceElevated,
                          },
                    ]}>
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.moodChipLabel,
                        {color: active ? colors.onPrimary : colors.text, fontWeight: active ? '700' : '600'},
                      ]}>
                      {t(locale, m.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, {color: colors.text}]}>{t(locale, 'genre')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setSelectedGenre(null)}
                style={
                  selectedGenre
                    ? chipBase
                    : [styles.chip, {borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary}]
                }>
                <Text
                  style={[
                    styles.chipLabel,
                    {color: selectedGenre ? colors.text : colors.onPrimary, fontWeight: '700'},
                  ]}>
                  {t(locale, 'allGenres')}
                </Text>
              </TouchableOpacity>
              {genres.map(g => {
                const active = selectedGenre === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.88}
                    onPress={() => setSelectedGenre(active ? null : g.id)}
                    style={
                      active
                        ? [styles.chip, {borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary}]
                        : chipBase
                    }>
                    <Text
                      style={[
                        styles.chipLabel,
                        {color: active ? colors.onPrimary : colors.text, fontWeight: active ? '700' : '600'},
                      ]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, {color: colors.text}]}>{t(locale, 'discoverTuneTitle')}</Text>

            <View style={styles.filterRow}>
              <Text style={[styles.rowLabel, {color: colors.text}]}>{t(locale, 'yearFrom')}</Text>
              <View style={styles.stepper}>
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="-"
                  onPress={() => bumpYear('min', -1)}
                />
                <TextInput
                  value={minYearText}
                  onChangeText={setMinYearText}
                  onBlur={commitMinYearInput}
                  onSubmitEditing={commitMinYearInput}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={4}
                  selectTextOnFocus
                  placeholder={String(MIN_RELEASE_YEAR)}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.stepValueInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                />
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="+"
                  onPress={() => bumpYear('min', 1)}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={[styles.rowLabel, {color: colors.text}]}>{t(locale, 'yearTo')}</Text>
              <View style={styles.stepper}>
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="-"
                  onPress={() => bumpYear('max', -1)}
                />
                <TextInput
                  value={maxYearText}
                  onChangeText={setMaxYearText}
                  onBlur={commitMaxYearInput}
                  onSubmitEditing={commitMaxYearInput}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={4}
                  selectTextOnFocus
                  placeholder={String(currentCalendarYear)}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.stepValueInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                />
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="+"
                  onPress={() => bumpYear('max', 1)}
                />
              </View>
            </View>

            <View style={[styles.filterRow, styles.filterRowLast]}>
              <Text style={[styles.rowLabel, {color: colors.text}]}>{t(locale, 'minRating')}</Text>
              <View style={styles.stepper}>
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="-"
                  onPress={() => {
                    clearPicks();
                    setMinVote(v => Math.max(0, Math.round((v - 0.5) * 10) / 10));
                  }}
                />
                <TextInput
                  value={minVoteText}
                  onChangeText={setMinVoteText}
                  onBlur={commitMinVoteInput}
                  onSubmitEditing={commitMinVoteInput}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={4}
                  selectTextOnFocus
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.stepValueInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                />
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="+"
                  onPress={() => {
                    clearPicks();
                    setMinVote(v => Math.min(10, Math.round((v + 0.5) * 10) / 10));
                  }}
                />
              </View>
            </View>
          </View>

          {error === 'empty' ? (
            <View style={[styles.note, {borderColor: colors.border, backgroundColor: colors.surface}]}>
              <Text style={{color: colors.pass, fontWeight: '600', fontSize: 14}}>{t(locale, 'noResults')}</Text>
            </View>
          ) : error ? (
            <View style={[styles.note, {borderColor: colors.border, backgroundColor: colors.surface}]}>
              <Text style={{color: colors.pass, fontWeight: '600', fontSize: 14}}>{t(locale, 'error')}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={busy}
            activeOpacity={0.9}
            onPress={() => void recommend()}
            style={[
              styles.heroCta,
              {backgroundColor: colors.primary, opacity: busy ? 0.65 : 1},
              shadow.hero,
            ]}>
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.heroCtaText, {color: colors.onPrimary}]}>{t(locale, 'recommend')}</Text>
            )}
          </TouchableOpacity>

          {recommendations.length === 0 && !busy ? (
            <Text style={[styles.hint, {color: colors.textMuted}]}>{t(locale, 'pickForYou')}</Text>
          ) : null}

          {recommendations.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.heading, {color: colors.text}]}>{t(locale, 'discoverPicksTitle')}</Text>
              {recommendations.map(({movie, matchPercent}) => (
                <TouchableOpacity
                  key={movie.id}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('MovieDetail', {movieId: movie.id})}
                  style={styles.pickRow}>
                  <View style={[shadow.poster, {borderRadius: 14, backgroundColor: '#000'}]}>
                    <View style={styles.pickPosterFrame}>
                      <PosterImage posterPath={movie.poster_path} colors={colors} size="small" />
                    </View>
                  </View>
                  <View style={styles.pickBody}>
                    <Text numberOfLines={2} style={[styles.pickTitle, {color: colors.text}]}>
                      {movie.title}
                    </Text>
                    <Text style={[styles.pickMeta, {color: colors.textMuted}]}>
                      ★ {(movie.vote_average ?? 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.pickFit, {color: colors.textMuted}]}>
                      {matchPercent}% {t(locale, 'discoverFitLabel')}
                    </Text>
                  </View>
                  <Text style={[styles.pickArrow, {color: colors.textMuted}]}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  head: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  screenTitle: {fontSize: 22, fontWeight: '800', letterSpacing: -0.3},
  screenSubtitle: {marginTop: 4, fontSize: 14, fontWeight: '600', lineHeight: 19},
  banner: {marginHorizontal: 16, marginTop: 4, padding: 16, borderRadius: 16, borderWidth: 1},
  section: {marginBottom: 22},
  heading: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hScroll: {paddingHorizontal: 16, gap: 10, alignItems: 'center'},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  moodChip: {
    minWidth: 96,
    maxWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  moodEmoji: {fontSize: 24, lineHeight: 28},
  moodChipLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
    lineHeight: 15,
  },
  chipLabel: {fontSize: 14, fontWeight: '600', letterSpacing: -0.15},
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  filterRowLast: {marginBottom: 0},
  rowLabel: {fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: 10},
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: {fontSize: 20, fontWeight: '700'},
  stepValue: {fontSize: 17, fontWeight: '800', minWidth: 56, textAlign: 'center'},
  stepValueInput: {
    minWidth: 64,
    maxWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  note: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCta: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: {fontSize: 17, fontWeight: '800', letterSpacing: -0.15},
  hint: {
    marginHorizontal: 16,
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  pickPosterFrame: {
    width: 72,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  pickBody: {flex: 1, minWidth: 0},
  pickTitle: {fontSize: 14, fontWeight: '700', letterSpacing: -0.2, lineHeight: 19},
  pickMeta: {marginTop: 4, fontSize: 13, fontWeight: '600'},
  pickFit: {marginTop: 4, fontSize: 13, fontWeight: '600'},
  pickArrow: {fontSize: 22, fontWeight: '700', paddingLeft: 4},
});
