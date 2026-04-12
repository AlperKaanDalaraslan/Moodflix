import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  fetchGenreList,
  fetchMovieVideosForSwipe,
  fetchPopular,
  hasApiKey,
  pickBestYoutubeVideoKey,
} from '../api/tmdbClient';
import { PosterImage } from '../components/PosterImage';
import { TrailerModal } from '../components/TrailerModal';
import { YoutubeEmbed } from '../components/YoutubeEmbed';
import { useFavorites } from '../context/FavoritesContext';
import { useSettings } from '../context/SettingsContext';
import { t } from '../i18n/translations';
import { getTheme } from '../theme/colors';

/**
 * Fragman var: özet yok → ince bilgi şeridi; kalan yükseklik videoda (coverZoom ile dolar).
 * Sadece poster: geniş metin alanı (scroll).
 *
 * @param {number} contentH — SafeAreaView içi yükseklik (üst inset zaten uygulanmış)
 */
function computeSwipeMetrics(contentH, winW, insetBottom, hasTrailer, noTrailerKnown) {
  const CARD_W = Math.min(404, Math.round(winW * 0.946));
  const poster16 = Math.round((CARD_W * 9) / 16);
  /** Gerçek `screenHeader`: başlık + 2 satır ipucu + padding */
  const headerBlock = 88;
  /** `deckSlot` arkadaki kartlar için +22 */
  const deckPeek = 22;
  /** `styles.actions`: marginTop 10 + daire 64 + paddingBottom (home indicator) */
  const actionsRowH = 10 + 64 + Math.max(insetBottom, 10) + 6;
  const gap = 8;
  const reserved = headerBlock + deckPeek + actionsRowH + gap;
  const available = Math.max(120, Math.floor(contentH - reserved));
  const maxCard = Math.min(Math.floor(contentH * 0.82), available);

  if (hasTrailer) {
    /** Başlık (2 satır) + meta + puan + Fragman; 108’de ScrollView ile düğme kırpılıyordu */
    const infoH = 140;
    const posterH = Math.max(poster16, maxCard - infoH);
    const cardH = posterH + infoH;
    return {
      CARD_W,
      CARD_H: cardH,
      POSTER_CLIP_H: posterH,
      INFO_BLOCK_H: infoH,
      SWIPE_OUT: winW * 1.25,
    };
  }

  const minInfo = 96;
  /** TMDB’de fragman yok: dev metin alanı boş gri bırakıyordu */
  const maxInfo = noTrailerKnown ? 200 : 272;
  const wantInfo = available - poster16;
  const infoH = Math.min(maxInfo, Math.max(minInfo, wantInfo));
  const cardH = poster16 + infoH;
  return {
    CARD_W,
    CARD_H: cardH,
    POSTER_CLIP_H: poster16,
    INFO_BLOCK_H: infoH,
    SWIPE_OUT: winW * 1.25,
  };
}

function genreLine(movie, genreById) {
  const ids = movie.genre_ids ?? [];
  const names = ids
    .slice(0, 3)
    .map(id => genreById[id])
    .filter(Boolean);
  return names.length ? names.join(' · ') : null;
}

