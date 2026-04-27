import {useNavigation} from '@react-navigation/native';
import React, {useLayoutEffect} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme, THEME_OPTIONS} from '../theme/colors';

export function ThemePickerScreen() {
  const navigation = useNavigation();
  const {locale, theme, setTheme} = useSettings();
  const colors = getTheme(theme);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(locale, 'themePickerTitle'),
      headerTitle: t(locale, 'themePickerTitle'),
    });
  }, [navigation, locale]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <FlatList
        data={THEME_OPTIONS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text style={[styles.hint, {color: colors.textMuted}]}>
            {t(locale, 'themePickerHint')}
          </Text>
        }
        renderItem={({item}) => {
          const preview = getTheme(item.id);
          const active = theme === item.id;
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setTheme(item.id)}
              style={[
                styles.card,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}>
              <View style={[styles.swatch, {backgroundColor: preview.background}]}>
                <View style={[styles.swatchSurface, {backgroundColor: preview.surface}]}>
                  <View style={[styles.swatchChip, {backgroundColor: preview.primary}]} />
                  <View style={[styles.swatchLine, {backgroundColor: preview.text}]} />
                  <View style={[styles.swatchLineSmall, {backgroundColor: preview.textMuted}]} />
                </View>
              </View>

              <View style={styles.meta}>
                <Text style={[styles.title, {color: colors.text}]}>{t(locale, item.key)}</Text>
                <Text style={[styles.sub, {color: colors.textMuted}]}>
                  {active ? t(locale, 'themeSelected') : t(locale, 'themeTapToUse')}
                </Text>
              </View>
              {active ? <Text style={[styles.check, {color: colors.primary}]}>✓</Text> : null}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 10},
  hint: {fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 6},
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 70,
    height: 52,
    borderRadius: 12,
    padding: 6,
  },
  swatchSurface: {
    flex: 1,
    borderRadius: 8,
    padding: 5,
  },
  swatchChip: {width: 18, height: 6, borderRadius: 999},
  swatchLine: {width: 34, height: 4, borderRadius: 999, marginTop: 8},
  swatchLineSmall: {width: 22, height: 4, borderRadius: 999, marginTop: 4},
  meta: {flex: 1, marginLeft: 12},
  title: {fontSize: 16, fontWeight: '800'},
  sub: {fontSize: 12, fontWeight: '600', marginTop: 3},
  check: {fontSize: 20, fontWeight: '900', marginLeft: 8},
});

