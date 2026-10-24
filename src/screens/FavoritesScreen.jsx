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
import {fetchTitleDetail, searchMoviesForQuery} from '../api/tmdbClient';
import {FavoritesEmptyState} from '../components/FavoritesEmptyState';
import {MediaKindBadge} from '../components/MediaKindBadge';
import {PosterImage} from '../components/PosterImage';
import {catalogKey, mediaTypeOf} from '../utils/catalog';
import {useFavorites} from '../context/FavoritesContext';
import {useWatched} from '../context/WatchedContext';
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
  savedFav,
  savedWatched,
  onOpen,
  onToggleFav,
  onToggleWatched,
}) {
  const canOpen = Number.isFinite(Number(item.id)) || Number.isFinite(Number(item._tmdbId));
  const markStyle = active => ({
    borderColor: active ? colors.primary : colors.border,
    borderWidth: 1.5,
    backgroundColor: 'rgba(14,14,14,0.94)',
  });
  return (
    <View style={[styles.cell, {width: cellW}]}>
      <View style={[shadow.poster, styles.posterShell, {backgroundColor: '#000'}]}>
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={!canOpen}
          onPress={() => onOpen(item)}
          style={styles.posterTap}>
          <PosterImage posterPath={posterPath} colors={colors} size="medium" />
          <MediaKindBadge item={item} locale={locale} />
        </TouchableOpacity>
        <View style={styles.markStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(locale, savedWatched ? 'removeWatched' : 'markWatched')}
            hitSlop={8}
            onPress={() => onToggleWatched(item)}
            style={({pressed}) => [
              styles.favoriteFab,
              markStyle(savedWatched),
              pressed ? {borderWidth: 2} : null,
            ]}>
            <Text style={[styles.favoriteFabHeart, {color: savedWatched ? colors.primary : colors.textMuted}]}>
              ✓
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(locale, savedFav ? 'removeFavorite' : 'addFavorite')}
            hitSlop={8}
            onPress={() => onToggleFav(item)}
            style={({pressed}) => [
              styles.favoriteFab,
              markStyle(savedFav),
              pressed ? {borderWidth: 2} : null,
            ]}>
            <Text style={[styles.favoriteFabHeart, {color: savedFav ? colors.primary : colors.textMuted}]}>
              {savedFav ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>
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
  const {favorites, toggleFavorite, isFavorite} = useFavorites();
  const {watched, toggleWatched, isWatched} = useWatched();
  const [listMode, setListMode] = useState('favorites');
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

  const source = listMode === 'watched' ? watched : favorites;
  const safeFavorites = useMemo(() => {
    void focusTick;
    return Array.isArray(source) ? source : [];
  }, [source, focusTick]);

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
        const key = catalogKey(item) || String(item.id);
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
        const key = catalogKey(item) || String(item.id);
        resolving.current.add(key);
        const numericId = Number(item.id);
        try {
          if (Number.isFinite(numericId)) {
            const m = await fetchTitleDetail(locale, numericId, mediaTypeOf(item));
            if (m?.poster_path) {
              nextPoster[key] = m.poster_path;
              nextTmdb[key] = numericId;
              continue;
            }
          }
          if (item?.title) {
            const res = await searchMoviesForQuery(locale, item.title, 1);
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

  const onToggleFav = useCallback(item => {
    toggleFavorite(item);
  }, [toggleFavorite]);

  const onToggleWatchedItem = useCallback(item => {
    toggleWatched(item);
  }, [toggleWatched]);

  const onOpen = useCallback(
    item => {
      const key = catalogKey(item) || String(item.id);
      const detailId = Number.isFinite(Number(item.id))
        ? Number(item.id)
        : Number(tmdbIdByKey[key]);
      if (Number.isFinite(detailId)) {
        navigation.navigate('MovieDetail', {
          movieId: detailId,
          mediaType: mediaTypeOf(item),
        });
      }
    },
    [navigation, tmdbIdByKey],
  );

  const renderItem = useCallback(
    ({item}) => {
      const key = catalogKey(item) || String(item.id);
      return (
        <FavoriteCell
          item={{...item, _tmdbId: tmdbIdByKey[key]}}
          posterPath={item.poster_path ?? posterById[key] ?? null}
          colors={colors}
          locale={locale}
          cellW={cellW}
          savedFav={isFavorite(item)}
          savedWatched={isWatched(item)}
          onOpen={onOpen}
          onToggleFav={onToggleFav}
          onToggleWatched={onToggleWatchedItem}
        />
      );
    },
    [cellW, colors, isFavorite, isWatched, locale, onOpen, onToggleFav, onToggleWatchedItem, posterById, tmdbIdByKey],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.headTitle, {color: colors.text}]}>
            {t(locale, listMode === 'watched' ? 'watched' : 'favorites')}
          </Text>
          {safeFavorites.length ? (
            <Text style={[styles.headCount, {color: colors.textMuted}]}>
              {safeFavorites.length} {t(locale, 'favoritesCount')}
            </Text>
          ) : null}
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t(locale, listMode === 'watched' ? 'watchedSearch' : 'favoritesSearch')}
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
        <View style={[styles.switchRow, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          {[
            {id: 'favorites', label: t(locale, 'favorites')},
            {id: 'watched', label: t(locale, 'watched')},
          ].map(option => {
            const active = listMode === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setListMode(option.id);
                  setQuery('');
                }}
                style={[
                  styles.switchItem,
                  active ? {backgroundColor: colors.primary} : null,
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.onPrimary : colors.text,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {safeFavorites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FavoritesEmptyState
            colors={colors}
            locale={locale}
            navigation={navigation}
            mode={listMode}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => catalogKey(item) || String(item.id)}
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
  switchRow: {
    marginTop: 14,
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  switchItem: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 8,
  },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markStack: {
    position: 'absolute',
    top: 8,
    right: 8,
    gap: 6,
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
