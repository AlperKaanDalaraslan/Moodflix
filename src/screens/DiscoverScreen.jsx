import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { discoverMovies, fetchGenreList, hasApiKey } from '../api/tmdbClient';
import { DiscoverAiHero } from '../components/DiscoverAiHero';
import { DiscoverThinking } from '../components/DiscoverThinking';
import { PosterImage } from '../components/PosterImage';
import { MOOD_GENRES } from '../constants/moodGenres';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { t } from '../i18n/translations';
import { polishPickReasons, rankDiscoverWithAi } from '../services/discoverAiService';
import { getTheme, isDarkMode } from '../theme/colors';
import { shadow } from '../theme/shadows';

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
  const { targetGenreIds, minYear, maxYear, minVote } = ctx;
  const midYear = (minYear + maxYear) / 2;
  const span = Math.max(1, maxYear - minYear);
  let year = parseReleaseYear(movie);
  if (year == null) {
    year = midYear;
  }
  const inRange = year >= minYear && year <= maxYear;
  const yearFit = inRange
    ? 1 - Math.min(1, Math.abs(year - midYear) / span)
    : 0.28;

  const va =
    typeof movie.vote_average === 'number' ? movie.vote_average : minVote;
  const voteFit = Math.min(
    1,
    Math.max(0, (va - minVote + 0.2) / Math.max(0.15, 10 - minVote)),
  );

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
    return { movie: row.movie, matchPercent: pct };
  });
}

/** Sıra: genelde en çok tercih edilen hisler önce (kaydırmada öne çıkar). */
const MOODS = [
  { id: 'happy', emoji: '😄', labelKey: 'moodHappy' },
  { id: 'chill', emoji: '😎', labelKey: 'moodChill' },
  { id: 'romantic', emoji: '🥰', labelKey: 'moodRomantic' },
  { id: 'sad', emoji: '😢', labelKey: 'moodSad' },
  { id: 'hyped', emoji: '🤩', labelKey: 'moodHyped' },
  { id: 'scared', emoji: '😱', labelKey: 'moodScared' },
  { id: 'cozy', emoji: '☕', labelKey: 'moodCozy' },
  { id: 'thoughtful', emoji: '🤔', labelKey: 'moodThoughtful' },
  { id: 'adventurous', emoji: '🧭', labelKey: 'moodAdventurous' },
  { id: 'fantasy', emoji: '✨', labelKey: 'moodFantasy' },
  { id: 'crime', emoji: '🕵️', labelKey: 'moodCrime' },
  { id: 'curious', emoji: '🧐', labelKey: 'moodCurious' },
  { id: 'nostalgic', emoji: '😌', labelKey: 'moodNostalgic' },
  { id: 'melancholic', emoji: '😔', labelKey: 'moodMelancholic' },
  { id: 'playful', emoji: '😜', labelKey: 'moodPlayful' },
  { id: 'heroic', emoji: '⚔️', labelKey: 'moodHeroic' },
  { id: 'inspired', emoji: '💡', labelKey: 'moodInspired' },
  { id: 'angry', emoji: '😤', labelKey: 'moodAngry' },
  { id: 'weird', emoji: '🤪', labelKey: 'moodWeird' },
  { id: 'dark', emoji: '🖤', labelKey: 'moodDark' },
];

