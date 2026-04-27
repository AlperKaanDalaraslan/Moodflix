import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {discoverMovies, fetchGenreList, fetchPopular, searchMovies} from '../api/tmdbClient';
import {PosterImage} from './PosterImage';
import {
  buildMoviePosterAvatarToken,
  parseMoviePosterAvatarToken,
} from '../utils/avatarDisplay';
import {t} from '../i18n/translations';

const PAGE_SIZE = 30;

export function MovieAvatarPickerModal({visible, onClose, onSelect, colors, locale}) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const queryTrim = query.trim();

  const avatarTokens = useMemo(
    () =>
      items
        .filter(x => x?.id && x?.poster_path)
        .map(x => buildMoviePosterAvatarToken(x.id, x.poster_path))
        .filter(Boolean),
    [items],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void fetchGenreList(locale)
      .then(res => {
        if (!cancelled) {
          setGenres((res.genres ?? []).slice(0, 20));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGenres([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible, locale]);

  const loadPage = async pageToLoad => {
    if (queryTrim) {
      const res = await searchMovies(locale, queryTrim, pageToLoad);
      let rows = (res.results ?? []).filter(x => x?.poster_path);
      if (selectedGenreId != null) {
        rows = rows.filter(x => Array.isArray(x.genre_ids) && x.genre_ids.includes(selectedGenreId));
      }
      return rows;
    }
    if (selectedGenreId != null) {
      const res = await discoverMovies(locale, {
        page: pageToLoad,
        with_genres: String(selectedGenreId),
        sort_by: 'popularity.desc',
      });
      return (res.results ?? []).filter(x => x?.poster_path);
    }
    const res = await fetchPopular(locale, pageToLoad);
    return (res.results ?? []).filter(x => x?.poster_path);
  };

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPage(1);
    const run = async () => {
      try {
        if (!cancelled) {
          const rows = await loadPage(1);
          setItems(rows.slice(0, PAGE_SIZE));
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [visible, locale, queryTrim, selectedGenreId]);

  const loadMore = async () => {
    if (loading || loadingMore) {
      return;
    }
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const more = await loadPage(nextPage);
      setItems(prev => {
        const seen = new Set(prev.map(x => x.id));
        const merged = [...prev, ...more.filter(x => !seen.has(x.id))];
        return merged;
      });
      setPage(nextPage);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

  const onCloseAndReset = () => {
    setQuery('');
    setItems([]);
    setSelectedGenreId(null);
    setPage(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCloseAndReset}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCloseAndReset} />
        <View style={[styles.sheet, {backgroundColor: colors.surface, borderTopColor: colors.border}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'profileMovieAvatarTitle')}</Text>
            <TouchableOpacity onPress={onCloseAndReset} hitSlop={10}>
              <Text style={[styles.close, {color: colors.primary}]}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(locale, 'profileMovieAvatarSearchMovies')}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.search,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          />
          <View style={styles.catHead}>
            <Text style={[styles.catTitle, {color: colors.text}]}>
              {t(locale, 'categories')}
            </Text>
          </View>
          <FlatList
            horizontal
            data={[{id: 0, name: t(locale, 'allGenres')}, ...genres]}
            keyExtractor={item => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreRow}
            renderItem={({item}) => {
              const active =
                (item.id === 0 && selectedGenreId == null) || selectedGenreId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedGenreId(item.id === 0 ? null : item.id)}
                  style={[
                    styles.genreChip,
                    active
                      ? {backgroundColor: colors.primary, borderColor: colors.primary}
                      : {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                  ]}>
                  <Text
                    numberOfLines={1}
                    style={{color: active ? colors.onPrimary : colors.text, fontWeight: '700'}}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <Text style={[styles.hint, {color: colors.textMuted}]}>
            {t(locale, 'profileMovieAvatarHintReal')}
          </Text>

          <FlatList
            data={avatarTokens}
            keyExtractor={item => item}
            numColumns={5}
            onEndReachedThreshold={0.45}
            onEndReached={() => {
              void loadMore();
            }}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={
              loading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <View style={styles.center}>
                  <Text style={{color: colors.textMuted}}>{t(locale, 'noResults')}</Text>
                </View>
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
            renderItem={({item}) => {
              const parsed = parseMoviePosterAvatarToken(item);
              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    onCloseAndReset();
                  }}
                  style={[styles.cell, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                  <View style={styles.posterWrap}>
                    <PosterImage posterPath={parsed?.posterPath ?? null} colors={colors} size="small" />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)'},
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '88%',
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {fontSize: 18, fontWeight: '900'},
  close: {fontSize: 20, fontWeight: '700'},
  search: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  catHead: {paddingHorizontal: 16, paddingTop: 10},
  catTitle: {fontSize: 13, fontWeight: '800'},
  genreRow: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2, gap: 8},
  genreChip: {
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  hint: {paddingHorizontal: 16, paddingTop: 10, fontSize: 12, fontWeight: '600'},
  grid: {paddingHorizontal: 12, paddingTop: 8, paddingBottom: 28},
  center: {paddingVertical: 24, alignItems: 'center', justifyContent: 'center'},
  footerLoader: {paddingVertical: 12, alignItems: 'center'},
  cell: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  posterWrap: {width: 58, height: 78, borderRadius: 10, overflow: 'hidden'},
});

