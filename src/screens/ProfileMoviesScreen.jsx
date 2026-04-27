import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchMovieDetail, searchMovies} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useProfile} from '../context/ProfileContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme, isDarkMode} from '../theme/colors';
import {normalizeServerMovie} from '../utils/profileMovie';

export function ProfileMoviesScreen() {
  const navigation = useNavigation();
  const {params} = useRoute();
  const {profile, removeLiked, removeWatched} = useProfile();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const darkMode = isDarkMode(theme);
  const mode = params?.mode === 'watched' ? 'watched' : 'liked';
  const [posterById, setPosterById] = useState({});
  const [tmdbIdByKey, setTmdbIdByKey] = useState({});

  const title =
    mode === 'watched' ? t(locale, 'profileWatched') : t(locale, 'profileLiked');

  const rows = useMemo(() => {
    const src =
      mode === 'watched' ? profile?.watchedMovies : profile?.likedMovies;
    if (!Array.isArray(src)) {
      return [];
    }
    return src.map(normalizeServerMovie).filter(Boolean);
  }, [mode, profile]);

  const unresolvedRows = useMemo(
    () =>
      rows.filter(item => {
        const key = String(item.id);
        return !item.poster_path && !posterById[key];
      }),
    [rows, posterById],
  );

  useEffect(() => {
    if (!unresolvedRows.length) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      const nextPoster = {};
      const nextTmdb = {};
      for (const item of unresolvedRows.slice(0, 12)) {
        const key = String(item.id);
        const numericId = Number(item.id);
        try {
          if (Number.isFinite(numericId)) {
            const m = await fetchMovieDetail(locale, numericId);
            if (m?.poster_path) {
              nextPoster[key] = m.poster_path;
              nextTmdb[key] = numericId;
              continue;
            }
          }
          if (item.title) {
            const res = await searchMovies(locale, item.title, 1);
            const first = (res.results ?? []).find(x => x?.poster_path);
            if (first?.poster_path) {
              nextPoster[key] = first.poster_path;
              nextTmdb[key] = Number(first.id);
            }
          }
        } catch {
          /* ignore row errors */
        }
      }
      if (!cancelled && Object.keys(nextPoster).length) {
        setPosterById(prev => ({...prev, ...nextPoster}));
      }
      if (!cancelled && Object.keys(nextTmdb).length) {
        setTmdbIdByKey(prev => ({...prev, ...nextTmdb}));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [unresolvedRows, locale]);

  useLayoutEffect(() => {
    navigation.setOptions({title, headerTitle: title});
  }, [navigation, title]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(item, idx) => `${String(item.id)}-${idx}`}
        contentContainerStyle={rows.length ? styles.content : styles.contentEmpty}
        ListEmptyComponent={
          <View style={[styles.emptyBox, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            <Text style={[styles.emptyText, {color: colors.textMuted}]}>
              {t(locale, 'profileListEmpty')}
            </Text>
          </View>
        }
        renderItem={({item}) => {
          const key = String(item.id);
          const detailId = Number.isFinite(Number(item.id))
            ? Number(item.id)
            : Number(tmdbIdByKey[key]);
          const canOpen = Number.isFinite(detailId);
          return (
            <View
              style={[styles.row, {borderColor: colors.border, backgroundColor: colors.surface}]}>
              <TouchableOpacity
                style={styles.rowMain}
                activeOpacity={0.9}
                disabled={!canOpen}
                onPress={() => {
                  if (canOpen) {
                    navigation.navigate('MovieDetail', {movieId: detailId});
                  }
                }}>
                <View style={styles.avatar}>
                  <PosterImage
                    posterPath={item.poster_path ?? posterById[key] ?? null}
                    colors={colors}
                    size="small"
                    style={styles.avatarPoster}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={[styles.title, {color: colors.text}]}>
                    {item.title || `#${item.id}`}
                  </Text>
                  <Text numberOfLines={1} style={[styles.sub, {color: colors.textMuted}]}>
                    {canOpen ? 'Detaya git' : 'Poster aranıyor'}
                  </Text>
                </View>
                <Text style={[styles.chev, {color: colors.primary}]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (mode === 'watched') {
                    void removeWatched(item.id).catch(() => undefined);
                  } else {
                    void removeLiked(item.id).catch(() => undefined);
                  }
                }}
                style={[
                  styles.removeBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor:
                      darkMode
                        ? 'rgba(245, 197, 24, 0.14)'
                        : 'rgba(230, 172, 0, 0.16)',
                  },
                ]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Sil">
                <View style={[styles.trashIcon, {borderColor: colors.primary}]}>
                  <View style={[styles.trashLid, {backgroundColor: colors.primary}]} />
                  <View style={[styles.trashBody, {borderColor: colors.primary}]}>
                    <View style={[styles.trashLine, {backgroundColor: colors.primary}]} />
                    <View style={[styles.trashLine, {backgroundColor: colors.primary}]} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {paddingTop: 10, paddingBottom: 24, gap: 10, paddingHorizontal: 14},
  contentEmpty: {flexGrow: 1, justifyContent: 'center', padding: 16},
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  avatar: {width: 56, height: 56, borderRadius: 999, overflow: 'hidden'},
  avatarPoster: {borderRadius: 999},
  rowText: {flex: 1, marginLeft: 10, marginRight: 8},
  title: {fontSize: 16, fontWeight: '800'},
  sub: {fontSize: 12, fontWeight: '600', marginTop: 2},
  chev: {fontSize: 22, fontWeight: '400'},
  removeBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
    width: 40,
    height: 34,
    borderWidth: 1.5,
    borderRadius: 12,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIcon: {width: 15, alignItems: 'center'},
  trashLid: {width: 13, height: 2, borderRadius: 2, marginBottom: 2},
  trashBody: {
    width: 11,
    height: 11,
    borderWidth: 1.4,
    borderTopWidth: 1.6,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  trashLine: {width: 1.4, height: 6, borderRadius: 1},
  emptyBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
  },
  emptyText: {fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center'},
});

