import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {kindLabel} from '../utils/catalog';

export function MediaKindBadge({item, locale, style}) {
  if (!item) {
    return null;
  }
  return (
    <View style={[styles.badge, style]} pointerEvents="none">
      <Text style={styles.text}>{kindLabel(item, locale)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
