import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {t} from '../i18n/translations';
import {shadow} from '../theme/shadows';

const winH = Dimensions.get('window').height;
const POSTER_COUNT = 5;

/**
 * Decorative empty search UI — same mood as Favorites empty state, but does not navigate.
 * @param {'idle' | 'ready' | 'noMatch'} variant
 */
export function SearchEmptyState({colors, locale, variant}) {
  const lensScale = useRef(new Animated.Value(1)).current;
  const lensFloat = useRef(new Animated.Value(0)).current;
  const stripShift = useRef(new Animated.Value(0)).current;
  const stripTilt = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const bobRef = useRef(
    Array.from({length: POSTER_COUNT}, () => new Animated.Value(0)),
  );
  const bob = bobRef.current;

  useEffect(() => {
    const lensBeat = Animated.loop(
      Animated.sequence([
        Animated.timing(lensScale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(lensScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const lensDrift = Animated.loop(
      Animated.sequence([
        Animated.timing(lensFloat, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lensFloat, {
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

    lensBeat.start();
    lensDrift.start();
    stripLoop.start();
    ringLoop.start();
    shimmerLoop.start();
    bobLoops.forEach(l => l.start());

    return () => {
      lensBeat.stop();
      lensDrift.stop();
      stripLoop.stop();
      ringLoop.stop();
      shimmerLoop.stop();
      bobLoops.forEach(l => l.stop());
    };
  }, [bob, lensFloat, lensScale, ring, shimmer, stripShift, stripTilt]);

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
  const floatY = lensFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 220],
  });

  const tilt = [-3, -1.5, 0, 1.5, 3];

  const titleKey =
    variant === 'noMatch' ? 'noResults' : 'searchEmptyTitleIdle';
  const hintKey =
    variant === 'idle'
      ? 'searchEmptyHintIdle'
      : variant === 'ready'
        ? 'searchEmptyHintReady'
        : 'searchEmptyHintNoMatch';

  return (
    <View style={[styles.outer, {minHeight: Math.max(380, winH * 0.45)}]}>
      <View style={[styles.ambient, {backgroundColor: colors.primary}]} pointerEvents="none" />
      <View style={[styles.ambient2, {backgroundColor: colors.primary}]} pointerEvents="none" />

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
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
            {transform: [{translateX: stripX}, {rotate: stripRotate}]},
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

        <View style={styles.lensStage}>
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
              transform: [{scale: lensScale}, {translateY: floatY}],
              alignItems: 'center',
            }}>
            <Text style={[styles.lens, {color: colors.primary}]}>🔎</Text>
          </Animated.View>
        </View>

        <Text style={[styles.title, {color: colors.text}]}>{t(locale, titleKey)}</Text>
        <Text style={[styles.body, {color: colors.textMuted}]}>{t(locale, hintKey)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  ambient: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.06,
    top: '6%',
    alignSelf: 'center',
    marginLeft: -50,
  },
  ambient2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.045,
    top: '14%',
    alignSelf: 'center',
    marginLeft: 100,
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
    marginBottom: 18,
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
  lensStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 96,
    marginBottom: 6,
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
  },
  lens: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.35,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});
