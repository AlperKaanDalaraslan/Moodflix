import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
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
  fetchTitleVideosForSwipe,
  fetchNowPlaying,
  fetchPopular,
  fetchTopRated,
  fetchUpcoming,
  hasApiKey,
  pickBestYoutubeVideoKey,
} from '../api/tmdbClient';
import { PosterImage } from '../components/PosterImage';
import { WatchPriceLine } from '../components/WhereToWatch';
import { TrailerModal } from '../components/TrailerModal';
import { YoutubeEmbed } from '../components/YoutubeEmbed';
import { useFavorites } from '../context/FavoritesContext';
import { useSettings } from '../context/SettingsContext';
import { t } from '../i18n/translations';
import { getTheme } from '../theme/colors';
import { catalogKey, kindLabel } from '../utils/catalog';

/** Aynı sayfada hep aynı sırada gelmesin */
function shuffleArray(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function mapPool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await worker(items[index]);
    }
  };
  await Promise.all(
    Array.from({length: Math.min(limit, items.length)}, () => run()),
  );
  return out;
}

async function keepTitlesWithVideo(locale, items) {
  const checked = await mapPool(items, 4, async movie => {
    const merged = await fetchTitleVideosForSwipe(
      locale,
      movie.id,
      movie.media_type === 'tv' ? 'tv' : 'movie',
    );
    const key = pickBestYoutubeVideoKey(merged);
    return key ? {...movie, swipeTrailerKey: key} : null;
  });
  return checked.filter(Boolean);
}

/**
 * Tek kaynak (popular) + dar sayfa penceresi aynı filmleri tekrar ettirir; liste çeşitlensin diye
 * popüler / en yüksek puan / vizyon / yakında arasında rastgele seçilir.
 */
async function fetchSwipeFeedPage(locale) {
  const page = 1 + Math.floor(Math.random() * 22);
  const r = Math.random();
  if (r < 0.34) {
    return fetchPopular(locale, page);
  }
  if (r < 0.58) {
    return fetchTopRated(locale, page);
  }
  if (r < 0.8) {
    return fetchNowPlaying(locale, page);
  }
  return fetchUpcoming(locale, page);
}

/**
 * Her kart aynı: 16:9 medya + sabit bilgi şeridi. YouTube’a fazla yükseklik vermeyince
 * kanal başlığı / öneri şeridi çıkmaz.
 */
function computeSwipeMetrics(contentH, winW, insetBottom) {
  const CARD_W = Math.min(404, Math.round(winW * 0.946));
  const infoH = 128;
  const headerBlock = 72;
  const deckPeek = 12;
  const actionsRowH = 8 + 64 + Math.max(insetBottom, 10) + 4;
  const reserved = headerBlock + deckPeek + actionsRowH + 8;
  const available = Math.max(240, Math.floor(contentH - reserved));
  const room = Math.max(210, available - infoH);
  let mediaH = Math.min(room, Math.round(CARD_W * 0.92));
  let width = CARD_W;
  if (mediaH < 210) {
    mediaH = Math.max(190, available - infoH);
    width = Math.min(CARD_W, Math.round(mediaH / 0.92));
  }
  return {
    CARD_W: width,
    CARD_H: mediaH + infoH,
    POSTER_CLIP_H: mediaH,
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

function FilmPulse({color, top, left}) {
  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.12],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.4],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseAnchor,
        {
          top,
          left,
          borderColor: color,
          opacity,
          transform: [{scale}],
        },
      ]}
    >
      <View style={[styles.pulseCore, {backgroundColor: color}]} />
    </Animated.View>
  );
}

