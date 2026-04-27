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
import { showLoginRequiredAlert } from '../utils/authGate';

/** Sarı ok — kategori tam listesine gider */
const ROW_MORE_ARROW = '#FFD60A';

export function HomeScreen() {
  const { locale, theme } = useSettings();
  const { hydrated, isLoggedIn } = useAuth();
  const { feed, insights } = useProfile();
  const navigation = useNavigation();

  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [genres, setGenres] = useState([]);
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
    if (!hydrated || !isLoggedIn) {
      showLoginRequiredAlert(navigation, locale);
      return;
    }
    navigation.navigate('Discover');
  }, [hydrated, isLoggedIn, navigation, locale]);

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
    const raw = feed?.focusGenres ?? feed?.hints?.fetchByGenres;
    const ids = Array.isArray(raw)
      ? raw.map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0)
      : [];
    if (!ids.length) {
      setPersonalFeed([]);
      return;
    }
    let cancelled = false;
    setPersonalLoading(true);
    void discoverMovies(locale, {
      with_genres: ids.join(','),
      page: 1,
      sort_by: 'popularity.desc',
    })
      .then(res => {
        if (!cancelled) {
          setPersonalFeed((res.results ?? []).filter(m => m.poster_path).slice(0, 12));
        }
      })
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
  }, [locale, hydrated, isLoggedIn, feed]);

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
