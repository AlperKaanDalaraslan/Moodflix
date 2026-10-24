import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

export function SocialScreen({navigation}) {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'socialTab')}</Text>
        <Text style={[styles.subtitle, {color: colors.textMuted}]}>
          {t(locale, 'socialChatOnlyHint')}
        </Text>
        <Pressable
          style={[styles.onlyBtn, {backgroundColor: colors.primary}]}
          onPress={() => navigation.navigate('Chat')}>
          <Text style={[styles.onlyBtnText, {color: colors.onPrimary}]}>
            {t(locale, 'socialOpenChat')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {flex: 1, padding: 16},
  title: {fontSize: 24, fontWeight: '900'},
  subtitle: {marginTop: 6, fontSize: 14, fontWeight: '600'},
  onlyBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  onlyBtnText: {fontSize: 15, fontWeight: '800'},
});
