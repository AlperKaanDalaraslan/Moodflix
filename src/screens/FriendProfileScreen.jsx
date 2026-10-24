import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getFriendProfile} from '../services/socialService';
import {getTheme} from '../theme/colors';

const TABS = ['watched', 'liked', 'mood'];

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function FriendProfileScreen({route, navigation}) {
  const {token} = useAuth();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const userId = String(route?.params?.userId ?? '');

  const [activeTab, setActiveTab] = useState('watched');
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const title = route?.params?.displayName || t(locale, 'socialFriendProfile');
    navigation.setOptions({title});
  }, [route?.params?.displayName, navigation, locale]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorCode('');
    getFriendProfile(token, userId)
      .then(data => {
        if (cancelled) {
          return;
        }
        setProfile(data?.profile ?? null);
      })
      .catch(err => {
        if (cancelled) {
          return;
        }
        if (err?.status === 403) {
          setErrorCode('403');
        } else if (err?.status === 404) {
          setErrorCode('404');
        } else {
          setErrorCode('generic');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  const favoriteGenres = asList(profile?.favoriteGenres?.length ? profile.favoriteGenres : profile?.genres);
  const watchedMovies = asList(profile?.watchedMovies);
  const likedMovies = asList(profile?.likedMovies);
  const moodHistory = asList(profile?.moodHistory);

  const tabItems = useMemo(() => {
    if (activeTab === 'liked') {
      return likedMovies;
    }
    if (activeTab === 'mood') {
      return moodHistory;
    }
    return watchedMovies;
  }, [activeTab, likedMovies, moodHistory, watchedMovies]);

  const emptyText =
    activeTab === 'mood'
      ? t(locale, 'socialMoodHistoryEmpty')
      : t(locale, 'socialMoviesEmpty');

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Text style={[styles.status, {color: colors.textMuted}]}>{t(locale, 'loading')}</Text> : null}
        {!loading && errorCode === '403' ? (
          <Text style={[styles.status, {color: colors.pass}]}>
            {t(locale, 'socialFriendProfileForbidden')}
          </Text>
        ) : null}
        {!loading && errorCode === '404' ? (
          <Text style={[styles.status, {color: colors.pass}]}>
            {t(locale, 'socialFriendProfileNotFound')}
          </Text>
        ) : null}
        {!loading && errorCode === 'generic' ? (
          <Text style={[styles.status, {color: colors.pass}]}>{t(locale, 'error')}</Text>
        ) : null}

        {!loading && !errorCode && profile ? (
          <>
            <View style={[styles.headerCard, {borderColor: colors.border, backgroundColor: colors.surface}]}>
              <View style={[styles.avatar, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                <Text style={[styles.avatarText, {color: colors.text}]}>
                  {String(profile?.name || profile?.username || '?')
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.name, {color: colors.text}]}>{profile?.name || '-'}</Text>
              <Text style={[styles.username, {color: colors.textMuted}]}>@{profile?.username || '-'}</Text>
              {profile?.bio ? <Text style={[styles.bio, {color: colors.text}]}>{profile.bio}</Text> : null}
            </View>

            <View style={styles.genreWrap}>
              {favoriteGenres.length ? (
                favoriteGenres.map((genre, idx) => (
                  <View key={`${genre}-${idx}`} style={[styles.genreChip, {borderColor: colors.border}]}>
                    <Text style={{color: colors.text, fontWeight: '600'}}>{genre}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.status, {color: colors.textMuted}]}>{t(locale, 'socialGenresEmpty')}</Text>
              )}
            </View>

            <View style={[styles.moodCard, {borderColor: colors.border, backgroundColor: colors.surface}]}>
              <Text style={[styles.moodTitle, {color: colors.text}]}>
                {t(locale, 'socialLatestMood')}: {profile?.latestMood?.mood || '-'}
              </Text>
            </View>

            <View style={styles.tabsRow}>
              {TABS.map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabChip,
                    {
                      borderColor: activeTab === tab ? colors.primary : colors.border,
                      backgroundColor: activeTab === tab ? colors.surfaceElevated : colors.surface,
                    },
                  ]}>
                  <Text style={{color: activeTab === tab ? colors.primary : colors.text, fontWeight: '700'}}>
                    {tab === 'watched'
                      ? t(locale, 'profileWatched')
                      : tab === 'liked'
                        ? t(locale, 'profileLiked')
                        : t(locale, 'socialMoodHistory')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!tabItems.length ? (
              <Text style={[styles.status, {color: colors.textMuted}]}>{emptyText}</Text>
            ) : null}
            {tabItems.map((item, idx) => (
              <View key={`${activeTab}-${idx}`} style={[styles.listItem, {borderColor: colors.border}]}>
                {activeTab === 'mood' ? (
                  <>
                    <Text style={{color: colors.text, fontWeight: '700'}}>{item?.mood || '-'}</Text>
                    <Text style={{color: colors.textMuted, marginTop: 4}}>
                      {formatDate(item?.createdAt || item?.date)}
                    </Text>
                    {item?.context ? (
                      <Text style={{color: colors.textMuted, marginTop: 4}}>{item.context}</Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={{color: colors.text, fontWeight: '700'}}>
                      {item?.title || item?.name || t(locale, 'socialMovieFallback')}
                    </Text>
                    <Text style={{color: colors.textMuted, marginTop: 4}}>
                      {formatDate(item?.createdAt || item?.watchedAt || item?.likedAt)}
                    </Text>
                  </>
                )}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: 16, paddingBottom: 30},
  status: {marginTop: 10, fontWeight: '700'},
  headerCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 24, fontWeight: '900'},
  name: {marginTop: 10, fontSize: 18, fontWeight: '800'},
  username: {marginTop: 2, fontSize: 13, fontWeight: '600'},
  bio: {marginTop: 8, fontSize: 14, textAlign: 'center'},
  genreWrap: {marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  genreChip: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1},
  moodCard: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  moodTitle: {fontSize: 14, fontWeight: '700'},
  tabsRow: {flexDirection: 'row', gap: 8, marginTop: 12},
  tabChip: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1},
  listItem: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
});
