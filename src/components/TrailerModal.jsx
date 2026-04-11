import React, {useMemo} from 'react';
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {t} from '../i18n/translations';
import {YoutubeEmbed} from './YoutubeEmbed';

/** Tam ekran WebView YouTube’da içeride ekstra letterbox. Hedef: ekran yüksekliğinin büyük kısmı (~%75). */
const TRAILER_VIEWPORT_HEIGHT_RATIO = 0.75;

function TrailerModalBody({videoId, onClose, colors, locale}) {
  const {height: winH, width: winW} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top + 10, 52);
  const bottomPad = Math.max(insets.bottom, 14);
  const bottomChrome = bottomPad + 28;
  const videoBandHeight = useMemo(() => {
    const innerAvailable = winH - topPad - bottomChrome - 12;
    const ideal = Math.round(winH * TRAILER_VIEWPORT_HEIGHT_RATIO);
    return Math.max(220, Math.min(ideal, Math.floor(innerAvailable)));
  }, [bottomChrome, topPad, winH]);

  return (
    <View style={[styles.root, {minHeight: winH}]}>
      <View style={[styles.stage, {paddingTop: topPad, paddingBottom: bottomChrome}]}>
        {videoId ? (
          <View style={[styles.videoBand, {height: videoBandHeight, width: winW}]}>
            <YoutubeEmbed
              key={videoId}
              videoId={videoId}
              style={styles.embedFill}
              flexLayout
              cinemaMode
              autoPlay
              muted={false}
              controls
              passThroughTouches={false}
            />
          </View>
        ) : (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        )}
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.closeBar,
          {
            paddingTop: topPad,
            paddingRight: Math.max(insets.right, 14),
            paddingLeft: Math.max(insets.left, 14),
          },
        ]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t(locale, 'close')}
          style={({pressed}) => [styles.closeBtn, {opacity: pressed ? 0.75 : 1}]}
          hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}>
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TrailerModal({visible, videoId, onClose, colors, locale}) {
  const open = visible && Boolean(videoId);

  return (
    <Modal
      visible={open}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      {open ? (
        <SafeAreaProvider style={styles.providerFill}>
          <TrailerModalBody
            videoId={videoId}
            onClose={onClose}
            colors={colors}
            locale={locale}
          />
        </SafeAreaProvider>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  providerFill: {
    flex: 1,
  },
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  stage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  videoBand: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  embedFill: {
    flex: 1,
    width: '100%',
  },
  loader: {marginTop: 48},
  closeBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: -1,
  },
});
