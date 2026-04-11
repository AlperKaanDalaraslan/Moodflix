import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchPopular, hasApiKey} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useFavorites} from '../context/FavoritesContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

const {width} = Dimensions.get('window');
const CARD_W = Math.min(360, width * 0.9);
const CARD_H = CARD_W * 1.45;
const SWIPE_OUT = width * 1.2;

function SwipeCard({movie, colors, onResult}) {
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
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
        onPanResponderMove: (_, g) => {
          tx.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const threshold = 110;
          if (g.dx > threshold) {
            Animated.spring(tx, {
              toValue: SWIPE_OUT,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }).start(({finished}) => {
              if (finished) {
                onResult('right');
              }
            });
          } else if (g.dx < -threshold) {
            Animated.spring(tx, {
              toValue: -SWIPE_OUT,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }).start(({finished}) => {
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
    [onResult, tx],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {width: CARD_W, height: CARD_H},
        {transform: [{translateX: tx}, {rotateZ}]},
      ]}>
      <View style={{flex: 1, borderRadius: 22, overflow: 'hidden'}}>
        <PosterImage posterPath={movie.poster_path} colors={colors} size="large" />
        <View style={styles.bottomScrim} pointerEvents="none" />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stamp,
            {borderColor: colors.like, backgroundColor: colors.surface},
            {opacity: stampOpacity},
          ]}>
          <Text style={{color: colors.like, fontWeight: '900'}}>LIKE</Text>
        </Animated.View>
        <View style={styles.meta}>
          <Text numberOfLines={2} style={[styles.title, {color: colors.text}]}>
            {movie.title}
          </Text>
          <Text style={[styles.rating, {color: colors.textMuted}]}>
            ★ {movie.vote_average.toFixed(1)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function SwipeScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const {toggleFavorite, isFavorite} = useFavorites();

  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setDeck(prev => [...prev, ...next]);
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

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const top = deck[0];

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
      void loadMore({silent: true});
    }
  }, [deck.length, loadMore, loading]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <Text style={{color: colors.text, fontSize: 22, fontWeight: '900'}}>{t(locale, 'swipe')}</Text>
        <Text style={{color: colors.textMuted, marginTop: 6}}>{t(locale, 'swipeHint')}</Text>
      </View>

      {!hasApiKey() ? (
        <View style={styles.center}>
          <Text style={{color: colors.text, textAlign: 'center'}}>{t(locale, 'missingKeyBody')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{color: colors.text}}>{t(locale, 'error')}</Text>
          <TouchableOpacity
            onPress={() => void loadMore()}
            style={[styles.reload, {backgroundColor: colors.primary}]}>
            <Text style={{color: colors.onPrimary, fontWeight: '800'}}>{t(locale, 'tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !top ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !top ? (
        <View style={styles.center}>
          <Text style={{color: colors.text, textAlign: 'center'}}>{t(locale, 'stackEmpty')}</Text>
        </View>
      ) : (
        <View style={{flex: 1, alignItems: 'center', paddingTop: 8}}>
          <View style={{height: CARD_H + 24, width: CARD_W, alignItems: 'center', justifyContent: 'center'}}>
            {deck[2] ? (
              <View style={[styles.back, {width: CARD_W, height: CARD_H, transform: [{scale: 0.92}], top: 18}]}>
                <PosterImage posterPath={deck[2].poster_path} colors={colors} size="large" />
              </View>
            ) : null}
            {deck[1] ? (
              <View style={[styles.back, {width: CARD_W, height: CARD_H, transform: [{scale: 0.96}], top: 10}]}>
                <PosterImage posterPath={deck[1].poster_path} colors={colors} size="large" />
              </View>
            ) : null}
            <SwipeCard key={top.id} movie={top} colors={colors} onResult={onSwipe} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => onSwipe('left')}
              style={[styles.circle, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.pass, fontSize: 26, fontWeight: '900'}}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSwipe('right')}
              style={[styles.circle, {borderColor: colors.primary, backgroundColor: colors.surfaceElevated}]}>
              <Text style={{color: colors.primary, fontSize: 26, fontWeight: '900'}}>♥</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  reload: {marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999},
  card: {
    position: 'absolute',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
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
  /** Keeps the poster vivid while text stays readable at the bottom */
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  meta: {position: 'absolute', left: 14, right: 14, bottom: 16},
  title: {
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 8,
  },
  rating: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 6,
  },
  stamp: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    transform: [{rotateZ: '-12deg'}],
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 18,
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
