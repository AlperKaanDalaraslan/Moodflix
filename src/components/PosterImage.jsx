import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {TMDB_IMAGE_BASE} from '../config/tmdb';

const sizeToSegment = {
  small: 'w185',
  medium: 'w342',
  large: 'w500',
};

export function PosterImage({posterPath, colors, style, size = 'medium'}) {
  const segment = sizeToSegment[size];
  const uri = posterPath ? `${TMDB_IMAGE_BASE}/${segment}${posterPath}` : null;

  if (!uri) {
    return (
      <View style={[styles.fallback, {backgroundColor: colors.surfaceElevated}, style]}>
        <View style={[styles.fallbackInner, {borderColor: colors.border}]} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <Image
        accessibilityIgnoresInvertColors
        source={{uri}}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#00000022',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInner: {
    width: '40%',
    height: '50%',
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
});