function SwipeDeckSkeleton({colors, metrics}) {
  const pulse = React.useRef(new Animated.Value(0.45)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.deckColumn}>
      <View style={[styles.deckSlot, {height: metrics.CARD_H + 22, width: metrics.CARD_W}]}>
        <Animated.View
          style={[
            styles.skeletonCard,
            {
              width: metrics.CARD_W,
              height: metrics.CARD_H,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pulse,
            },
          ]}
        >
          <View
            style={[
              styles.skeletonPoster,
              {height: metrics.POSTER_CLIP_H, backgroundColor: colors.surfaceElevated},
            ]}
          >
            <FilmPulse
              color={colors.primary}
              top={(metrics.POSTER_CLIP_H - 78) / 2}
              left={(metrics.CARD_W - 78) / 2}
            />
          </View>
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, styles.skeletonLineWide, {backgroundColor: colors.border}]} />
            <View style={[styles.skeletonLine, {backgroundColor: colors.border}]} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function SwipeCard({
  movie,
  colors,
  locale,
  genreById,
  trailerKey,
  trailerModalOpen,
  showEmbed,
  trailerSurfaceBusy,
  onEmbedShellLoadEnd,
  onOpenTrailerModal,
  metrics,
  onResult,
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const movieRef = useRef(movie);
  const onResultRef = useRef(onResult);
  const swipeOutRef = useRef(metrics.SWIPE_OUT);
  movieRef.current = movie;
  onResultRef.current = onResult;
  swipeOutRef.current = metrics.SWIPE_OUT;

  const rotateZ = useMemo(
    () =>
      tx.interpolate({
        inputRange: [-220, 0, 220],
        outputRange: ['-12deg', '0deg', '12deg'],
        extrapolate: 'clamp',
      }),
    [tx],
  );

  const likeStampOpacity = useMemo(
    () =>
      tx.interpolate({
        inputRange: [-120, -36, 0],
        outputRange: [1, 0.35, 0],
        extrapolate: 'clamp',
      }),
    [tx],
  );

  const passStampOpacity = useMemo(
    () =>
      tx.interpolate({
        inputRange: [0, 36, 120],
        outputRange: [0, 0.35, 1],
        extrapolate: 'clamp',
      }),
    [tx],
  );

  const pansRef = useRef(null);
  if (pansRef.current == null) {
    const makePan = captureStart =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => captureStart,
        onStartShouldSetPanResponderCapture: () => captureStart,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 0.65,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 0.65,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderMove: (_, g) => {
          tx.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const threshold = 56;
          const vx = g.vx ?? 0;
          const passRight = g.dx > threshold || (g.dx > 28 && vx > 0.28);
          const passLeft = g.dx < -threshold || (g.dx < -28 && vx < -0.28);
          if (passRight || passLeft) {
            /** Sağ el: sola atmak (dx < 0) beğeni, sağa itmek geç */
            const action = passLeft ? 'like' : 'pass';
            const out = swipeOutRef.current;
            onResultRef.current(action, movieRef.current);
            Animated.spring(tx, {
              toValue: passRight ? out : -out,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }).start();
            return;
          }
          Animated.spring(tx, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(tx, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        },
      });
    pansRef.current = {
      card: makePan(false),
      video: makePan(true),
    };
  }

  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;
  const genres = genreLine(movie, genreById);

  return (
    <Animated.View
      style={[
        styles.card,
        { width: metrics.CARD_W, height: metrics.CARD_H },
        { transform: [{ translateX: tx }, { rotateZ }] },
      ]}
    >
      <View
        {...pansRef.current.card.panHandlers}
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
                resizeMode="cover"
                style={styles.posterFill}
              />
            ) : (
              <View style={[styles.mediaShellInner, { height: metrics.POSTER_CLIP_H }]}>
                {showEmbed ? (
                  <YoutubeEmbed
                    key={`${movie.media_type || 'movie'}-${movie.id}-${trailerKey}`}
                    videoId={trailerKey}
                    style={[
                      styles.embedInCard,
                      { height: metrics.POSTER_CLIP_H },
                      trailerSurfaceBusy ? styles.embedHidden : null,
                    ]}
                    flexLayout
                    coverZoom
                    loop
                    autoPlay
                    captionsOn
                    captionLang={String(locale || 'tr').startsWith('tr') ? 'tr' : 'en'}
                    muted={false}
                    controls={false}
                    passThroughTouches
                    waitForPlayback
                    onShellLoadEnd={onEmbedShellLoadEnd}
                  />
                ) : null}
                {!showEmbed || trailerSurfaceBusy ? (
                  <PosterImage
                    posterPath={movie.poster_path}
                    colors={colors}
                    size="backdrop"
                    resizeMode="cover"
                    style={styles.posterFill}
                  />
                ) : null}
              </View>
            )}
          </View>
          <View
            {...pansRef.current.video.panHandlers}
            style={styles.swipeCatcher}
          />
          {trailerKey && !trailerModalOpen ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t(locale, 'trailer')}
              activeOpacity={0.85}
              onPress={onOpenTrailerModal}
              style={[styles.expandBtn, {backgroundColor: 'rgba(0,0,0,0.55)'}]}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Text style={[styles.expandGlyph, {color: colors.text}]}>⤢</Text>
            </TouchableOpacity>
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stampLike,
              { borderColor: colors.like, backgroundColor: colors.surface },
              { opacity: likeStampOpacity },
            ]}
          >
            <Text style={{ color: colors.like, fontWeight: '900' }}>
              {t(locale, 'swipeStampLike')}
            </Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stampPass,
              { borderColor: colors.pass, backgroundColor: colors.surface },
              { opacity: passStampOpacity },
            ]}
          >
            <Text style={{ color: colors.pass, fontWeight: '900' }}>
              {t(locale, 'swipeStampPass')}
            </Text>
          </Animated.View>
          {trailerSurfaceBusy && !trailerModalOpen ? (
            <FilmPulse
              color={colors.primary}
              top={(metrics.POSTER_CLIP_H - 78) / 2}
              left={(metrics.CARD_W - 78) / 2}
            />
          ) : null}
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
            {movie.title || movie.name}
          </Text>
          {year || genres ? (
            <Text
              numberOfLines={1}
              style={[styles.metaLine, { color: colors.textMuted }]}
            >
              {[kindLabel(movie, locale), year, genres].filter(Boolean).join(' · ')}
            </Text>
          ) : (
            <Text
              numberOfLines={1}
              style={[styles.metaLine, { color: colors.textMuted }]}
            >
              {kindLabel(movie, locale)}
            </Text>
          )}
          <Text style={[styles.rating, { color: colors.textMuted }]}>
            ★ {(Number(movie.vote_average) || 0).toFixed(1)}
          </Text>
          <WatchPriceLine movie={movie} locale={locale} colors={colors} lines={2} />
        </View>
      </View>
    </Animated.View>
  );
}

