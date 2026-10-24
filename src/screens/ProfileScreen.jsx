import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Switch,
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
import {getTheme, THEME_OPTIONS} from '../theme/colors';

const PAD = 18;

function ShakingThemePhone({locale}) {
  const tilt = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [index, setIndex] = useState(0);
  const option = THEME_OPTIONS[index] ?? THEME_OPTIONS[0];
  const preview = getTheme(option.id);

  useEffect(() => {
    let alive = true;

    const shakeOnce = () =>
      new Promise(resolve => {
        Animated.sequence([
          Animated.timing(tilt, {
            toValue: 1,
            duration: 120,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tilt, {
            toValue: -1,
            duration: 140,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tilt, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({finished}) => resolve(finished));
      });

    const changeTheme = () =>
      new Promise(resolve => {
        Animated.timing(fade, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (!alive || !finished) {
            resolve(false);
            return;
          }
          setIndex(current => (current + 1) % THEME_OPTIONS.length);
          Animated.timing(fade, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }).start(() => resolve(true));
        });
      });

    const wait = ms => new Promise(resolve => {
      setTimeout(resolve, ms);
    });

    (async () => {
      while (alive) {
        const shook = await shakeOnce();
        if (!alive || !shook) {
          break;
        }
        await changeTheme();
        if (!alive) {
          break;
        }
        await wait(1100);
      }
    })();

    return () => {
      alive = false;
      tilt.stopAnimation();
      fade.stopAnimation();
    };
  }, [fade, tilt]);

  const rotate = tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-12deg', '12deg'],
  });
  const shift = tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <View style={styles.stage}>
      <Animated.View style={{transform: [{translateX: shift}, {rotate}]}}>
        <View style={styles.phone}>
          <View style={styles.notch} />
          <Animated.View style={[styles.phoneScreen, {backgroundColor: preview.background, opacity: fade}]}>
            <View style={[styles.previewHero, {backgroundColor: preview.primary}]} />
            <View style={styles.previewRow}>
              <View style={[styles.previewPoster, {backgroundColor: preview.surfaceElevated}]} />
              <View style={[styles.previewPoster, {backgroundColor: preview.surface}]} />
              <View style={[styles.previewPoster, {backgroundColor: preview.surfaceElevated}]} />
            </View>
            <View style={[styles.previewLine, {backgroundColor: preview.text, width: '72%'}]} />
            <View style={[styles.previewLine, {backgroundColor: preview.textMuted, width: '46%'}]} />
          </Animated.View>
        </View>
      </Animated.View>
      <Text style={[styles.previewName, {color: preview.primary}]}>{t(locale, option.key)}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {height: winH} = useWindowDimensions();
  const {locale, theme, setLocale, shakeThemeEnabled, setShakeThemeEnabled, remindersEnabled, setRemindersEnabled} = useSettings();
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
        <Text style={[styles.prefLabel, {color: colors.text}]}>{t(locale, 'language')}</Text>

        <TouchableOpacity
          onPress={() => setLangOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t(locale, 'language')}: ${currentLocale.label} (${currentLocale.code})`}
          style={[styles.selectField, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <View style={styles.selectFieldInner}>
            <Text numberOfLines={2} style={[styles.selectLabel, {color: colors.text}]}>
              {currentLocale.label}
            </Text>
            <Text style={[styles.selectCode, {color: colors.textMuted}]}>{currentLocale.code}</Text>
          </View>
          <Text style={[styles.selectChevron, {color: colors.textMuted}]}>▼</Text>
        </TouchableOpacity>

        <Text style={[styles.prefLabel, {color: colors.text, marginTop: 18}]}>{t(locale, 'theme')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ThemePicker')}
          activeOpacity={0.9}
          style={[styles.themePickerBtn, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <Text style={[styles.themePickerBtnTitle, {color: colors.text}]}>
            {t(locale, 'themePickerOpen')}
          </Text>
          <Text style={[styles.themePickerBtnSub, {color: colors.textMuted}]}>
            {t(locale, 'themePickerHint')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.toggleRow, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <View style={styles.toggleTextCol}>
            <Text style={[styles.toggleTitle, {color: colors.text}]}>
              {t(locale, 'themeShakeToggle')}
            </Text>
            <Text style={[styles.toggleSub, {color: colors.textMuted}]}>
              {t(locale, 'themeShakeHint')}
            </Text>
          </View>
          <Switch
            value={shakeThemeEnabled}
            onValueChange={setShakeThemeEnabled}
            thumbColor={shakeThemeEnabled ? colors.primary : undefined}
            trackColor={{false: colors.border, true: colors.primaryDark}}
          />
        </View>
        <ShakingThemePhone locale={locale} />
        <View style={[styles.toggleRow, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <View style={styles.toggleTextCol}>
            <Text style={[styles.toggleTitle, {color: colors.text}]}>
              {t(locale, 'remindersToggle')}
            </Text>
            <Text style={[styles.toggleSub, {color: colors.textMuted}]}>
              {t(locale, 'remindersHint')}
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={setRemindersEnabled}
            thumbColor={remindersEnabled ? colors.primary : undefined}
            trackColor={{false: colors.border, true: colors.primaryDark}}
          />
        </View>
      </ScrollView>

      <Modal
        visible={langOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLangOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={[styles.modalBackdrop, {paddingTop: insets.top}]} onPress={() => setLangOpen(false)} />
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
    flexGrow: 1,
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 28,
  },
  stage: {
    flexGrow: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
  },
  phone: {
    width: 168,
    height: 320,
    borderRadius: 32,
    padding: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#3A3A3A',
  },
  notch: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    width: 64,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#0A0A0A',
    zIndex: 2,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    paddingTop: 28,
    paddingHorizontal: 12,
  },
  previewHero: {
    height: 36,
    borderRadius: 10,
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  previewPoster: {
    flex: 1,
    height: 92,
    borderRadius: 8,
  },
  previewLine: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.85,
  },
  previewName: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: 14,
  },
  prefLabel: {fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 4},
  mainCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: PAD,
    marginBottom: 4,
  },
  loaderWrap: {alignItems: 'center', paddingVertical: 20},
  loaderLabel: {marginTop: 10, fontSize: 14, fontWeight: '600'},
  errorBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  errorBannerTitle: {fontSize: 16, fontWeight: '800'},
  errorBannerBody: {marginTop: 6, fontSize: 13, fontWeight: '600', lineHeight: 18},
  errorBannerHint: {marginTop: 10, fontSize: 12, lineHeight: 17, fontWeight: '500'},
  errorRetry: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  errorRetryText: {fontSize: 14, fontWeight: '800'},
  heroBand: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    gap: 14,
    marginBottom: 4,
  },
  heroTextCol: {flex: 1, minWidth: 0},
  avatarPh: {
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPoster: {width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden'},
  avatarPhText: {fontSize: 28, fontWeight: '900'},
  displayName: {fontSize: 22, fontWeight: '900', letterSpacing: -0.4},
  displayEmail: {fontSize: 14, fontWeight: '600', marginTop: 4, opacity: 0.9},
  bioBlock: {marginTop: 14, fontSize: 15, lineHeight: 22, fontWeight: '500'},
  genreScroll: {marginTop: 12},
  genreScrollInner: {gap: 8, paddingVertical: 2},
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
  },
  genrePillText: {fontSize: 13, fontWeight: '700'},
  tasteCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  tasteLabel: {fontSize: 12, fontWeight: '700', letterSpacing: 0.4},
  tasteRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap'},
  tastePercent: {fontSize: 36, fontWeight: '900', letterSpacing: -1},
  tasteGenre: {fontSize: 20, fontWeight: '800', flex: 1, minWidth: 120},
  tasteSub: {marginTop: 10, fontSize: 14, lineHeight: 20, fontWeight: '600'},
  btnPrimary: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  btnPrimaryText: {fontSize: 16, fontWeight: '900', letterSpacing: -0.2},
  listsBlock: {marginTop: 18, gap: 12},
  listNavBtn: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  listNavTitle: {fontSize: 16, fontWeight: '800'},
  listNavMeta: {marginTop: 4, fontSize: 13, fontWeight: '600'},
  btnGhost: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnGhostText: {fontSize: 15, fontWeight: '700'},
  authRow: {flexDirection: 'row', gap: 10, marginTop: 4},
  authBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  authBtnText: {fontSize: 15, fontWeight: '800'},
  authBtnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  authBtnOutlineText: {fontSize: 15, fontWeight: '800'},
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 58,
  },
  selectFieldInner: {flex: 1, paddingRight: 8},
  selectLabel: {fontSize: 16, fontWeight: '700', letterSpacing: -0.2},
  selectCode: {fontSize: 12, fontWeight: '600', marginTop: 4},
  selectChevron: {fontSize: 11, fontWeight: '700'},
  themePickerBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  themePickerBtnTitle: {fontSize: 15, fontWeight: '800'},
  themePickerBtnSub: {marginTop: 4, fontSize: 12, fontWeight: '600'},
  toggleRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTextCol: {flex: 1, marginRight: 8},
  toggleTitle: {fontSize: 14, fontWeight: '800'},
  toggleSub: {marginTop: 3, fontSize: 12, fontWeight: '600', lineHeight: 16},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalBackdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
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
