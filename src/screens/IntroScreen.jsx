import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchTrendingMovies} from '../api/tmdbClient';
import {TMDB_IMAGE_BASE} from '../config/tmdb';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme, THEME_OPTIONS} from '../theme/colors';

const INTRO_THEMES = THEME_OPTIONS.filter(
  option => option.id !== 'dark' && option.id !== 'light',
);

const PAGES = [
  {
    kicker: 'introTrendKicker',
    title: 'introTrendTitle',
    body: 'introTrendBody',
    scene: 'trend',
  },
  {
    kicker: 'introDiscoverKicker',
    title: 'introDiscoverTitle',
    body: 'introDiscoverBody',
    scene: 'discover',
  },
  {
    kicker: 'introSwipeKicker',
    title: 'introSwipeTitle',
    body: 'introSwipeBody',
    scene: 'swipe',
  },
  {
    kicker: 'introListsKicker',
    title: 'introListsTitle',
    body: 'introListsBody',
    scene: 'lists',
  },
  {
    kicker: 'introShakeKicker',
    title: 'introShakeTitle',
    body: 'introShakeBody',
    scene: 'shake',
  },
];

function filmAt(films, index) {
  if (!films.length) {
    return null;
  }
  return films[index % films.length];
}

function posterUri(path, size = 'w342') {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

function FilmPoster({film, colors, style, size = 'w342'}) {
  const uri = posterUri(film?.poster_path, size);
  return (
    <View
      style={[
        styles.poster,
        {backgroundColor: colors.surfaceElevated, borderColor: colors.border},
        style,
      ]}>
      {uri ? (
        <Image source={{uri}} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
    </View>
  );
}

function Scene({kind, colors, locale, films}) {
  const a = filmAt(films, 0);
  const b = filmAt(films, 1);
  const c = filmAt(films, 2);
  const d = filmAt(films, 3);
  const e = filmAt(films, 4);

  if (kind === 'trend') {
    return (
      <View style={styles.sceneRow}>
        <FilmPoster film={a} colors={colors} style={styles.posterSide} />
        <View>
          <FilmPoster film={b} colors={colors} style={styles.posterCenter} />
          {b?.title ? (
            <Text style={[styles.caption, {color: colors.text}]} numberOfLines={1}>
              {b.title}
            </Text>
          ) : null}
        </View>
        <FilmPoster film={c} colors={colors} style={styles.posterSide} />
      </View>
    );
  }

  if (kind === 'discover') {
    const still = posterUri(b?.backdrop_path || b?.poster_path, 'w780');
    return (
      <View style={styles.discover}>
        <View style={[styles.still, {backgroundColor: colors.surfaceElevated, borderColor: colors.border}]}>
          {still ? (
            <Image source={{uri: still}} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
        </View>
        <View style={[styles.discoverCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <FilmPoster film={c} colors={colors} style={styles.discoverPoster} />
          <View style={styles.discoverCopy}>
            <Text style={[styles.discoverTitle, {color: colors.text}]} numberOfLines={2}>
              {c?.title || ''}
            </Text>
            <Text style={[styles.discoverHint, {color: colors.textMuted}]} numberOfLines={1}>
              {t(locale, 'introDiscoverKicker')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (kind === 'swipe') {
    return (
      <View style={[styles.swipeCard, {borderColor: colors.border, backgroundColor: colors.surface}]}>
        <FilmPoster film={a} colors={colors} style={styles.swipePoster} size="w500" />
        <View style={styles.swipeShade} />
        <Text style={styles.swipeTitle} numberOfLines={1}>
          {a?.title || ''}
        </Text>
        <SwipeMarks />
      </View>
    );
  }

  if (kind === 'shake') {
    return <ShakePhone films={[d, e, a]} locale={locale} />;
  }

  return (
    <View style={styles.listPair}>
      {[
        {film: a, label: t(locale, 'favorites'), mark: '♥'},
        {film: d, label: t(locale, 'watched'), mark: '✓'},
      ].map(row => (
        <View
          key={row.label}
          style={[styles.listCard, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <FilmPoster film={row.film} colors={colors} style={styles.listPoster} />
          <View style={styles.listCopy}>
            <Text style={[styles.listLabel, {color: colors.textMuted}]}>{row.label}</Text>
            <Text style={[styles.listTitle, {color: colors.text}]} numberOfLines={2}>
              {row.film?.title || ''}
            </Text>
          </View>
          <Text style={[styles.listMark, {color: colors.primary}]}>{row.mark}</Text>
        </View>
      ))}
    </View>
  );
}

const MARK_YELLOW = '#F5C518';

function PressMark({glyph, value}) {
  const scale = value.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.86],
  });
  const borderColor = value.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.85)', MARK_YELLOW],
  });
  const color = value.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', MARK_YELLOW],
  });
  return (
    <Animated.View style={[styles.mark, {borderColor, transform: [{scale}]}]}>
      <Animated.Text style={[styles.markGlyph, {color}]}>{glyph}</Animated.Text>
    </Animated.View>
  );
}

function SwipeMarks() {
  const heart = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    const press = value =>
      new Promise(resolve => {
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.delay(380),
          Animated.timing(value, {
            toValue: 0,
            duration: 220,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start(({finished}) => resolve(finished));
      });
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    (async () => {
      while (alive) {
        const heartDone = await press(heart);
        if (!alive || !heartDone) {
          break;
        }
        await wait(220);
        if (!alive) {
          break;
        }
        const checkDone = await press(check);
        if (!alive || !checkDone) {
          break;
        }
        await wait(480);
      }
    })();

    return () => {
      alive = false;
      heart.stopAnimation();
      check.stopAnimation();
    };
  }, [check, heart]);

  return (
    <View style={styles.markRow}>
      <PressMark glyph="♥" value={heart} />
      <PressMark glyph="✓" value={check} />
    </View>
  );
}

function ShakePhone({films, locale}) {
  const tilt = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [index, setIndex] = useState(0);
  const option = INTRO_THEMES[index] ?? INTRO_THEMES[0];
  const preview = getTheme(option.id);

  useEffect(() => {
    let alive = true;

    const shakeOnce = () =>
      new Promise(resolve => {
        Animated.sequence([
          Animated.timing(tilt, {
            toValue: 1,
            duration: 120,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tilt, {
            toValue: -1,
            duration: 140,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tilt, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({finished}) => resolve(finished));
      });

    const changeTheme = () =>
      new Promise(resolve => {
        Animated.timing(fade, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (!alive || !finished) {
            resolve(false);
            return;
          }
          setIndex(current => (current + 1) % INTRO_THEMES.length);
          Animated.timing(fade, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }).start(() => resolve(true));
        });
      });

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    (async () => {
      while (alive) {
        const shook = await shakeOnce();
        if (!alive || !shook) {
          break;
        }
        await changeTheme();
        if (!alive) {
          break;
        }
        await wait(1100);
      }
    })();

    return () => {
      alive = false;
      tilt.stopAnimation();
      fade.stopAnimation();
    };
  }, [fade, tilt]);

  const rotate = tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-12deg', '12deg'],
  });
  const shift = tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <View style={styles.shakeStage}>
      <Animated.View style={{transform: [{translateX: shift}, {rotate}]}}>
        <View style={[styles.phone, {borderColor: preview.border}]}>
          <View style={[styles.phoneNotch, {backgroundColor: preview.text}]} />
          <Animated.View
            style={[styles.phoneScreen, {backgroundColor: preview.background, opacity: fade}]}>
            <View style={[styles.phoneBar, {backgroundColor: preview.primary}]} />
            <View style={styles.phoneRow}>
              <FilmPoster film={films[0]} colors={preview} style={styles.phonePoster} />
              <FilmPoster film={films[1]} colors={preview} style={styles.phonePoster} />
            </View>
            <FilmPoster film={films[2]} colors={preview} style={styles.phoneWide} />
          </Animated.View>
        </View>
      </Animated.View>
      <Text style={[styles.themeName, {color: preview.primary}]}>{t(locale, option.key)}</Text>
    </View>
  );
}

export function IntroScreen() {
  const {locale, theme, completeIntro} = useSettings();
  const colors = getTheme(theme);
  const [index, setIndex] = useState(0);
  const [films, setFilms] = useState([]);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  useEffect(() => {
    let alive = true;
    fetchTrendingMovies(locale, 1)
      .then(res => {
        if (!alive) {
          return;
        }
        const next = (res?.results ?? [])
          .filter(item => item?.poster_path && item?.title)
          .slice(0, 8);
        setFilms(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [locale]);

  const advance = () => {
    if (last) {
      completeIntro();
      return;
    }
    setIndex(current => current + 1);
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <View style={styles.top}>
        <View style={styles.topCopy}>
          <Text style={[styles.welcome, {color: colors.text}]}>
            {t(locale, 'introWelcome')}
          </Text>
          <Text style={[styles.brand, {color: colors.primary}]}>Moodflix</Text>
        </View>
        <Pressable onPress={completeIntro} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.skip, {color: colors.textMuted}]}>{t(locale, 'introSkip')}</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <Scene kind={page.scene} colors={colors} locale={locale} films={films} />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.kicker, {color: colors.primary}]}>{t(locale, page.kicker)}</Text>
        <Text style={[styles.title, {color: colors.text}]}>{t(locale, page.title)}</Text>
        <Text style={[styles.body, {color: colors.textMuted}]}>{t(locale, page.body)}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((item, dot) => (
            <View
              key={item.kicker}
              style={[
                styles.dot,
                {
                  backgroundColor: dot === index ? colors.primary : colors.border,
                  width: dot === index ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={advance}
          accessibilityRole="button"
          style={[styles.button, {backgroundColor: colors.primary}]}>
          <Text style={[styles.buttonText, {color: colors.onPrimary}]}>
            {t(locale, last ? 'introStart' : 'introNext')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, paddingHorizontal: 28},
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
    gap: 12,
  },
  topCopy: {flex: 1},
  welcome: {fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4},
  brand: {marginTop: 2, fontSize: 13, fontWeight: '800', letterSpacing: 0.6},
  skip: {fontSize: 15, fontWeight: '700', paddingTop: 4},
  stage: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  copy: {paddingBottom: 28},
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  body: {marginTop: 12, fontSize: 17, lineHeight: 24, fontWeight: '500'},
  footer: {paddingBottom: 12, gap: 18},
  dots: {flexDirection: 'row', alignItems: 'center', gap: 7},
  dot: {height: 7, borderRadius: 999},
  button: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  buttonText: {fontSize: 16, fontWeight: '800', letterSpacing: 0.2},
  poster: {borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth},
  sceneRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 12},
  posterSide: {width: 78, height: 116},
  posterCenter: {width: 108, height: 162},
  caption: {
    marginTop: 8,
    width: 108,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  discover: {width: 260, alignItems: 'center'},
  still: {
    width: 260,
    height: 146,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  discoverCard: {
    marginTop: -28,
    width: 228,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 10,
  },
  discoverPoster: {width: 48, height: 72, borderRadius: 8},
  discoverCopy: {flex: 1},
  discoverTitle: {fontSize: 15, fontWeight: '800'},
  discoverHint: {marginTop: 2, fontSize: 12, fontWeight: '600'},
  swipeCard: {
    width: 210,
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  swipePoster: {width: '100%', height: '100%', borderWidth: 0, borderRadius: 0},
  swipeShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  swipeTitle: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 72,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  markRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  markGlyph: {fontSize: 20, fontWeight: '800'},
  listPair: {width: 280, gap: 12},
  listCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 12,
  },
  listPoster: {width: 52, height: 78, borderRadius: 8},
  listCopy: {flex: 1},
  listLabel: {fontSize: 12, fontWeight: '700'},
  listTitle: {marginTop: 2, fontSize: 15, fontWeight: '800'},
  listMark: {fontSize: 20, fontWeight: '800', marginRight: 6},
  shakeStage: {alignItems: 'center'},
  themeName: {marginTop: 16, fontSize: 16, fontWeight: '800', letterSpacing: -0.2},
  phone: {
    width: 168,
    height: 280,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
  },
  phoneScreen: {flex: 1, paddingTop: 28, paddingHorizontal: 12},
  phoneNotch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 52,
    height: 10,
    borderRadius: 6,
    opacity: 0.85,
  },
  phoneBar: {height: 18, borderRadius: 6, marginBottom: 10},
  phoneRow: {flexDirection: 'row', gap: 8},
  phonePoster: {flex: 1, height: 108, borderRadius: 8},
  phoneWide: {marginTop: 8, height: 78, borderRadius: 8},
});
