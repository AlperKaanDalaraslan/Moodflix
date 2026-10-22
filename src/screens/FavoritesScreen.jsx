import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchMovieDetail, searchMovies} from '../api/tmdbClient';
import {FavoritesEmptyState} from '../components/FavoritesEmptyState';
import {PosterImage} from '../components/PosterImage';
import {useFavorites} from '../context/FavoritesContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';

const GAP = 12;
const H_PAD = 16;

const FavoriteCell = memo(function FavoriteCell({
  item,
  posterPath,
  colors,
  locale,
  cellW,
  onOpen,
  onRemove,
}) {
  const canOpen = Number.isFinite(Number(item.id)) || Number.isFinite(Number(item._tmdbId));
  return (
    <View style={[styles.cell, {width: cellW}]}>
      <View style={[shadow.poster, styles.posterShell, {backgroundColor: '#000'}]}>
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={!canOpen}
          onPress={() => onOpen(item)}
          style={styles.posterTap}>
          <PosterImage posterPath={posterPath} colors={colors} size="medium" />
        </TouchableOpacity>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(locale, 'removeFavorite')}
          hitSlop={10}
          onPress={() => onRemove(item)}
          style={({pressed}) => [
            styles.favoriteFab,
            {
              borderColor: colors.primary,
              borderWidth: pressed ? 2 : 1.5,
              backgroundColor: pressed
                ? 'rgba(32,28,18,0.96)'
                : 'rgba(14,14,14,0.94)',
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
        {item.title || `#${item.id}`}
      </Text>
    </View>
  );
});

export function FavoritesScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const {favorites, toggleFavorite} = useFavorites();
  const navigation = useNavigation();
  const {width: winW} = useWindowDimensions();
  const [posterById, setPosterById] = useState({});
  const [tmdbIdByKey, setTmdbIdByKey] = useState({});
  const [query, setQuery] = useState('');
  const [focusTick, setFocusTick] = useState(0);
  const resolving = useRef(new Set());
  const posterByIdRef = useRef(posterById);
  posterByIdRef.current = posterById;

  useFocusEffect(
    useCallback(() => {
      setFocusTick(n => n + 1);
    }, []),
  );

  const safeFavorites = useMemo(() => {
    void focusTick;
    return Array.isArray(favorites) ? favorites : [];
  }, [favorites, focusTick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) {
      return safeFavorites;
    }
    return safeFavorites.filter(item =>
      String(item.title || '').toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [query, safeFavorites]);

  const cellW = useMemo(() => {
    return Math.floor((winW - H_PAD * 2 - GAP) / 2);
  }, [winW]);

  const hydratePosters = useCallback(
    async items => {
      const need = items.filter(item => {
        const key = String(item.id);
        if (item.poster_path || posterByIdRef.current[key]) {
          return false;
        }
        if (resolving.current.has(key)) {
          return false;
        }
        return true;
      });
      if (!need.length) {
        return;
      }
      const nextPoster = {};
      const nextTmdb = {};
      for (const item of need.slice(0, 8)) {
        const key = String(item.id);
        resolving.current.add(key);
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
          if (item?.title) {
            const res = await searchMovies(locale, item.title, 1);
            const first = (res.results ?? []).find(x => x?.poster_path);
            if (first?.poster_path) {
              nextPoster[key] = first.poster_path;
              nextTmdb[key] = Number(first.id);
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (Object.keys(nextPoster).length) {
        setPosterById(prev => ({...prev, ...nextPoster}));
      }
      if (Object.keys(nextTmdb).length) {
        setTmdbIdByKey(prev => ({...prev, ...nextTmdb}));
      }
    },
    [locale],
  );

  useEffect(() => {
    void hydratePosters(filtered.slice(0, 12));
  }, [filtered, hydratePosters]);

  const hydrateRef = useRef(hydratePosters);
  hydrateRef.current = hydratePosters;
  const onViewableItemsChanged = useRef(({viewableItems}) => {
    const rows = viewableItems.map(v => v.item).filter(Boolean);
    void hydrateRef.current(rows);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
  }).current;

  const onRemoveFavorite = useCallback(
    item => {
      toggleFavorite(item);
    },
    [toggleFavorite],
  );

  const onOpen = useCallback(
    item => {
      const key = String(item.id);
      const detailId = Number.isFinite(Number(item.id))
        ? Number(item.id)
        : Number(tmdbIdByKey[key]);
      if (Number.isFinite(detailId)) {
        navigation.navigate('MovieDetail', {movieId: detailId});
      }
    },
    [navigation, tmdbIdByKey],
  );

  const renderItem = useCallback(
    ({item}) => {
      const key = String(item.id);
      return (
        <FavoriteCell
          item={{...item, _tmdbId: tmdbIdByKey[key]}}
          posterPath={item.poster_path ?? posterById[key] ?? null}
          colors={colors}
          locale={locale}
          cellW={cellW}
          onOpen={onOpen}
          onRemove={onRemoveFavorite}
        />
      );
    },
    [cellW, colors, locale, onOpen, onRemoveFavorite, posterById, tmdbIdByKey],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.headTitle, {color: colors.text}]}>
            {t(locale, 'favorites')}
          </Text>
          {safeFavorites.length ? (
            <Text style={[styles.headCount, {color: colors.textMuted}]}>
              {safeFavorites.length} {t(locale, 'favoritesCount')}
            </Text>
          ) : null}
        </View>
        {safeFavorites.length > 8 ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(locale, 'favoritesSearch')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              styles.search,
              {
                color: colors.text,
                borderColor: `${colors.primary}33`,
                backgroundColor: colors.surface,
              },
            ]}
          />
        ) : null}
      </View>

      {safeFavorites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FavoritesEmptyState colors={colors} locale={locale} navigation={navigation} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          renderItem={renderItem}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            query.trim() ? (
              <Text style={[styles.noMatch, {color: colors.textMuted}]}>
                {t(locale, 'noResults')}
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {paddingHorizontal: H_PAD, paddingBottom: 10},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  headTitle: {fontSize: 22, fontWeight: '800', letterSpacing: 0.2},
  headCount: {fontSize: 13, fontWeight: '500', letterSpacing: 0.4},
  search: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '400',
  },
  emptyWrap: {flex: 1, paddingHorizontal: 16, justifyContent: 'center'},
  list: {paddingHorizontal: H_PAD, paddingBottom: 28},
  row: {gap: GAP, marginBottom: GAP},
  cell: {
    flexGrow: 0,
  },
  posterShell: {
    borderRadius: 16,
    position: 'relative',
  },
  posterTap: {
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
  },
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
  noMatch: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 14,
  },
});