export function SwipeScreen() {
  const navigation = useNavigation();
  const { locale, theme } = useSettings();
  const colors = getTheme(theme);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { addFavorite } = useFavorites();
  /** Tab sahnesi gerçek yüksekliği (`useWindowDimensions` tab bar hariç değil) */
  const [tabBodyH, setTabBodyH] = useState(null);
  const [addedBanner, setAddedBanner] = useState('');
  const addedBannerTimer = useRef(null);

  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [genreById, setGenreById] = useState({});
  const [trailerKey, setTrailerKey] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  /** Bu `id` için fragman isteği bitti (sonuç null da olabilir) — ilk karede yanlış “kompakt” önlemek için */
  const [trailerFetchDoneId, setTrailerFetchDoneId] = useState(null);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);
  /** WebView ilk karesi; TMDB beklerken de aynı üst overlay tek spinner kalsın */
  const [embedShellReady, setEmbedShellReady] = useState(false);
  const [swipeScreenFocused, setSwipeScreenFocused] = useState(true);
  const isSwipeTabFocused = useIsFocused();
  /** `true` ile başla: ilk açılışta “yeniden odak” sanılmasın (tab bileşeni unmount olmaz). */
  const prevSwipeTabFocusedRef = useRef(true);

  const top = deck[0];

  const showEmbed =
    Boolean(trailerKey) && swipeScreenFocused && !trailerModalOpen;

  useEffect(() => {
    setEmbedShellReady(false);
  }, [top?.id]);

  useEffect(() => {
    if (!swipeScreenFocused) {
      setEmbedShellReady(true);
    }
  }, [swipeScreenFocused]);

  const trailerSurfaceBusy =
    trailerLoading || (showEmbed && !embedShellReady);

  const onEmbedShellLoadEnd = useCallback(() => {
    setEmbedShellReady(true);
  }, []);

  const contentH = useMemo(() => {
    if (tabBodyH != null && tabBodyH > 1) {
      return tabBodyH;
    }
    const tabBarH = 58 + insets.bottom;
    return Math.max(240, winH - insets.top - tabBarH);
  }, [tabBodyH, winH, insets.top, insets.bottom]);

  const metrics = useMemo(
    () => computeSwipeMetrics(contentH, winW, insets.bottom),
    [contentH, winW, insets.bottom],
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
        const collected = [];
        const seen = new Set();
        for (let attempt = 0; attempt < 5 && collected.length < 8; attempt += 1) {
          let res = await fetchSwipeFeedPage(locale);
          let batch = (res.results ?? []).filter(m => m?.poster_path && m.id != null);
          if (!batch.length) {
            res = await fetchPopular(locale, 1 + Math.floor(Math.random() * 10));
            batch = (res.results ?? []).filter(m => m?.poster_path && m.id != null);
          }
          const playable = await keepTitlesWithVideo(locale, batch);
          for (const movie of playable) {
            const key = catalogKey(movie) || String(movie.id);
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);
            collected.push(movie);
          }
        }
        const next = shuffleArray(collected);
        if (opts?.replace) {
          setDeck(next);
        } else {
          setDeck(prev => {
            const have = new Set(prev.map(m => catalogKey(m) || String(m.id)));
            return [...prev, ...next.filter(m => !have.has(catalogKey(m) || String(m.id)))];
          });
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
    if (top.swipeTrailerKey) {
      setTrailerKey(top.swipeTrailerKey);
      setTrailerLoading(false);
      setTrailerFetchDoneId(top.id);
      return;
    }
    let cancelled = false;
    setTrailerFetchDoneId(null);
    setTrailerKey(null);
    setTrailerLoading(true);
    void (async () => {
      try {
        const merged = await fetchTitleVideosForSwipe(
          locale,
          top.id,
          top.media_type === 'tv' ? 'tv' : 'movie',
        );
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
  }, [locale, top?.id, top?.media_type, top?.swipeTrailerKey]);

  useEffect(() => {
    if (!top?.id || trailerLoading || trailerFetchDoneId !== top.id || trailerKey) {
      return;
    }
    setDeck(prev =>
      prev.filter(movie => (catalogKey(movie) || String(movie.id)) !== String(top.id) && catalogKey(movie) !== catalogKey(top)),
    );
  }, [top, trailerFetchDoneId, trailerKey, trailerLoading]);

  useEffect(() => {
    setTrailerModalOpen(false);
  }, [top?.id]);

  const onSwipe = useCallback(
    (dir, movie) => {
      const m = movie ?? top;
      if (!m) {
        return;
      }
      if (dir === 'like') {
        const ok = addFavorite({
          id: m.id,
          title: m.title || m.name,
          poster_path: m.poster_path ?? m.backdrop_path ?? null,
          media_type: m.media_type === 'tv' ? 'tv' : 'movie',
        });
        if (ok) {
          setAddedBanner(t(locale, 'swipeAddedFavorite'));
          if (addedBannerTimer.current) {
            clearTimeout(addedBannerTimer.current);
          }
          addedBannerTimer.current = setTimeout(() => {
            setAddedBanner('');
          }, 1400);
        }
      }
      setDeck(d => {
        const head = d[0];
        if (!head || catalogKey(head) !== catalogKey(m)) {
          return d;
        }
        return d.slice(1);
      });
    },
    [addFavorite, locale, top],
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
          {addedBanner ? (
            <Text style={[styles.addedBanner, { color: colors.primary }]}>
              {addedBanner}
            </Text>
          ) : null}
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
          <SwipeDeckSkeleton colors={colors} metrics={metrics} />
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
                trailerModalOpen={trailerModalOpen}
                showEmbed={showEmbed}
                trailerSurfaceBusy={trailerSurfaceBusy}
                onEmbedShellLoadEnd={onEmbedShellLoadEnd}
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
                onPress={() => onSwipe('pass', top)}
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
                onPress={() => onSwipe('like', top)}
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
  addedBanner: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
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
  swipeCatcher: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  expandBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandGlyph: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: -1,
  },
  /** Clip’ten yüksek tutulur; poster/video genişlikte dolsun */
  mediaShell: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  mediaShellInner: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
  pulseAnchor: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  posterFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 3,
    borderRadius: 0,
  },
  embedHidden: {
    opacity: 0,
  },
  skeletonCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  skeletonPoster: {
    width: '100%',
    overflow: 'hidden',
  },
  skeletonLines: {
    paddingHorizontal: 14,
    paddingTop: 16,
    gap: 10,
  },
  skeletonLine: {
    height: 12,
    width: '46%',
    borderRadius: 8,
  },
  skeletonLineWide: {
    width: '78%',
    height: 16,
  },
  embedInCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  trailerCheckingLine: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
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
  trailerBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stampLike: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    transform: [{ rotateZ: '-12deg' }],
  },
  stampPass: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    transform: [{ rotateZ: '12deg' }],
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
