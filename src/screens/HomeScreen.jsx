import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  discoverMovies,
  fetchMovieDetail,
  fetchGenreList,
  fetchNowPlaying,
  fetchPopular,
  fetchTopRated,
  fetchTrendingMovies,
  fetchUpcoming,
  hasApiKey,
} from '../api/tmdbClient';
import { PosterImage } from '../components/PosterImage';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { t } from '../i18n/translations';
import { getTheme } from '../theme/colors';
import { shadow } from '../theme/shadows';
import { MOOD_GENRES } from '../constants/moodGenres';
import { getRecommendations } from '../services/profileService';

/** Sarı ok — kategori tam listesine gider */
const ROW_MORE_ARROW = '#FFD60A';
const MIN_PERSONAL_FEED_COUNT = 5;

function collectPositiveGenreIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(x => Number(x))
    .filter(n => Number.isFinite(n) && n > 0);
}

function normalizeName(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function toGenreNameIdMap(genres) {
  const map = new Map();
  for (const g of genres ?? []) {
    const key = normalizeName(g?.name);
    const id = Number(g?.id);
    if (key && Number.isFinite(id) && id > 0) {
      map.set(key, id);
    }
  }
  return map;
}

function scoreMovieForUser(movie, weightedGenres) {
  const CHILDISH_GENRE_IDS = new Set([16, 10751]);
  const vote = Number(movie?.vote_average);
  const popularity = Number(movie?.popularity);
  const movieGenres = Array.isArray(movie?.genre_ids) ? movie.genre_ids : [];
  let genreHitScore = 0;
  let childishHit = 0;
  for (const id of movieGenres) {
    genreHitScore += weightedGenres.get(id) ?? 0;
    if (CHILDISH_GENRE_IDS.has(id)) {
      childishHit += 1;
    }
  }
  const qualityScore = Number.isFinite(vote) ? Math.min(1, Math.max(0, vote / 10)) : 0.45;
  const popularityScore = Number.isFinite(popularity)
    ? Math.min(1, Math.log10(1 + Math.max(0, popularity)) / 3)
    : 0.35;
  const weightedTotal = [...weightedGenres.values()].reduce((sum, value) => sum + value, 0);
  const childishWeight = (weightedGenres.get(16) ?? 0) + (weightedGenres.get(10751) ?? 0);
  const childishAffinity = weightedTotal > 0 ? childishWeight / weightedTotal : 0;
  const childishPenalty =
    childishAffinity < 0.18 && childishHit > 0 ? Math.min(0.35, 0.14 * childishHit) : 0;
  return (
    genreHitScore * 0.62 + qualityScore * 0.28 + popularityScore * 0.1 - childishPenalty
  );
}

export function HomeScreen() {
  const { locale, theme } = useSettings();
  const { hydrated, isLoggedIn, token } = useAuth();
  const { feed, insights, profile } = useProfile();
  const navigation = useNavigation();

  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreCatalog, setGenreCatalog] = useState([]);
  const [backendRecoEnabled, setBackendRecoEnabled] = useState(true);
  const [personalFeed, setPersonalFeed] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const colors = getTheme(theme);
  const insightGenre =
    typeof insights?.headlineGenre === 'string' ? insights.headlineGenre : null;
  const insightPercentNumber = Number(insights?.headlinePercent);
  const insightPercent = Number.isFinite(insightPercentNumber)
    ? Math.round(insightPercentNumber)
    : null;
  const feedTasteSummary =
    typeof feed?.tasteSummary === 'string'
      ? feed.tasteSummary
      : typeof feed?.summary === 'string'
        ? feed.summary
        : null;
  const feedMoodTrend = typeof feed?.moodTrend === 'string' ? feed.moodTrend : null;
  const feedHintsLine = Array.isArray(feed?.hints)
    ? feed.hints.filter(x => typeof x === 'string' && x.trim()).join(' · ')
    : typeof feed?.hints === 'string'
      ? feed.hints
      : null;

  const goDiscoverPersonalized = useCallback(() => {
    navigation.navigate('Discover');
  }, [navigation]);

  const load = useCallback(async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tr, pop, top, now, up, g] = await Promise.all([
        fetchTrendingMovies(locale),
        fetchPopular(locale, 1),
        fetchTopRated(locale, 1),
        fetchNowPlaying(locale, 1),
        fetchUpcoming(locale, 1),
        fetchGenreList(locale),
      ]);
      setTrending(tr.results.slice(0, 12));
      setPopular(pop.results.slice(0, 12));
      setTopRated(top.results.slice(0, 12));
      setNowPlaying(now.results.slice(0, 12));
      setUpcoming(up.results.slice(0, 12));
      setGenreCatalog(g.genres);
      setGenres(g.genres.slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hydrated || !isLoggedIn || !hasApiKey()) {
      setPersonalFeed([]);
      return;
    }
    const weightByGenreId = new Map();
    const addGenreWeights = (ids, weight) => {
      for (const id of ids) {
        weightByGenreId.set(id, (weightByGenreId.get(id) ?? 0) + weight);
      }
    };
    const genreNameMap = toGenreNameIdMap(genreCatalog);

    addGenreWeights(
      collectPositiveGenreIds(feed?.focusGenres ?? feed?.hints?.fetchByGenres),
      4.6,
    );

    const profileMood = normalizeName(profile?.mood || feed?.mood || null);
    if (profileMood && MOOD_GENRES[profileMood]) {
      addGenreWeights(MOOD_GENRES[profileMood], 2.8);
    }

    if (
      insights?.genreBreakdown &&
      typeof insights.genreBreakdown === 'object' &&
      !Array.isArray(insights.genreBreakdown)
    ) {
      Object.entries(insights.genreBreakdown).forEach(([name, value]) => {
        const genreId = genreNameMap.get(normalizeName(name));
        const num = Number(value);
        if (genreId && Number.isFinite(num) && num > 0) {
          weightByGenreId.set(genreId, (weightByGenreId.get(genreId) ?? 0) + num / 16);
        }
      });
    }

    if (Array.isArray(profile?.favoriteGenres)) {
      for (const name of profile.favoriteGenres) {
        const genreId = genreNameMap.get(normalizeName(name));
        if (genreId) {
          weightByGenreId.set(genreId, (weightByGenreId.get(genreId) ?? 0) + 2.4);
        }
      }
    }

    const extractMovieGenres = movie => {
      const fromIds = collectPositiveGenreIds(movie?.genreIds ?? movie?.genre_ids);
      if (fromIds.length) {
        return fromIds;
      }
      if (Array.isArray(movie?.genres)) {
        const idsByName = movie.genres
          .map(name => genreNameMap.get(normalizeName(name)))
          .filter(Boolean);
        return collectPositiveGenreIds(idsByName);
      }
      return [];
    };

    for (const movie of profile?.likedMovies ?? []) {
      addGenreWeights(extractMovieGenres(movie), 1.9);
    }
    for (const movie of profile?.favoriteMovies ?? []) {
      addGenreWeights(extractMovieGenres(movie), 2.3);
    }
    for (const movie of profile?.watchedMovies ?? []) {
      addGenreWeights(extractMovieGenres(movie), 1.1);
    }

    const topGenreIds = [...weightByGenreId.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 5);

    if (!topGenreIds.length) {
      setPersonalFeed([]);
      return;
    }

    const interactedMovieIds = new Set(
      [
        ...(profile?.likedMovies ?? []),
        ...(profile?.favoriteMovies ?? []),
        ...(profile?.watchedMovies ?? []),
      ]
        .map(m => Number(m?.movieId ?? m?.id))
        .filter(id => Number.isFinite(id) && id > 0),
    );

    const discoverQueries = [
      {
        with_genres: topGenreIds.slice(0, 2).join(','),
        page: 1,
        sort_by: 'vote_average.desc',
        'vote_average.gte': 6.2,
        'vote_count.gte': 120,
      },
      ...topGenreIds.slice(0, 4).map((id, index) => ({
        with_genres: String(id),
        page: 1 + index,
        sort_by: index % 2 === 0 ? 'popularity.desc' : 'vote_average.desc',
        'vote_average.gte': 5.8,
        'vote_count.gte': 60,
      })),
    ];

    let cancelled = false;
    setPersonalLoading(true);
    const loadBackendRecommendations = async () => {
      if (!token || !backendRecoEnabled) {
        return [];
      }
      const payload = await getRecommendations(token, { limit: 20, includeSeen: false });
      if (payload?.meta?.unavailable) {
        setBackendRecoEnabled(false);
        return [];
      }
      const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      const movieIds = items
        .map(item => Number(item?.movieId))
        .filter(id => Number.isFinite(id) && id > 0)
        .slice(0, 12);
      if (!movieIds.length) {
        return [];
      }
      const detailResults = await Promise.allSettled(
        movieIds.map(movieId => fetchMovieDetail(locale, movieId)),
      );
      const detailsById = new Map();
      for (const detail of detailResults) {
        if (detail.status === 'fulfilled' && detail.value?.id) {
          const id = Number(detail.value.id);
          const genreIds = Array.isArray(detail.value.genres)
            ? detail.value.genres
                .map(g => Number(g?.id))
                .filter(n => Number.isFinite(n) && n > 0)
            : [];
          detailsById.set(id, {
            ...detail.value,
            genre_ids: genreIds,
          });
        }
      }
      return movieIds
        .map(id => detailsById.get(id))
        .filter(Boolean)
        .sort(
          (a, b) =>
            scoreMovieForUser(b, weightByGenreId) - scoreMovieForUser(a, weightByGenreId),
        )
        .slice(0, 12);
    };
    const topUpToMinimum = async initialList => {
      const next = Array.isArray(initialList) ? [...initialList] : [];
      if (next.length >= MIN_PERSONAL_FEED_COUNT) {
        return next.slice(0, 12);
      }
      const blockedIds = new Set([
        ...interactedMovieIds,
        ...next.map(m => Number(m?.id)).filter(id => Number.isFinite(id) && id > 0),
      ]);
      const broadenedGenres = topGenreIds.slice(0, 5);
      const discoverTopUpQueries = [
        ...broadenedGenres.map((id, idx) => ({
          with_genres: String(id),
          page: 3 + idx,
          sort_by: 'vote_average.desc',
          'vote_average.gte': 5.4,
          'vote_count.gte': 25,
        })),
        {
          with_genres: broadenedGenres.join(','),
          page: 2,
          sort_by: 'popularity.desc',
          'vote_average.gte': 5.0,
          'vote_count.gte': 20,
        },
      ].filter(q => q.with_genres);
      const extraResults = await Promise.allSettled(
        discoverTopUpQueries.map(params =>
          discoverMovies(locale, params).catch(() => ({ results: [] })),
        ),
      );
      for (const result of extraResults) {
        if (next.length >= MIN_PERSONAL_FEED_COUNT) {
          break;
        }
        if (result.status !== 'fulfilled') {
          continue;
        }
        for (const movie of result.value?.results ?? []) {
          const id = Number(movie?.id);
          if (
            !Number.isFinite(id) ||
            id <= 0 ||
            blockedIds.has(id) ||
            !movie?.poster_path
          ) {
            continue;
          }
          blockedIds.add(id);
          next.push(movie);
          if (next.length >= 12) {
            break;
          }
          if (next.length >= MIN_PERSONAL_FEED_COUNT) {
            break;
          }
        }
      }
      return next.slice(0, 12);
    };
    const loadLocalFallback = () =>
      Promise.allSettled(discoverQueries.map(params => discoverMovies(locale, params)))
      .then(async results => {
        if (cancelled) {
          return;
        }
        const seen = new Set();
        const pool = [];
        for (const result of results) {
          if (result.status !== 'fulfilled') {
            continue;
          }
          for (const movie of result.value?.results ?? []) {
            const id = Number(movie?.id);
            if (
              !Number.isFinite(id) ||
              id <= 0 ||
              !movie?.poster_path ||
              interactedMovieIds.has(id) ||
              seen.has(id)
            ) {
              continue;
            }
            seen.add(id);
            pool.push(movie);
          }
        }
        const scored = pool
          .map(movie => ({
            movie,
            score: scoreMovieForUser(movie, weightByGenreId),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map(row => row.movie);
        const completed = await topUpToMinimum(scored);
        setPersonalFeed(completed);
      });
    void loadBackendRecommendations()
      .then(async backendMovies => {
        if (cancelled) {
          return;
        }
        if (backendMovies.length) {
          const completed = await topUpToMinimum(backendMovies);
          setPersonalFeed(completed);
          return;
        }
        return loadLocalFallback();
      })
      .catch(() => loadLocalFallback())
      .catch(() => {
        if (!cancelled) {
          setPersonalFeed([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPersonalLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    locale,
    hydrated,
    isLoggedIn,
    token,
    feed,
    profile,
    insights,
    genreCatalog,
    backendRecoEnabled,
  ]);

  const goMovie = id => {
    navigation.navigate('MovieDetail', { movieId: id });
  };

  const openCategory = (categoryId, titleKey) => {
    navigation.navigate('CategoryList', { categoryId, titleKey });
  };

  const renderRow = (title, data, categoryId, titleKey, opts) => {
    const staticHeader = Boolean(opts?.staticHeader);
    return (
    <View style={styles.section}>
      {staticHeader ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
      ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${t(locale, 'seeAllCategory')}`}
        onPress={() => openCategory(categoryId, titleKey)}
        style={({ pressed }) => [
          styles.sectionHeaderRow,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            styles.sectionHeaderTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.seeAllText, { color: colors.primary }]}>
          {t(locale, 'seeAll')}
        </Text>
      </Pressable>
      )}
      <FlatList
        horizontal
        data={data}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          alignItems: 'flex-start',
        }}
        ListFooterComponent={
          staticHeader ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(locale, 'seeAllCategory')}
            onPress={() => openCategory(categoryId, titleKey)}
            style={({ pressed }) => [
              styles.rowEndMore,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.rowEndArrow, { color: ROW_MORE_ARROW }]}>
              →
            </Text>
          </Pressable>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => goMovie(item.id)} style={{ width: 120 }}>
            <View
              style={[
                shadow.poster,
                { borderRadius: 14, backgroundColor: '#000' },
              ]}
            >
              <View
                style={{
                  aspectRatio: 2 / 3,
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <PosterImage
                  posterPath={item.poster_path}
                  colors={colors}
                  size="medium"
                />
              </View>
            </View>
            <Text
              numberOfLines={2}
              style={{
                color: colors.text,
                marginTop: 10,
                fontSize: 14,
                fontWeight: '700',
                letterSpacing: -0.2,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                fontWeight: '600',
                marginTop: 2,
              }}
            >
              ★ {(Number(item.vote_average) || 0).toFixed(1)}
            </Text>
          </Pressable>
        )}
      />
    </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: colors.primary }]}>
            {t(locale, 'appName')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={[
            styles.profileBtn,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {t(locale, 'profile')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>
            {t(locale, 'loading')}
          </Text>
        </View>
      ) : error === 'TMDB_API_KEY_MISSING' ? (
        <View
          style={[
            styles.banner,
            { borderColor: colors.primary, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            {t(locale, 'missingKeyTitle')}
          </Text>
          <Text
            style={{ color: colors.textMuted, marginTop: 6, lineHeight: 20 }}
          >
            {t(locale, 'missingKeyBody')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>{t(locale, 'error')}</Text>
          <TouchableOpacity
            onPress={() => void load()}
            style={[styles.cta, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>
              {t(locale, 'tryAgain')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={goDiscoverPersonalized}
            style={[
              styles.heroCta,
              { backgroundColor: colors.primary },
              shadow.hero,
            ]}
          >
            <Text style={[styles.heroCtaText, { color: colors.onPrimary }]}>
              {t(locale, 'whatToday')}
            </Text>
            <Text
              style={{ color: colors.onPrimary, opacity: 0.85, marginTop: 4 }}
            >
              {t(locale, 'pickForYou')}
            </Text>
          </TouchableOpacity>

          {hydrated && isLoggedIn && insightGenre && insightPercent != null ? (
            <View
              style={[
                styles.insightBanner,
                { borderColor: colors.primary, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.insightBannerTitle, { color: colors.text }]}>
                {t(locale, 'profileYourTaste')}
              </Text>
              <Text style={[styles.insightBannerBody, { color: colors.textMuted }]}>
                {t(locale, 'profileInsightLine')
                  .replace('{percent}', String(insightPercent))
                  .replace('{genre}', insightGenre)}
              </Text>
            </View>
          ) : null}

          {hydrated && isLoggedIn && (feedTasteSummary || feedMoodTrend || feedHintsLine) ? (
            <View style={[styles.feedSummary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {feedTasteSummary ? (
                <Text style={[styles.feedSummaryText, { color: colors.text }]}>{feedTasteSummary}</Text>
              ) : null}
              {feedMoodTrend ? (
                <Text style={[styles.feedSummarySub, { color: colors.textMuted }]}>{feedMoodTrend}</Text>
              ) : null}
              {feedHintsLine ? (
                <Text style={[styles.feedSummarySub, { color: colors.textMuted, marginTop: 6 }]}>{feedHintsLine}</Text>
              ) : null}
            </View>
          ) : null}

          {hydrated && isLoggedIn && (personalLoading || personalFeed.length > 0) ? (
            personalLoading && personalFeed.length === 0 ? (
              <View style={styles.personalLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.textMuted, marginTop: 8 }}>{t(locale, 'loading')}</Text>
              </View>
            ) : personalFeed.length ? (
              renderRow(t(locale, 'homePersonalFeed'), personalFeed, 'popular', 'popular', {
                staticHeader: true,
              })
            ) : null
          ) : null}

          {renderRow(t(locale, 'trending'), trending, 'trending', 'trending')}
          {renderRow(t(locale, 'popular'), popular, 'popular', 'popular')}
          {renderRow(t(locale, 'topRated'), topRated, 'topRated', 'topRated')}
          {renderRow(
            t(locale, 'nowPlaying'),
            nowPlaying,
            'nowPlaying',
            'nowPlaying',
          )}
          {renderRow(t(locale, 'upcoming'), upcoming, 'upcoming', 'upcoming')}

          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                styles.sectionHeadingBlock,
                { color: colors.text },
              ]}
            >
              {t(locale, 'categories')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {genres.map(g => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() =>
                    navigation.navigate('Discover', { initialGenreId: g.id })
                  }
                  style={[
                    styles.chip,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  profileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroCta: {
    marginHorizontal: 16,
    marginBottom: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  heroCtaText: { fontSize: 17, fontWeight: '800' },
  section: { marginBottom: 22 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionHeaderTitle: { flex: 1, minWidth: 0 },
  sectionHeadingBlock: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  rowEndMore: {
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 8,
    minHeight: 200,
    width: 48,
  },
  rowEndArrow: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  banner: { margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '800' },
  cta: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  insightBanner: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  insightBannerTitle: { fontSize: 16, fontWeight: '800' },
  insightBannerBody: { marginTop: 6, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  feedSummary: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feedSummaryText: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  feedSummarySub: { marginTop: 6, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  personalLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
