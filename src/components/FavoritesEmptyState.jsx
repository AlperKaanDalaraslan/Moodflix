import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {t} from '../i18n/translations';
import {shadow} from '../theme/shadows';

const winH = Dimensions.get('window').height;

const POSTER_COUNT = 5;

export function FavoritesEmptyState({colors, locale, navigation}) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartFloat = useRef(new Animated.Value(0)).current;
  const stripShift = useRef(new Animated.Value(0)).current;
  const stripTilt = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const bobRef = useRef(
    Array.from({length: POSTER_COUNT}, () => new Animated.Value(0)),
  );
  const bob = bobRef.current;

  useEffect(() => {
    const heartBeat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const heartDrift = Animated.loop(
      Animated.sequence([
        Animated.timing(heartFloat, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heartFloat, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const stripLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(stripShift, {
            toValue: 1,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(stripShift, {
            toValue: 0,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(stripTilt, {
            toValue: 1,
            duration: 3200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(stripTilt, {
            toValue: 0,
            duration: 3200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const bobLoops = bob.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(v, {
            toValue: 1,
            duration: 520,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 520,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(800 - i * 80),
        ]),
      ),
    );

    heartBeat.start();
    heartDrift.start();
    stripLoop.start();
    ringLoop.start();
    shimmerLoop.start();
    bobLoops.forEach(l => l.start());

    return () => {
      heartBeat.stop();
      heartDrift.stop();
      stripLoop.stop();
      ringLoop.stop();
      shimmerLoop.stop();
      bobLoops.forEach(l => l.stop());
    };
  }, [bob, heartFloat, heartScale, ring, shimmer, stripShift, stripTilt]);

  const stripX = stripShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });
  const stripRotate = stripTilt.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2.5deg', '2.5deg'],
  });

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.35],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.5, 0.22, 0],
  });

  const floatY = heartFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 220],
  });

  const tilt = [-3, -1.5, 0, 1.5, 3];

  return (
    <View style={[styles.outer, {minHeight: Math.max(440, winH * 0.58)}]}>
      <View style={[styles.ambient, {backgroundColor: colors.primary}]} pointerEvents="none" />
      <View style={[styles.ambient2, {backgroundColor: colors.primary}]} pointerEvents="none" />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(locale, 'favoritesEmptySwipeCta')}
        accessibilityHint={t(locale, 'favoritesEmptySwipeA11y')}
        onPress={() => navigation.navigate('Swipe')}
        style={({pressed}) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.96 : 1,
          },
          shadow.poster,
        ]}>
        <View style={[styles.spine, {backgroundColor: colors.primary}]} />

        <View style={[styles.topAccent, {backgroundColor: colors.primary}]} />

        <View style={styles.shimmerClip}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBar,
              {
                transform: [{translateX: shimmerX}, {rotate: '-18deg'}],
                backgroundColor: 'rgba(255,245,200,0.07)',
              },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.filmRow,
            {
              transform: [{translateX: stripX}, {rotate: stripRotate}],
            },
          ]}>
          {tilt.map((deg, i) => {
            const ty = bob[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -5],
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.frame,
                  {
                    borderColor: colors.border,
                    transform: [{rotate: `${deg}deg`}, {translateY: ty}],
                  },
                ]}>
                <View style={[styles.sprocket, {backgroundColor: colors.border}]} />
                <View
                  style={[
                    styles.frameGlass,
                    {
                      borderColor: 'rgba(255,255,255,0.08)',
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                />
                <View style={[styles.sprocket, {backgroundColor: colors.border}]} />
              </Animated.View>
            );
          })}
        </Animated.View>

        <View style={styles.heartStage}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                borderColor: colors.primary,
                opacity: ringOpacity,
                transform: [{scale: ringScale}],
              },
            ]}
          />
          <Animated.View
            style={{
              transform: [{scale: heartScale}, {translateY: floatY}],
              alignItems: 'center',
            }}>
            <Text
              style={[
                styles.bigHeart,
                {
                  color: colors.primary,
                  textShadowColor: 'rgba(245,197,24,0.45)',
                  textShadowOffset: {width: 0, height: 0},
                  textShadowRadius: 18,
                },
              ]}>
              ♥
            </Text>
          </Animated.View>
        </View>

        <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'favoritesEmptyTitle')}</Text>
        <Text style={[styles.body, {color: colors.textMuted}]}>{t(locale, 'favoritesEmpty')}</Text>

        <View style={[styles.ctaRow, {backgroundColor: colors.primary}, shadow.hero]}>
          <Text style={styles.ctaGlyph}>⇄</Text>
          <Text style={[styles.ctaPillText, {color: colors.onPrimary}]}>
            {t(locale, 'favoritesEmptySwipeCta')}
          </Text>
        </View>
      </Pressable>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => navigation.navigate('Discover')}
        style={[
          styles.discoverPill,
          {borderColor: colors.primary, backgroundColor: colors.surfaceElevated},
        ]}
        activeOpacity={0.8}>
        <Text style={[styles.discoverGlyph, {color: colors.primary}]}>◎</Text>
        <Text style={[styles.discoverText, {color: colors.primary}]}>
          {t(locale, 'favoritesEmptyGoDiscover')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingBottom: 28,
  },
  ambient: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.07,
    top: '12%',
    alignSelf: 'center',
    marginLeft: -40,
  },
  ambient2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.05,
    top: '22%',
    alignSelf: 'center',
    marginLeft: 120,
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingLeft: 24,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  topAccent: {
    alignSelf: 'center',
    width: 56,
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
    opacity: 0.9,
  },
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 22,
    pointerEvents: 'none',
  },
  shimmerBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    width: 72,
    height: 220,
  },
  filmRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  sprocket: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.65,
  },
  frameGlass: {
    width: 28,
    height: 42,
    borderRadius: 5,
    borderWidth: 1,
  },
  heartStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginBottom: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  bigHeart: {
    fontSize: 58,
    fontWeight: '900',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  ctaGlyph: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(13,13,13,0.85)',
  },
  ctaPillText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  discoverPill: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  discoverGlyph: {
    fontSize: 14,
    opacity: 0.95,
  },
  discoverText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
