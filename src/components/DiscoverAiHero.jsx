import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';

function Dust({delay, left, size, color, travel}) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, {
            toValue: 1,
            duration: 5200 + delay,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(op, {
              toValue: 1,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(op, {
              toValue: 0,
              duration: 1800,
              delay: 2200,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(y, {toValue: 0, duration: 0, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, op, y]);

  const translateY = y.interpolate({
    inputRange: [0, 1],
    outputRange: [travel, -18],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dust,
        {
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: op,
          transform: [{translateY}],
        },
      ]}
    />
  );
}

export function DiscoverAiHero({colors, title, subtitle, badge}) {
  const breath = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
      ]),
    );
    breathLoop.start();
    shimmerLoop.start();
    return () => {
      breathLoop.stop();
      shimmerLoop.stop();
    };
  }, [breath, shimmer]);

  const glowScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.14],
  });
  const glowOp = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.4],
  });
  const frameOp = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.55],
  });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 280],
  });
  const shimmerOp = shimmer.interpolate({
    inputRange: [0, 0.25, 0.7, 1],
    outputRange: [0, 0.28, 0.16, 0],
  });

  const gold = colors.primary;

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: gold,
            opacity: glowOp,
            transform: [{scale: glowScale}],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.frame, {borderColor: gold, opacity: frameOp}]}
      />

      <Dust delay={0} left={28} size={3} color={gold} travel={46} />
      <Dust delay={700} left={52} size={2} color={`${gold}cc`} travel={54} />
      <Dust delay={1400} left={74} size={2.5} color={gold} travel={40} />
      <Dust delay={2100} left={44} size={2} color={`${gold}99`} travel={60} />
      <Dust delay={2800} left={96} size={2} color={gold} travel={48} />

      <View style={styles.copy}>
        {badge ? (
          <Text style={[styles.badge, {color: gold}]}>{badge}</Text>
        ) : null}
        <View style={styles.titleClip}>
          <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmer,
              {
                backgroundColor: '#fff',
                opacity: shimmerOp,
                transform: [{translateX: shimmerX}, {rotate: '18deg'}],
              },
            ]}
          />
        </View>
        <Text style={[styles.sub, {color: colors.textMuted}]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    minHeight: 132,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 20,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    left: -40,
    top: -70,
  },
  frame: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 12,
    bottom: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dust: {
    position: 'absolute',
    bottom: 22,
  },
  copy: {
    zIndex: 2,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3.6,
    marginBottom: 8,
  },
  titleClip: {
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: 0.6,
  },
  shimmer: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 36,
  },
  sub: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
    letterSpacing: 0.15,
    maxWidth: 300,
  },
});
