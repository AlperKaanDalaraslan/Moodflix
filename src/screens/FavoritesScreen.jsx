import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchMovieDetail, searchMovies} from '../api/tmdbClient';
import {FavoritesEmptyState} from '../components/FavoritesEmptyState';
import {PosterImage} from '../components/PosterImage';
import {useAuth} from '../context/AuthContext';
import {useFavorites} from '../context/FavoritesContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';
import {showLoginRequiredAlert} from '../utils/authGate';

export function FavoritesScreen() {
  const {locale, theme} = useSettings();
  const {hydrated, isLoggedIn} = useAuth();
  const colors = getTheme(theme);
  const {favorites, toggleFavorite} = useFavorites();
  const navigation = useNavigation();
  const [posterById, setPosterById] = useState({});
  const [tmdbIdByKey, setTmdbIdByKey] = useState({});
  const safeFavorites = Array.isArray(favorites) ? favorites : [];

  const unresolvedFavorites = useMemo(
    () =>
      safeFavorites.filter(item => {
        const key = String(item.id);
        return !item.poster_path && !posterById[key];
      }),
    [safeFavorites, posterById],
  );

  useEffect(() => {
    if (!unresolvedFavorites.length) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      const nextPosterById = {};
      const nextTmdbByKey = {};
      for (const item of unresolvedFavorites.slice(0, 12)) {
        const key = String(item.id);
        const numericId = Number(item.id);
        try {
          if (Number.isFinite(numericId)) {
            const m = await fetchMovieDetail(locale, numericId);
            if (m?.poster_path) {
              nextPosterById[key] = m.poster_path;
              nextTmdbByKey[key] = numericId;
              continue;
            }
          }
          if (item?.title) {
            const res = await searchMovies(locale, item.title, 1);
            const first = (res.results ?? []).find(x => x?.poster_path);
            if (first?.poster_path) {
              nextPosterById[key] = first.poster_path;
              nextTmdbByKey[key] = Number(first.id);
            }
          }
        } catch {
          /* ignore single row errors */
        }
      }
      if (!cancelled && Object.keys(nextPosterById).length) {
        setPosterById(prev => ({...prev, ...nextPosterById}));
      }
      if (!cancelled && Object.keys(nextTmdbByKey).length) {
        setTmdbIdByKey(prev => ({...prev, ...nextTmdbByKey}));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [unresolvedFavorites, locale]);

  const onRemoveFavorite = useCallback(
    item => {
      const ok = toggleFavorite(item);
      if (!ok) {
        showLoginRequiredAlert(navigation, locale);
      }
    },
    [toggleFavorite, navigation, locale],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <Text style={{color: colors.text, fontSize: 22, fontWeight: '900'}}>{t(locale, 'favorites')}</Text>
      </View>

      <FlatList
        data={safeFavorites}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{gap: 12, paddingHorizontal: 16}}
        contentContainerStyle={
          safeFavorites.length === 0
            ? {paddingBottom: 24, flexGrow: 1, paddingHorizontal: 16, justifyContent: 'center'}
            : {paddingBottom: 24, gap: 14, flexGrow: 1}
        }
        ListEmptyComponent={
          <FavoritesEmptyState
            colors={colors}
            locale={locale}
            navigation={navigation}
            needsAuth={hydrated && !isLoggedIn}
          />
        }
        renderItem={({item}) => (
          <View style={styles.cell}>
            <View style={[shadow.poster, styles.posterShell, {backgroundColor: '#000'}]}>
              <TouchableOpacity
                activeOpacity={0.92}
                disabled={
                  !Number.isFinite(Number(item.id)) &&
                  !Number.isFinite(Number(tmdbIdByKey[String(item.id)]))
                }
                onPress={() => {
                  const detailId = Number.isFinite(Number(item.id))
                    ? Number(item.id)
                    : Number(tmdbIdByKey[String(item.id)]);
                  const canOpenDetail = Number.isFinite(detailId);
                  if (canOpenDetail) {
                    navigation.navigate('MovieDetail', {movieId: detailId});
                  }
                }}
                style={styles.posterTap}>
                <PosterImage
                  posterPath={item.poster_path ?? posterById[String(item.id)] ?? null}
                  colors={colors}
                  size="medium"
                />
              </TouchableOpacity>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(locale, 'removeFavorite')}
                hitSlop={10}
                android_ripple={{color: 'rgba(255,255,255,0.14)', borderless: true}}
                onPress={() => onRemoveFavorite(item)}
                style={({pressed}) => [
                  styles.favoriteFab,
                  {
                    borderColor: colors.primary,
                    borderWidth: pressed ? 2 : 1.5,
                    backgroundColor: pressed ? 'rgba(32,28,18,0.96)' : 'rgba(14,14,14,0.94)',
                  },
                ]}>
                <Text
                  style={[
                    styles.favoriteFabHeart,
                    {
                      color: colors.primary,
                      textShadowColor: 'rgba(0,0,0,0.85)',
                      textShadowOffset: {width: 0, height: 1},
                      textShadowRadius: 4,
                    },
                  ]}>
                  ♥
                </Text>
              </Pressable>
            </View>
            <Text numberOfLines={2} style={[styles.title, {color: colors.text}]}>
              {item.title}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  cell: {flex: 1},
  posterShell: {
    borderRadius: 16,
    position: 'relative',
  },
  posterTap: {
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  /** Filled heart = favorited; one tap removes (same mental model as the tab bar ♥) */
  favoriteFab: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  favoriteFabHeart: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  title: {
    marginTop: 10,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
});