function SwipeCard({
  movie,
  colors,
  locale,
  genreById,
  trailerKey,
  trailerLoading,
  trailerModalOpen,
  swipeScreenFocused,
  metrics,
  onOpenTrailerModal,
  onResult,
}) {
  const tx = useRef(new Animated.Value(0)).current;

  const rotateZ = useMemo(
    () =>
      tx.interpolate({
        inputRange: [-220, 0, 220],
        outputRange: ['-12deg', '0deg', '12deg'],
        extrapolate: 'clamp',
      }),
    [tx],
  );

  const stampOpacity = useMemo(
    () =>
      tx.interpolate({
        inputRange: [-180, -50, 0, 50, 180],
        outputRange: [1, 0.15, 0, 0.6, 1],
        extrapolate: 'clamp',
      }),
    [tx],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) + 6,
        /** Dikey scroll (özet) ile çakışmasın; yatay baskın kaydırma */
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) + 8,
        onPanResponderMove: (_, g) => {
          tx.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const threshold = 110;
          if (g.dx > threshold) {
            Animated.spring(tx, {
              toValue: metrics.SWIPE_OUT,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }).start(({ finished }) => {
              if (finished) {
                onResult('right');
              }
            });
          } else if (g.dx < -threshold) {
            Animated.spring(tx, {
              toValue: -metrics.SWIPE_OUT,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }).start(({ finished }) => {
              if (finished) {
                onResult('left');
              }
            });
          } else {
            Animated.spring(tx, {
              toValue: 0,
              useNativeDriver: true,
              friction: 6,
            }).start();
          }
        },
      }),
    [metrics.SWIPE_OUT, onResult, tx],
  );

  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;
  const genres = genreLine(movie, genreById);
  const overview = (movie.overview ?? '').trim();

  const showEmbed =
    Boolean(trailerKey) && swipeScreenFocused && !trailerModalOpen;

  return (
    <Animated.View
      style={[
        styles.card,
        { width: metrics.CARD_W, height: metrics.CARD_H },
        { transform: [{ translateX: tx }, { rotateZ }] },
      ]}
    >
      <View
        {...panResponder.panHandlers}
        style={[
          styles.cardPanSurface,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.posterClip, { height: metrics.POSTER_CLIP_H }]}>
          <View style={[styles.mediaShell, { height: metrics.POSTER_CLIP_H }]}>
            {trailerModalOpen ? (
              <PosterImage
                posterPath={movie.poster_path}
                colors={colors}
                size="backdrop"
                resizeMode="contain"
              />
            ) : trailerLoading ? (
              <View
                style={[
                  styles.videoLoading,
                  { backgroundColor: colors.background },
                ]}
              >
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : showEmbed ? (
              <YoutubeEmbed
                key={`${movie.id}-${trailerKey}`}
                videoId={trailerKey}
                style={styles.embedInCard}
                flexLayout
                coverZoom
                loop
                autoPlay
                cinemaMode
                muted={false}
                controls={false}
                passThroughTouches
              />
            ) : (
              <PosterImage
                posterPath={movie.poster_path}
                colors={colors}
                size="backdrop"
                resizeMode="contain"
              />
            )}
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stamp,
              { borderColor: colors.like, backgroundColor: colors.surface },
              { opacity: stampOpacity },
            ]}
          >
            <Text style={{ color: colors.like, fontWeight: '900' }}>LIKE</Text>
          </Animated.View>
        </View>

        <View
          style={[
            styles.infoPanel,
            {
              height: metrics.INFO_BLOCK_H,
              backgroundColor: colors.surfaceElevated,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Text
            numberOfLines={2}
            style={[styles.title, { color: colors.text }]}
          >
            {movie.title}
          </Text>
          {year || genres ? (
            <Text
              numberOfLines={1}
              style={[styles.metaLine, { color: colors.textMuted }]}
            >
              {[year, genres].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <Text style={[styles.rating, { color: colors.textMuted }]}>
            ★ {movie.vote_average.toFixed(1)}
          </Text>
          {trailerLoading ? (
            <View
              style={[
                styles.trailerCheckingRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.trailerCheckingText, { color: colors.textMuted }]}>
                {t(locale, 'trailerChecking')}
              </Text>
            </View>
          ) : trailerKey ? (
            <TouchableOpacity
              onPress={onOpenTrailerModal}
              activeOpacity={0.85}
              style={[styles.trailerBtn, { backgroundColor: colors.primary }]}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
            >
              <Text
                style={[styles.trailerBtnText, { color: colors.onPrimary }]}
              >
                ▶ {t(locale, 'trailer')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {overview && !showEmbed ? (
            <ScrollView
              style={styles.infoScroll}
              contentContainerStyle={styles.infoScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Text style={[styles.overview, { color: colors.text }]}>{overview}</Text>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export function SwipeScreen() {
  const { locale, theme } = useSettings();
  const colors = getTheme(theme);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { toggleFavorite, isFavorite } = useFavorites();
  /** Tab sahnesi gerçek yüksekliği (`useWindowDimensions` tab bar hariç değil) */
  const [tabBodyH, setTabBodyH] = useState(null);

  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [genreById, setGenreById] = useState({});
  const [trailerKey, setTrailerKey] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  /** Bu `id` için fragman isteği bitti (sonuç null da olabilir) — ilk karede yanlış “kompakt” önlemek için */
  const [trailerFetchDoneId, setTrailerFetchDoneId] = useState(null);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);
  const [swipeScreenFocused, setSwipeScreenFocused] = useState(true);
  const isSwipeTabFocused = useIsFocused();
  /** `true` ile başla: ilk açılışta “yeniden odak” sanılmasın (tab bileşeni unmount olmaz). */
  const prevSwipeTabFocusedRef = useRef(true);

  const top = deck[0];
  const contentH = useMemo(() => {
    if (tabBodyH != null && tabBodyH > 1) {
      return tabBodyH;
    }
    const tabBarH = 58 + insets.bottom;
    return Math.max(240, winH - insets.top - tabBarH);
  }, [tabBodyH, winH, insets.top, insets.bottom]);

  const noTrailerKnown = Boolean(
    top && hasApiKey() && trailerFetchDoneId === top.id && !trailerKey,
  );

  const metrics = useMemo(
    () =>
      computeSwipeMetrics(
        contentH,
        winW,
        insets.bottom,
        Boolean(top && (trailerKey || trailerLoading)),
        noTrailerKnown,
      ),
    [contentH, top?.id, trailerKey, trailerLoading, noTrailerKnown, winW, insets.bottom],
  );

  const loadMore = useCallback(
    async opts => {
      if (!hasApiKey()) {
        setError('TMDB_API_KEY_MISSING');
        if (!opts?.silent) {
          setLoading(false);
        }
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const page = 1 + Math.floor(Math.random() * 8);
        const res = await fetchPopular(locale, page);
        const next = res.results.filter(m => m.poster_path);
        if (opts?.replace) {
          setDeck(next);
        } else {
          setDeck(prev => [...prev, ...next]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'err');
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [locale],
  );

  useFocusEffect(
    useCallback(() => {
      setSwipeScreenFocused(true);
      return () => {
        setSwipeScreenFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    const wasFocused = prevSwipeTabFocusedRef.current;
    prevSwipeTabFocusedRef.current = isSwipeTabFocused;
    if (isSwipeTabFocused && !wasFocused) {
      void loadMore({ replace: true });
    }
  }, [isSwipeTabFocused, loadMore]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (!hasApiKey()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const g = await fetchGenreList(locale);
        if (cancelled) {
          return;
        }
        const map = {};
        (g.genres ?? []).forEach(x => {
          map[x.id] = x.name;
        });
        setGenreById(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!top?.id || !hasApiKey()) {
      setTrailerKey(null);
      setTrailerLoading(false);
      setTrailerFetchDoneId(null);
      return;
    }
    let cancelled = false;
    setTrailerFetchDoneId(null);
    setTrailerKey(null);
    setTrailerLoading(true);
    void (async () => {
      try {
        const merged = await fetchMovieVideosForSwipe(locale, top.id);
        const key = pickBestYoutubeVideoKey(merged);
        if (!cancelled) {
          setTrailerKey(key);
        }
      } catch {
        if (!cancelled) {
          setTrailerKey(null);
        }
      } finally {
        if (!cancelled) {
          setTrailerLoading(false);
          setTrailerFetchDoneId(top.id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, top?.id]);

  useEffect(() => {
    setTrailerModalOpen(false);
  }, [top?.id]);

  const onSwipe = useCallback(
    dir => {
      if (!top) {
        return;
      }
      if (dir === 'right' && !isFavorite(top.id)) {
        toggleFavorite(top);
      }
      setDeck(d => d.slice(1));
    },
    [isFavorite, toggleFavorite, top],
  );

  useEffect(() => {
    if (!loading && deck.length > 0 && deck.length < 6) {
      void loadMore({ silent: true });
    }
  }, [deck.length, loadMore, loading]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={styles.tabBody}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h > 1 && Math.abs(h - (tabBodyH ?? 0)) > 0.5) {
            setTabBodyH(h);
          }
        }}
      >
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            {t(locale, 'swipe')}
          </Text>
          <Text
            style={[styles.screenHint, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {t(locale, 'swipeHint')}
          </Text>
        </View>

        {!hasApiKey() ? (
          <View style={styles.center}>
            <Text style={{ color: colors.text, textAlign: 'center' }}>
              {t(locale, 'missingKeyBody')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: colors.text }}>{t(locale, 'error')}</Text>
            <TouchableOpacity
              onPress={() => void loadMore()}
              style={[styles.reload, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>
                {t(locale, 'tryAgain')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : loading && !top ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !top ? (
          <View style={styles.center}>
            <Text style={{ color: colors.text, textAlign: 'center' }}>
              {t(locale, 'stackEmpty')}
            </Text>
          </View>
        ) : (
          <View style={styles.deckColumn}>
            <TrailerModal
              visible={trailerModalOpen}
              videoId={trailerKey}
              onClose={() => setTrailerModalOpen(false)}
              colors={colors}
              locale={locale}
            />
            <View
              style={[
                styles.deckSlot,
                {
                  height: metrics.CARD_H + 22,
                  width: metrics.CARD_W,
                },
              ]}
            >
              {deck[2] ? (
                <View
                  style={[
                    styles.back,
                    {
                      width: metrics.CARD_W,
                      height: metrics.CARD_H,
                      transform: [{ scale: 0.92 }],
                      top: 16,
                    },
                  ]}
                >
                  <PosterImage
                    posterPath={deck[2].poster_path}
                    colors={colors}
                    size="large"
                  />
                </View>
              ) : null}
              {deck[1] ? (
                <View
                  style={[
                    styles.back,
                    {
                      width: metrics.CARD_W,
                      height: metrics.CARD_H,
                      transform: [{ scale: 0.96 }],
                      top: 9,
                    },
                  ]}
                >
                  <PosterImage
                    posterPath={deck[1].poster_path}
                    colors={colors}
                    size="large"
                  />
                </View>
              ) : null}
              <SwipeCard
                key={top.id}
                movie={top}
                colors={colors}
                locale={locale}
                genreById={genreById}
                trailerKey={trailerKey}
                trailerLoading={trailerLoading}
                trailerModalOpen={trailerModalOpen}
                swipeScreenFocused={swipeScreenFocused}
                metrics={metrics}
                onOpenTrailerModal={() => setTrailerModalOpen(true)}
                onResult={onSwipe}
              />
            </View>

            <View
              style={[
                styles.actions,
                { paddingBottom: Math.max(insets.bottom, 10) + 6 },
              ]}
            >
              <TouchableOpacity
                onPress={() => onSwipe('left')}
                style={[
                  styles.circle,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.pass,
                    fontSize: 26,
                    fontWeight: '900',
                  }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSwipe('right')}
                style={[
                  styles.circle,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 26,
                    fontWeight: '900',
                  }}
                >
                  ♥
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabBody: { flex: 1, minHeight: 0 },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  screenHint: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
  deckColumn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    minHeight: 0,
  },
  deckSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  reload: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  card: {
    position: 'absolute',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  back: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    opacity: 0.62,
  },
  cardPanSurface: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  posterClip: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  /** Clip’ten yüksek tutulur; poster/video genişlikte dolsun */
  mediaShell: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  embedInCard: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanel: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoScroll: {
    flex: 1,
    marginTop: 4,
    minHeight: 0,
  },
  infoScrollContent: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  metaLine: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  overview: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    opacity: 0.9,
    flexShrink: 1,
  },
  rating: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
  },
  trailerBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trailerCheckingRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  trailerCheckingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trailerBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stamp: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    transform: [{ rotateZ: '-12deg' }],
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