/** Yıl/puan stepper +/−; koyu temada basılıyken sarı (primary) dolgu. */
function DiscoverStepButton({ onPress, colors, theme, label, hitSlop }) {
  const isDark = isDarkMode(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop ?? { top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
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
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.stepGlyph,
            { color: pressed ? colors.onPrimary : colors.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function DiscoverScreen() {
  const { locale, theme } = useSettings();
  const { hydrated, isLoggedIn, token } = useAuth();
  const { submitMood } = useProfile();
  const colors = getTheme(theme);
  const chipBase = [
    styles.chip,
    {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.primary}33`,
      backgroundColor: 'transparent',
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
  const [aiInsight, setAiInsight] = useState('');
  const [nightPrompt, setNightPrompt] = useState('');

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
    setAiInsight('');
  }, [mood, selectedGenre]);

  const clearPicks = useCallback(() => {
    setRecommendations([]);
    setAiInsight('');
  }, []);

  const recommend = async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      return;
    }
    setBusy(true);
    setError(null);
    setRecommendations([]);
    setAiInsight('');

    let maxParsed = parseYearInput(
      maxYearText,
      maxYear,
      MIN_RELEASE_YEAR,
      currentCalendarYear,
    );
    let minParsed = parseYearInput(
      minYearText,
      minYear,
      MIN_RELEASE_YEAR,
      maxParsed,
    );
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
      const pages = Array.from(
        { length: FETCH_PAGE_WINDOW },
        (_, i) => startPage + i,
      );
      const responses = await Promise.all(
        pages.map(page => discoverMovies(locale, { ...base, page })),
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

      const ctx = {
        targetGenreIds,
        minYear: minParsed,
        maxYear: maxParsed,
        minVote: voteParsed,
      };
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

      const localTop = assignRandomSpreadMatchPercents(scored.slice(0, PICK_COUNT));
      const genreNameById = {};
      (genres || []).forEach(g => {
        genreNameById[g.id] = g.name;
      });
      try {
        const ai = await rankDiscoverWithAi({
          mood,
          prompt: nightPrompt,
          locale,
          minYear: minParsed,
          maxYear: maxParsed,
          minVote: voteParsed,
          candidates: scored.slice(0, 18).map(row => ({
            id: row.movie.id,
            title: row.movie.title,
            year: parseReleaseYear(row.movie),
            voteAverage: row.movie.vote_average,
            popularity: row.movie.popularity,
            overview: row.movie.overview,
            genres: (row.movie.genre_ids || [])
              .map(id => genreNameById[id])
              .filter(Boolean),
          })),
        });
        const byId = new Map(pool.map(m => [Number(m.id), m]));
        const copyCtx = {locale, mood, prompt: nightPrompt};
        const withGenresOnMovie = movie => ({
          ...movie,
          genres: (movie.genre_ids || [])
            .map(id => genreNameById[id])
            .filter(Boolean),
        });
        const merged = (ai.picks || [])
          .map(p => {
            const movie = byId.get(Number(p.id));
            if (!movie) {
              return null;
            }
            return {
              movie: withGenresOnMovie(movie),
              matchPercent: p.percent,
              reason: p.reason,
            };
          })
          .filter(Boolean);
        if (merged.length) {
          setAiInsight(ai.insight || '');
          setRecommendations(polishPickReasons(merged, copyCtx));
        } else {
          setRecommendations(
            polishPickReasons(
              localTop.map(row => ({
                ...row,
                movie: withGenresOnMovie(row.movie),
              })),
              copyCtx,
            ),
          );
        }
      } catch {
        setRecommendations(
          polishPickReasons(
            localTop.map(row => ({
              ...row,
              movie: {
                ...row.movie,
                genres: (row.movie.genre_ids || [])
                  .map(id => genreNameById[id])
                  .filter(Boolean),
              },
            })),
            {locale, mood, prompt: nightPrompt},
          ),
        );
      }
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
      setMaxYear(v =>
        Math.min(currentCalendarYear, Math.max(minYear, v + delta)),
      );
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
    const y = parseYearInput(
      maxYearText,
      maxYear,
      minYear,
      currentCalendarYear,
    );
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <DiscoverAiHero
        colors={colors}
        badge={t(locale, 'discoverAiBadge')}
        title={t(locale, 'discover')}
        subtitle={t(locale, 'discoverAiSubtitle')}
      />

      {!hasApiKey() ? (
        <View
          style={[
            styles.banner,
            { borderColor: colors.primary, backgroundColor: colors.surface },
          ]}
        >
          <Text style={{ color: colors.text, lineHeight: 20 }}>
            {t(locale, 'missingKeyBody')}
          </Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.kickerHeading, { color: colors.primary }]}>
              {t(locale, 'moodTitle')}
            </Text>
            <TextInput
              value={nightPrompt}
              onChangeText={setNightPrompt}
              placeholder={t(locale, 'discoverAiPromptPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.promptBox,
                {
                  color: colors.text,
                  borderColor: `${colors.primary}40`,
                  backgroundColor: colors.surface,
                },
              ]}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {MOODS.map(m => {
                const active = mood === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.88}
                    onPress={() => {
                      if (!active) {
                        setMood(m.id);
                        if (hydrated && isLoggedIn && token) {
                          void submitMood({ mood: m.id, context: 'discover' });
                        }
                      } else {
                        setMood(null);
                      }
                    }}
                    style={[
                      styles.chip,
                      styles.moodChip,
                      active
                        ? {
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: colors.primary,
                            backgroundColor: `${colors.primary}22`,
                          }
                        : {
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: `${colors.primary}28`,
                            backgroundColor: 'transparent',
                          },
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.moodChipLabel,
                        {
                          color: active ? colors.primary : colors.textMuted,
                          fontWeight: active ? '600' : '400',
                        },
                      ]}
                    >
                      {t(locale, m.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.kickerHeading, { color: colors.primary }]}>
              {t(locale, 'genre')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setSelectedGenre(null)}
                style={
                  selectedGenre
                    ? chipBase
                    : [
                        styles.chip,
                        {
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.primary,
                          backgroundColor: `${colors.primary}22`,
                        },
                      ]
                }
              >
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: selectedGenre ? colors.textMuted : colors.primary,
                      fontWeight: '500',
                    },
                  ]}
                >
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
                        ? [
                            styles.chip,
                            {
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: colors.primary,
                              backgroundColor: `${colors.primary}22`,
                            },
                          ]
                        : chipBase
                    }
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        {
                          color: active ? colors.primary : colors.textMuted,
                          fontWeight: active ? '600' : '400',
                        },
                      ]}
                    >
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.kickerHeading, { color: colors.primary }]}>
              {t(locale, 'discoverTuneTitle')}
            </Text>

            <View
              style={[
                styles.tunePanel,
                {
                  borderColor: `${colors.primary}28`,
                  backgroundColor: colors.surface,
                },
              ]}
            >
            <View style={styles.filterRow}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {t(locale, 'yearFrom')}
              </Text>
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
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {t(locale, 'yearTo')}
              </Text>
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
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {t(locale, 'minRating')}
              </Text>
              <View style={styles.stepper}>
                <DiscoverStepButton
                  theme={theme}
                  colors={colors}
                  label="-"
                  onPress={() => {
                    clearPicks();
                    setMinVote(v =>
                      Math.max(0, Math.round((v - 0.5) * 10) / 10),
                    );
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
                    setMinVote(v =>
                      Math.min(10, Math.round((v + 0.5) * 10) / 10),
                    );
                  }}
                />
              </View>
            </View>
            </View>
          </View>

          {error === 'empty' ? (
            <View
              style={[
                styles.note,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={{ color: colors.pass, fontWeight: '600', fontSize: 14 }}
              >
                {t(locale, 'noResults')}
              </Text>
            </View>
          ) : error ? (
            <View
              style={[
                styles.note,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={{ color: colors.pass, fontWeight: '600', fontSize: 14 }}
              >
                {t(locale, 'error')}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={busy}
            activeOpacity={0.9}
            onPress={() => void recommend()}
            style={[
              styles.heroCta,
              {
                backgroundColor: colors.primary,
                opacity: busy ? 0.7 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.heroCtaText, { color: colors.onPrimary }]}>
                ✦  {t(locale, 'recommend')}
              </Text>
            )}
          </TouchableOpacity>

          {busy ? (
            <DiscoverThinking
              colors={colors}
              kicker={t(locale, 'discoverAiThinking')}
              steps={[
                t(locale, 'discoverAiStepScan'),
                t(locale, 'discoverAiStepMood'),
                t(locale, 'discoverAiStepPool'),
                t(locale, 'discoverAiStepRank'),
              ]}
            />
          ) : null}

          {recommendations.length === 0 && !busy ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t(locale, 'pickForYou')}
            </Text>
          ) : null}

          {aiInsight && !busy ? (
            <View
              style={[
                styles.insightCard,
                {
                  borderColor: `${colors.primary}40`,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.insightKicker, { color: colors.primary }]}>
                {t(locale, 'discoverAiInsightTitle')}
              </Text>
              <Text style={[styles.insightBody, { color: colors.text }]}>
                {aiInsight}
              </Text>
            </View>
          ) : null}

          {recommendations.length > 0 && !busy ? (
            <View style={styles.section}>
              <Text style={[styles.kickerHeading, { color: colors.primary }]}>
                {t(locale, 'discoverPicksTitle')}
              </Text>
              {recommendations.map(({ movie, matchPercent, reason }, index) => (
                <TouchableOpacity
                  key={movie.id}
                  activeOpacity={0.88}
                  onPress={() =>
                    navigation.navigate('MovieDetail', { movieId: movie.id })
                  }
                  style={[
                    styles.pickCard,
                    {
                      borderColor:
                        index === 0 ? `${colors.primary}66` : `${colors.primary}22`,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text style={[styles.pickIndex, { color: `${colors.primary}99` }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <View style={[styles.pickPosterFrame, shadow.poster]}>
                    <PosterImage
                      posterPath={movie.poster_path}
                      colors={colors}
                      size="small"
                    />
                  </View>
                  <View style={styles.pickBody}>
                    <View style={styles.pickTop}>
                      <Text
                        numberOfLines={2}
                        style={[styles.pickTitle, { color: colors.text, flex: 1 }]}
                      >
                        {movie.title}
                      </Text>
                      <View
                        style={[
                          styles.fitPill,
                          { borderColor: `${colors.primary}88` },
                        ]}
                      >
                        <Text
                          style={[styles.fitPillText, { color: colors.primary }]}
                        >
                          {matchPercent}%
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.pickMeta, { color: colors.textMuted }]}
                    >
                      ★ {(movie.vote_average ?? 0).toFixed(1)}
                    </Text>
                    {reason ? (
                      <Text
                        numberOfLines={4}
                        style={[styles.pickReason, { color: colors.textMuted }]}
                      >
                        {reason}
                      </Text>
                    ) : null}
                  </View>
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
  safe: { flex: 1 },
  head: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  screenSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  section: { marginBottom: 28 },
  heading: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  kickerHeading: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.6,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  promptBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    minHeight: 64,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  insightCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  insightKicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.4,
    marginBottom: 8,
  },
  insightBody: { fontSize: 15, fontWeight: '400', lineHeight: 23, letterSpacing: 0.15 },
  hScroll: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  moodChip: {
    minWidth: 88,
    maxWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  moodEmoji: { fontSize: 22, lineHeight: 26 },
  moodChipLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: 14,
  },
  chipLabel: { fontSize: 13, fontWeight: '400', letterSpacing: 0.3 },
  tunePanel: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  filterRowLast: { marginBottom: 4 },
  rowLabel: { fontSize: 14, fontWeight: '400', flex: 1, marginRight: 12, letterSpacing: 0.2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontSize: 18, fontWeight: '400' },
  stepValue: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 56,
    textAlign: 'center',
  },
  stepValueInput: {
    minWidth: 62,
    maxWidth: 76,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  note: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCta: {
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: { fontSize: 14, fontWeight: '600', letterSpacing: 1.8 },
  hint: {
    marginHorizontal: 28,
    marginTop: 4,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pickIndex: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.6,
    marginTop: 4,
    width: 22,
  },
  pickTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fitPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fitPillText: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6 },
  pickReason: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    letterSpacing: 0.15,
  },
  pickPosterFrame: {
    width: 78,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  pickBody: { flex: 1, minWidth: 0 },
  pickTitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 21,
  },
  pickMeta: { marginTop: 4, fontSize: 12, fontWeight: '400', letterSpacing: 0.4 },
  pickFit: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  pickArrow: { fontSize: 22, fontWeight: '700', paddingLeft: 4 },
});
