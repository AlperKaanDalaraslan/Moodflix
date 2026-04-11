import React, {useCallback} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

const LOCALES = ['tr-TR', 'en-US'];
const THEMES = ['dark', 'light'];

export function ProfileScreen() {
  const {locale, theme, setLocale, setTheme} = useSettings();
  const colors = getTheme(theme);

  const onPremium = useCallback(() => {
    Alert.alert(t(locale, 'premium'), t(locale, 'premiumHint'));
  }, [locale]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={{padding: 16, gap: 12}}>
        <Text style={{color: colors.textMuted}}>{t(locale, 'language')}</Text>
        <View style={styles.row}>
          {LOCALES.map(code => {
            const active = locale === code;
            return (
              <TouchableOpacity
                key={code}
                onPress={() => setLocale(code)}
                style={[
                  styles.choice,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.surfaceElevated : colors.surface,
                  },
                ]}>
                <Text style={{color: colors.text, fontWeight: '800'}}>{code}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{color: colors.textMuted, marginTop: 10}}>{t(locale, 'theme')}</Text>
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
          style={[styles.premium, {backgroundColor: colors.primary}]}>
          <Text style={{color: colors.onPrimary, fontWeight: '900'}}>{t(locale, 'premium')}</Text>
          <Text style={{color: colors.onPrimary, opacity: 0.85, marginTop: 6}}>
            {t(locale, 'premiumHint')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  row: {flexDirection: 'row', gap: 10},
  choice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  premium: {marginTop: 18, padding: 16, borderRadius: 16},
});
