import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {fetchGenreList, hasApiKey} from '../api/tmdbClient';
import {MovieAvatarPickerModal} from '../components/MovieAvatarPickerModal';
import {PosterImage} from '../components/PosterImage';
import {useProfile} from '../context/ProfileContext';
import {
  getAvatarInitials,
  initialsAvatarPalette,
  isMoviePosterAvatarToken,
  parseMoviePosterAvatarToken,
  sanitizeAvatarForUi,
} from '../utils/avatarDisplay';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

function genreKey(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
}

export function ProfileEditScreen() {
  const BIO_MAX = 220;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const {profile, patchMyProfile, loading} = useProfile();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [tmdbGenres, setTmdbGenres] = useState([]);
  const [saving, setSaving] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const seedForLetters = String(name.trim() || profile?.username || profile?.name || '').trim();
  const movieToken = isMoviePosterAvatarToken(avatar) ? avatar : '';
  const moviePoster = parseMoviePosterAvatarToken(movieToken);
  const previewLetters = getAvatarInitials(name, locale, profile?.username ?? '');
  const previewPal = initialsAvatarPalette(
    (seedForLetters || profile?.username || profile?.email || 'x') + theme,
    theme,
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(locale, 'profileEditTitle'),
      headerTitle: t(locale, 'profileEditTitle'),
    });
  }, [navigation, locale]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setName(String(profile.name ?? ''));
    const sanitized = sanitizeAvatarForUi(profile.avatar);
    setAvatar(isMoviePosterAvatarToken(sanitized) ? sanitized : '');
    setBio(String(profile.bio ?? ''));
    const fg = profile.favoriteGenres ?? profile.genres;
    const keys = Array.isArray(fg) ? fg.map(genreKey).filter(Boolean) : [];
    setSelectedGenres([...new Set(keys)]);
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasApiKey()) {
        return;
      }
      try {
        const g = await fetchGenreList(locale);
        if (!cancelled) {
          setTmdbGenres(g.genres ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const toggleGenreName = useCallback(nameStr => {
    setSelectedGenres(prev => {
      const has = prev.includes(nameStr);
      if (has) {
        return prev.filter(x => x !== nameStr);
      }
      return [...prev, nameStr];
    });
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      await patchMyProfile({
        name: name.trim() || undefined,
        avatar: movieToken || '',
        bio: bio.trim() || undefined,
        favoriteGenres: selectedGenres.length ? selectedGenres : [],
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        t(locale, 'error'),
        e instanceof Error ? e.message : t(locale, 'profileSaveError'),
      );
    } finally {
      setSaving(false);
    }
  }, [name, movieToken, bio, selectedGenres, patchMyProfile, navigation, locale]);

  const chipInactive = useMemo(
    () => ({
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    }),
    [colors.border, colors.surfaceElevated],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {loading && !profile ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>{t(locale, 'profileEditSectionAbout')}</Text>
          <View style={[styles.card, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            <Text style={[styles.fieldLabel, {color: colors.textMuted}]}>{t(locale, 'profileName')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t(locale, 'profileName')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}
            />

            <Text style={[styles.fieldLabel, {color: colors.textMuted}]}>{t(locale, 'profileAvatarSection')}</Text>
            <View style={[styles.avatarCard, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
              <View style={[styles.previewRing, {borderColor: colors.primary}]}>
                {movieToken ? (
                  <View style={styles.previewPoster}>
                    <PosterImage
                      posterPath={moviePoster?.posterPath ?? null}
                      colors={colors}
                      size="small"
                      style={{borderRadius: 999}}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.previewInnerFill,
                      {backgroundColor: previewPal.bg, borderColor: previewPal.border},
                    ]}>
                    <Text style={[styles.previewLetters, {color: previewPal.text}]}>{previewLetters}</Text>
                  </View>
                )}
              </View>
              <View style={styles.avatarActions}>
                <Text style={[styles.avatarInfo, {color: colors.textMuted}]}>
                  {movieToken
                    ? t(locale, 'profileMovieAvatarSelected')
                    : t(locale, 'profileMovieAvatarHint')}
                </Text>
                <TouchableOpacity
                  onPress={() => setAvatarPickerOpen(true)}
                  style={[styles.avatarBtn, {backgroundColor: colors.primary}]}>
                  <Text style={[styles.avatarBtnText, {color: colors.onPrimary}]}>
                    {t(locale, 'profileMovieAvatarChoose')}
                  </Text>
                </TouchableOpacity>
                {movieToken ? (
                  <TouchableOpacity
                    onPress={() => setAvatar('')}
                    style={[styles.avatarBtnGhost, {borderColor: colors.border}]}>
                    <Text style={[styles.avatarBtnGhostText, {color: colors.text}]}>
                      {t(locale, 'profileClearAvatar')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={[styles.fieldLabel, {color: colors.textMuted}]}>{t(locale, 'profileBio')}</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder={t(locale, 'profileBioPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={BIO_MAX}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.bio,
                {color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated},
              ]}
            />
            <View style={styles.bioMetaRow}>
              <Text style={[styles.bioHint, {color: colors.textMuted}]}>
                {t(locale, 'profileBioHint')}
              </Text>
              <Text style={[styles.bioCount, {color: colors.textMuted}]}>
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, {color: colors.textMuted, marginTop: 22}]}>{t(locale, 'profileEditSectionGenres')}</Text>
          <Text style={[styles.hint, {color: colors.textMuted}]}>{t(locale, 'profileGenreHint')}</Text>
          <View style={[styles.card, styles.genreCard, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.genreScroll}>
              <View style={styles.genreWrap}>
                {tmdbGenres.map(g => {
                  const gKey = genreKey(g.name);
                  const active = selectedGenres.includes(gKey);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => toggleGenreName(gKey)}
                      activeOpacity={0.85}
                      style={[
                        styles.chip,
                        active
                          ? {borderColor: colors.primary, backgroundColor: colors.primary}
                          : chipInactive,
                      ]}>
                      <Text
                        style={{
                          color: active ? colors.onPrimary : colors.text,
                          fontWeight: active ? '800' : '600',
                          fontSize: 13,
                        }}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={{height: 100}} />
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <TouchableOpacity
            disabled={saving}
            onPress={() => onSave().catch(() => {})}
            activeOpacity={0.9}
            style={[styles.saveBtn, {backgroundColor: colors.primary, opacity: saving ? 0.65 : 1}]}>
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.saveBtnText, {color: colors.onPrimary}]}>{t(locale, 'profileEditSave')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <MovieAvatarPickerModal
        visible={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        onSelect={token => setAvatar(token)}
        colors={colors}
        locale={locale}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  scroll: {paddingHorizontal: 18, paddingTop: 12},
  centerPad: {paddingVertical: 32, alignItems: 'center'},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  hint: {fontSize: 13, lineHeight: 18, fontWeight: '500', marginBottom: 10},
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  genreCard: {paddingVertical: 10, paddingHorizontal: 12, maxHeight: 280},
  genreScroll: {maxHeight: 260},
  genreWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 6},
  fieldLabel: {fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4},
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600',
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  previewRing: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPoster: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  previewPhText: {fontSize: 22, fontWeight: '800'},
  avatarActions: {flex: 1, minWidth: 0},
  avatarInfo: {fontSize: 13, lineHeight: 18, fontWeight: '600'},
  avatarBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  avatarBtnText: {fontSize: 14, fontWeight: '900'},
  avatarBtnGhost: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  avatarBtnGhostText: {fontSize: 13, fontWeight: '700'},
  previewInnerFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLetters: {fontSize: 22, fontWeight: '900', letterSpacing: -0.5},
  bio: {minHeight: 110, paddingTop: 12},
  bioMetaRow: {marginTop: 8, flexDirection: 'row', alignItems: 'center'},
  bioHint: {flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 17},
  bioCount: {fontSize: 12, fontWeight: '700', marginLeft: 8},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },
  saveBtnText: {fontSize: 17, fontWeight: '900', letterSpacing: -0.2},
});
