import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

export function DiscoverThinking({colors, steps, kicker}) {
  const safe = Array.isArray(steps) && steps.length ? steps : ['…'];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setI(n => (n + 1) % safe.length);
    }, 1100);
    return () => clearInterval(id);
  }, [safe.length]);

  return (
    <View
      style={[
        styles.box,
        {borderColor: `${colors.primary}44`, backgroundColor: colors.surface},
      ]}
    >
      <ActivityIndicator color={colors.primary} />
      <View style={styles.col}>
        <Text style={[styles.kicker, {color: colors.primary}]}>
          {kicker || '…'}
        </Text>
        <Text style={[styles.step, {color: colors.text}]}>{safe[i]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  col: {flex: 1},
  kicker: {fontSize: 10, fontWeight: '600', letterSpacing: 2.4, marginBottom: 4},
  step: {fontSize: 15, fontWeight: '400', letterSpacing: 0.2},
});
