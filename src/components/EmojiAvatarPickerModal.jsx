import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {filterEmojiAvatarRecords, getEmojiAvatarRecords} from '../data/emojiAvatarData';
import {t} from '../i18n/translations';

const COLS = 6;
const PAD = 14;

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {(emoji: string) => void} props.onSelect
 * @param {object} props.colors
 * @param {string} props.locale
 */
export function EmojiAvatarPickerModal({visible, onClose, onSelect, colors, locale}) {
  const insets = useSafeAreaInsets();
  const {width: winW} = useWindowDimensions();
  const [q, setQ] = useState('');

  const records = useMemo(() => (visible ? getEmojiAvatarRecords() : []), [visible]);
  const filtered = useMemo(() => filterEmojiAvatarRecords(records, q), [records, q]);

  const cell = useMemo(() => {
    const inner = winW - PAD * 2;
    return Math.floor(inner / COLS);
  }, [winW]);

  const onPick = useCallback(
    emoji => {
      onSelect(emoji);
      setQ('');
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TouchableOpacity
        onPress={() => onPick(item.emoji)}
        activeOpacity={0.82}
        style={[styles.cell, {width: cell, height: cell}]}
        accessibilityLabel={item.name}>
        <Text style={[styles.emojiGlyph, {fontSize: Math.min(34, cell * 0.52)}]} allowFontScaling>
          {item.emoji}
        </Text>
      </TouchableOpacity>
    ),
    [cell, onPick],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top}]}>
        <View style={[styles.head, {borderBottomColor: colors.border}]}>
          <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'profileEmojiPickerTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} accessibilityRole="button">
            <Text style={[styles.close, {color: colors.primary}]}>{t(locale, 'close')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchWrap, {backgroundColor: colors.surfaceElevated, borderColor: colors.border}]}>
          <Text style={[styles.searchIcon, {color: colors.textMuted}]}>⌕</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t(locale, 'profileEmojiSearchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, {color: colors.text}]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <Text style={[styles.hint, {color: colors.textMuted}]}>{t(locale, 'profileEmojiSearchHint')}</Text>

        <FlatList
          data={filtered}
          keyExtractor={item => item.slug + item.emoji}
          numColumns={COLS}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listPad, {paddingBottom: Math.max(insets.bottom, 16) + 8}]}
          initialNumToRender={48}
          maxToRenderPerBatch={60}
          windowSize={7}
          ListEmptyComponent={
            <Text style={[styles.empty, {color: colors.textMuted}]}>{t(locale, 'noResults')}</Text>
          }
        />

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {fontSize: 18, fontWeight: '900', letterSpacing: -0.3},
  close: {fontSize: 16, fontWeight: '800'},
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PAD,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {fontSize: 18, marginRight: 8, fontWeight: '700'},
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 16, fontWeight: '600'},
  hint: {fontSize: 12, lineHeight: 16, fontWeight: '500', marginHorizontal: PAD + 2, marginTop: 8, marginBottom: 4},
  listPad: {paddingHorizontal: PAD, paddingTop: 8},
  cell: {alignItems: 'center', justifyContent: 'center'},
  emojiGlyph: {textAlign: 'center'},
  empty: {textAlign: 'center', marginTop: 28, fontSize: 15, fontWeight: '600'},
});
