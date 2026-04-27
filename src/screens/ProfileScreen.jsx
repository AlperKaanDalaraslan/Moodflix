import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {PosterImage} from '../components/PosterImage';
import {useAuth} from '../context/AuthContext';
import {useProfile} from '../context/ProfileContext';
import {useSettings} from '../context/SettingsContext';
import {TMDB_CONTENT_LOCALES} from '../i18n/contentLocales';
import {t} from '../i18n/translations';
import {getTheme, isDarkMode} from '../theme/colors';
import {
  getAvatarInitials,
  initialsAvatarPalette,
  isMoviePosterAvatarToken,
  parseMoviePosterAvatarToken,
  sanitizeAvatarForUi,
} from '../utils/avatarDisplay';
import {normalizeServerMovie} from '../utils/profileMovie';

const PAD = 18;

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {height: winH} = useWindowDimensions();
  const {locale, theme, setLocale, shakeThemeEnabled, setShakeThemeEnabled} = useSettings();
  const {isLoggedIn, user, logout} = useAuth();
  const {profile, insights, loading, error, refreshProfile} = useProfile();
  const colors = getTheme(theme);
  const darkMode = isDarkMode(theme);
  const [langOpen, setLangOpen] = useState(false);
  const sheetHeight = Math.round(winH * 0.86);

  const heroBandBg =
    darkMode ? 'rgba(245, 197, 24, 0.07)' : 'rgba(230, 172, 0, 0.1)';

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

  const displayName = profile?.name || user?.username || user?.name || user?.email || '—';
  const headline =
    typeof insights?.headlineGenre === 'string' ? insights.headlineGenre : null;
  const headlinePct =
    typeof insights?.headlinePercent === 'number'
      ? Math.round(insights.headlinePercent)
      : insights?.headlinePercent != null
        ? Number(insights.headlinePercent)
        : null;

  const onLogout = useCallback(() => {
    Alert.alert(t(locale, 'authLogout'), t(locale, 'authLogoutConfirm'), [
      {text: t(locale, 'close'), style: 'cancel'},
      {
        text: t(locale, 'authLogout'),
        style: 'destructive',
        onPress: () => {
          logout().catch(() => {});
        },
      },
    ]);
  }, [locale, logout]);

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

  const initialsSeed = String(profile?.username ?? user?.username ?? displayName ?? '');
  const avatarToken = sanitizeAvatarForUi(profile?.avatar);
  const hasMovieAvatar = isMoviePosterAvatarToken(avatarToken);
  const moviePoster = parseMoviePosterAvatarToken(avatarToken);
  const letterPair = getAvatarInitials(
    displayName === '—' ? '' : displayName,
    locale,
    initialsSeed,
  );
  const initialsStyle = initialsAvatarPalette(initialsSeed + (profile?.email || ''), theme);
  const likedCount = Array.isArray(profile?.likedMovies)
    ? profile.likedMovies.map(normalizeServerMovie).filter(Boolean).length
    : 0;
  const watchedCount = Array.isArray(profile?.watchedMovies)
    ? profile.watchedMovies.map(normalizeServerMovie).filter(Boolean).length
    : 0;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {isLoggedIn && user ? (
          <View style={[styles.mainCard, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            {loading && !profile ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[styles.loaderLabel, {color: colors.textMuted}]}>{t(locale, 'loading')}</Text>
              </View>
            ) : null}

            {error ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: darkMode ? 'rgba(255, 99, 71, 0.12)' : 'rgba(200, 60, 50, 0.1)',
                    borderLeftColor: colors.pass,
                  },
                ]}>
                <Text style={[styles.errorBannerTitle, {color: colors.text}]}>{t(locale, 'profileSyncErrorTitle')}</Text>
                <Text style={[styles.errorBannerBody, {color: colors.textMuted}]}>{error}</Text>
                <Text style={[styles.errorBannerHint, {color: colors.textMuted}]}>
                  {t(locale, 'profileSyncErrorHint')}
                </Text>
                <TouchableOpacity
                  onPress={() => refreshProfile().catch(() => {})}
                  style={[styles.errorRetry, {backgroundColor: colors.primary}]}>
                  <Text style={[styles.errorRetryText, {color: colors.onPrimary}]}>{t(locale, 'tryAgain')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={[styles.heroBand, {backgroundColor: heroBandBg}]}>
              <View
                style={[
                  styles.avatarPh,
                  {
                    borderColor: initialsStyle.border,
                    backgroundColor: initialsStyle.bg,
                  },
                ]}>
                {hasMovieAvatar ? (
                  <View style={styles.avatarPoster}>
                    <PosterImage
                      posterPath={moviePoster?.posterPath ?? null}
                      colors={colors}
                      size="small"
                      style={{borderRadius: 999}}
                    />
                  </View>
                ) : (
                  <Text style={[styles.avatarPhText, {color: initialsStyle.text}]}>{letterPair}</Text>
                )}
              </View>
              <View style={styles.heroTextCol}>
                <Text style={[styles.displayName, {color: colors.text}]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.displayEmail, {color: colors.textMuted}]} numberOfLines={1}>
                  {profile?.email || user.email}
                </Text>
              </View>
            </View>

            {profile?.bio ? (
              <Text style={[styles.bioBlock, {color: colors.text}]}>{profile.bio}</Text>
            ) : null}

            {Array.isArray(profile?.favoriteGenres) && profile.favoriteGenres.length ? (
              <View style={styles.genreScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreScrollInner}>
                  {profile.favoriteGenres.map((g, idx) => (
                    <View
                      key={`${String(g)}-${idx}`}
                      style={[styles.genrePill, {backgroundColor: colors.surfaceElevated, borderColor: colors.primary}]}>
                      <Text style={[styles.genrePillText, {color: colors.text}]}>{g}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {headline && headlinePct != null && Number.isFinite(headlinePct) ? (
              <View style={[styles.tasteCard, {borderColor: colors.primary, backgroundColor: colors.surfaceElevated}]}>
                <Text style={[styles.tasteLabel, {color: colors.textMuted}]}>{t(locale, 'profileYourTaste')}</Text>
                <View style={styles.tasteRow}>
                  <Text style={[styles.tastePercent, {color: colors.primary}]}>{headlinePct}%</Text>
                  <Text style={[styles.tasteGenre, {color: colors.text}]} numberOfLines={2}>
                    {headline}
                  </Text>
                </View>
                <Text style={[styles.tasteSub, {color: colors.textMuted}]}>
                  {t(locale, 'profileInsightLine')
                    .replace('{percent}', String(headlinePct))
                    .replace('{genre}', headline)}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileEdit')}
              activeOpacity={0.9}
              style={[styles.btnPrimary, {backgroundColor: colors.primary}, styles.btnShadow]}>
              <Text style={[styles.btnPrimaryText, {color: colors.onPrimary}]}>{t(locale, 'profileEditTitle')}</Text>
            </TouchableOpacity>

            {profile ? (
              <View style={styles.listsBlock}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ProfileMovies', {mode: 'liked'})}
                  style={[styles.listNavBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                  <Text style={[styles.listNavTitle, {color: colors.text}]}>
                    {t(locale, 'profileLiked')}
                  </Text>
                  <Text style={[styles.listNavMeta, {color: colors.textMuted}]}>
                    {likedCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ProfileMovies', {mode: 'watched'})}
                  style={[styles.listNavBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                  <Text style={[styles.listNavTitle, {color: colors.text}]}>
                    {t(locale, 'profileWatched')}
                  </Text>
                  <Text style={[styles.listNavMeta, {color: colors.textMuted}]}>
                    {watchedCount}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={onLogout}
              activeOpacity={0.88}
              style={[styles.btnGhost, {borderColor: colors.border}]}>
              <Text style={[styles.btnGhostText, {color: colors.text}]}>{t(locale, 'authLogout')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('LoginRegister', {mode: 'login'})}
              style={[styles.authBtn, {backgroundColor: colors.primary}]}>
              <Text style={[styles.authBtnText, {color: colors.onPrimary}]}>{t(locale, 'authLoginCta')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('LoginRegister', {mode: 'register'})}
              style={[styles.authBtnOutline, {borderColor: colors.primary}]}>
              <Text style={[styles.authBtnOutlineText, {color: colors.primary}]}>{t(locale, 'authRegisterCta')}</Text>
            </TouchableOpacity>
          </View>
        )}

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
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 36,
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
