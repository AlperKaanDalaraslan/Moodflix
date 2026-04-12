import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSettings} from '../context/SettingsContext';
import {TMDB_CONTENT_LOCALES} from '../i18n/contentLocales';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';

const THEMES = ['dark', 'light'];
const LOCALE_PAD = 16;

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {height: winH} = useWindowDimensions();
  const {locale, theme, setLocale, setTheme} = useSettings();
  const colors = getTheme(theme);
  const [langOpen, setLangOpen] = useState(false);
  const sheetHeight = Math.round(winH * 0.86);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(locale, 'profile'),
      headerTitle: t(locale, 'profile'),
    });
  }, [navigation, locale]);

  const currentLocale = useMemo(
    () => TMDB_CONTENT_LOCALES.find(x => x.code === locale) ?? TMDB_CONTENT_LOCALES[0],
    [locale],
  );

  const onPremium = useCallback(() => {
    Alert.alert(t(locale, 'premium'), t(locale, 'premiumHint'));
  }, [locale]);

  const pickLocale = useCallback(
    code => {
      setLocale(code);
      setLangOpen(false);
    },
    [setLocale],
  );

  const renderLangRow = useCallback(
    ({item}) => {
      const active = locale === item.code;
      return (
        <TouchableOpacity
          onPress={() => pickLocale(item.code)}
          style={[
            styles.langRow,
            {
              borderBottomColor: colors.border,
              backgroundColor: active ? colors.surfaceElevated : 'transparent',
            },
          ]}>
          <View style={styles.langRowText}>
            <Text numberOfLines={2} style={[styles.langRowLabel, {color: colors.text}]}>
              {item.label}
            </Text>
            <Text style={[styles.langRowCode, {color: colors.textMuted}]}>{item.code}</Text>
          </View>
          {active ? (
            <Text style={[styles.langRowCheck, {color: colors.primary}]}>✓</Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [colors, locale, pickLocale],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>{t(locale, 'language')}</Text>
        <Text style={[styles.hint, {color: colors.textMuted}]}>{t(locale, 'languageContentHint')}</Text>

        <TouchableOpacity
          onPress={() => setLangOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t(locale, 'language')}: ${currentLocale.label} (${currentLocale.code})`}
          style={[
            styles.selectField,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}>
          <View style={styles.selectFieldInner}>
            <Text numberOfLines={2} style={[styles.selectLabel, {color: colors.text}]}>
              {currentLocale.label}
            </Text>
            <Text style={[styles.selectCode, {color: colors.textMuted}]}>{currentLocale.code}</Text>
          </View>
          <Text style={[styles.selectChevron, {color: colors.textMuted}]}>▼</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, {color: colors.textMuted, marginTop: 18}]}>
          {t(locale, 'theme')}
        </Text>
        <View style={styles.row}>
          {THEMES.map(mode => {
            const active = theme === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setTheme(mode)}
                style={[
                  styles.choice,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.surfaceElevated : colors.surface,
                  },
                ]}>
                <Text style={{color: colors.text, fontWeight: '800'}}>
                  {mode === 'dark' ? t(locale, 'themeDark') : t(locale, 'themeLight')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={onPremium}
          style={[styles.premium, {backgroundColor: colors.primary}, shadow.hero]}>
          <Text style={{color: colors.onPrimary, fontWeight: '900'}}>{t(locale, 'premium')}</Text>
          <Text style={{color: colors.onPrimary, opacity: 0.85, marginTop: 6}}>
            {t(locale, 'premiumHint')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={langOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLangOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.modalBackdrop, {paddingTop: insets.top}]}
            onPress={() => setLangOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                height: sheetHeight,
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, {color: colors.text}]}>{t(locale, 'language')}</Text>
              <TouchableOpacity
                onPress={() => setLangOpen(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t(locale, 'close')}>
                <Text style={[styles.sheetClose, {color: colors.primary}]}>{t(locale, 'close')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={TMDB_CONTENT_LOCALES}
              keyExtractor={item => item.code}
              renderItem={renderLangRow}
              initialNumToRender={18}
              windowSize={10}
              keyboardShouldPersistTaps="handled"
              style={styles.langList}
              showsVerticalScrollIndicator
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scrollContent: {
    padding: LOCALE_PAD,
    paddingBottom: 32,
    gap: 10,
  },
  sectionLabel: {fontSize: 14, fontWeight: '700'},
  hint: {fontSize: 12, lineHeight: 17, fontWeight: '500', marginTop: 2, marginBottom: 4},
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 4,
    minHeight: 56,
  },
  selectFieldInner: {flex: 1, paddingRight: 8},
  selectLabel: {fontSize: 16, fontWeight: '700', letterSpacing: -0.2},
  selectCode: {fontSize: 12, fontWeight: '600', marginTop: 4, letterSpacing: -0.1},
  selectChevron: {fontSize: 12, fontWeight: '700'},
  row: {flexDirection: 'row', gap: 10},
  choice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  premium: {marginTop: 18, padding: 16, borderRadius: 16},
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetTitle: {fontSize: 17, fontWeight: '800'},
  sheetClose: {fontSize: 16, fontWeight: '700'},
  langList: {flex: 1},
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langRowText: {flex: 1, paddingRight: 10},
  langRowLabel: {fontSize: 15, fontWeight: '700', letterSpacing: -0.15},
  langRowCode: {fontSize: 12, fontWeight: '600', marginTop: 3},
  langRowCheck: {fontSize: 20, fontWeight: '900'},
});
