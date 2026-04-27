import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {fetchCategoryBrowse, fetchGenreList, hasApiKey} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme, isDarkMode} from '../theme/colors';
import {shadow} from '../theme/shadows';

const SORT_OPTIONS = [
  {id: 'default', labelKey: 'sortDefault'},
  {id: 'popularity', labelKey: 'sortPopularity'},
  {id: 'vote_average', labelKey: 'sortRating'},
  {id: 'release_date', labelKey: 'sortRelease'},
];

const MIN_VOTE_OPTIONS = [
  {value: 0, labelKey: 'minVoteAny'},
  {value: 6, labelKey: 'minVote6'},
  {value: 7, labelKey: 'minVote7'},
  {value: 8, labelKey: 'minVote8'},
];

/** Ana karttaki tek satır — kendi modalını açar */
function FilterCardRow({label, value, colors, onPress, isLast}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{color: 'rgba(255,255,255,0.06)'}}
      style={({pressed}) => [
        styles.filterCardRow,
        {borderBottomColor: colors.border, opacity: pressed ? 0.9 : 1},
        isLast && styles.filterCardRowLast,
      ]}>
      <Text style={[styles.filterCardRowLabel, {color: colors.textMuted}]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.filterCardRowRight}>
        <Text style={[styles.filterCardRowValue, {color: colors.text}]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.filterCardRowChev, {color: colors.primary}]} allowFontScaling={false}>
          ▾
        </Text>
      </View>
    </Pressable>
  );
}

/** Tek konu: sadece başlık + liste + kapat */
function OptionPickerModal({
  visible,
  title,
  options,
  selectedKey,
  colors,
  locale,
  bottomInset,
  maxListHeight,
  onPick,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
          accessibilityLabel={t(locale, 'close')}
        />
        <View
          style={[
            styles.pickerSheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: 10 + bottomInset,
            },
          ]}>
          <View style={[styles.pickerGrab, {backgroundColor: colors.border}]} />
          <View style={[styles.pickerHeader, {borderBottomColor: colors.border}]}>
            <Text style={[styles.pickerTitle, {color: colors.text}]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t(locale, 'close')}
              style={({pressed}) => ({opacity: pressed ? 0.65 : 1})}>
              <Text style={[styles.pickerCloseGlyph, {color: colors.textMuted}]} allowFontScaling={false}>
                ✕
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={item => item.key}
            style={{maxHeight: maxListHeight}}
            keyboardShouldPersistTaps="handled"
            renderItem={({item, index}) => {
              const on = item.key === selectedKey;
              const isLast = index === options.length - 1;
              return (
                <Pressable
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                  android_ripple={{color: 'rgba(255,255,255,0.06)'}}
                  style={({pressed}) => [
                    styles.pickerRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      backgroundColor: on ? 'rgba(245,197,24,0.1)' : 'transparent',
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}>
                  <Text
                    style={[styles.pickerRowText, {color: colors.text, fontWeight: on ? '800' : '600'}]}
                    numberOfLines={2}>
                    {item.label}
                  </Text>
                  {on ? (
                    <Text style={[styles.pickerCheck, {color: colors.primary}]} allowFontScaling={false}>
                      ✓
                    </Text>
                  ) : (
                    <View style={styles.pickerCheckSpacer} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

export function CategoryListScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const darkMode = isDarkMode(theme);
  const navigation = useNavigation();
  const route = useRoute();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const {bottom: safeBottom} = useSafeAreaInsets();

  const H_PAD = 18;
  const COL_GAP = 14;
  const colWidth = (windowWidth - H_PAD * 2 - COL_GAP) / 2;
  const pickerListMaxH = Math.min(windowHeight * 0.56, 420);

  const categoryId = route.params?.categoryId;
  const titleKey = route.params?.titleKey;

  const [sort, setSort] = useState('default');
  const [minVote, setMinVote] = useState(0);
  /** @type {number|null} TMDB genre id; null = tüm türler */
  const [genreId, setGenreId] = useState(null);
  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  /** @type {'genre' | 'sort' | 'minVote' | null} */
  const [picker, setPicker] = useState(null);

  const loadSeq = useRef(0);
  const seenIds = useRef(new Set());
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const pagingRef = useRef(false);

  const title = useMemo(() => (titleKey ? t(locale, titleKey) : ''), [locale, titleKey]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || t(locale, 'categories'),
      headerBackTitleVisible: false,
      headerTitleStyle: {color: colors.text, fontWeight: '800', fontSize: 17},
    });
  }, [navigation, title, locale, colors.text]);

  const loadGenres = useCallback(async () => {
    if (!hasApiKey()) {
      return;
    }
    try {
      const g = await fetchGenreList(locale);
      const list = [...(g.genres ?? [])].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), locale, {sensitivity: 'base'}),
      );
      setGenres(list);
    } catch {
      setGenres([]);
    }
  }, [locale]);

  useEffect(() => {
    void loadGenres();
  }, [loadGenres]);

  const browseOpts = useMemo(
    () => ({sort, minVote, genreId: genreId ?? undefined}),
    [sort, minVote, genreId],
  );

  const resetAndLoad = useCallback(async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      setLoading(false);
      return;
    }
    if (
      !categoryId ||
      !['trending', 'popular', 'topRated', 'nowPlaying', 'upcoming'].includes(categoryId)
    ) {
      setError('bad_category');
      setLoading(false);
      return;
    }

    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    seenIds.current = new Set();
    pageRef.current = 1;
    pagingRef.current = false;

    try {
      const res = await fetchCategoryBrowse(locale, categoryId, 1, browseOpts);
      if (seq !== loadSeq.current) {
        return;
      }
      const rows = (res.results ?? []).filter(m => m?.poster_path);
      rows.forEach(m => seenIds.current.add(m.id));
      setItems(rows);
      totalPagesRef.current = Math.max(1, Number(res.total_pages) || 1);
      pageRef.current = 1;
    } catch (e) {
      if (seq === loadSeq.current) {
        totalPagesRef.current = 1;
        setError(e instanceof Error ? e.message : 'err');
      }
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, [locale, categoryId, browseOpts]);

  useEffect(() => {
    void resetAndLoad();
  }, [resetAndLoad]);

  const loadNextPage = useCallback(async () => {
    if (!hasApiKey() || loading || error === 'bad_category' || pagingRef.current) {
      return;
    }
    if (pageRef.current >= totalPagesRef.current) {
      return;
    }
    const next = pageRef.current + 1;
    const seq = loadSeq.current;
    pagingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchCategoryBrowse(locale, categoryId, next, browseOpts);
      if (seq !== loadSeq.current) {
        return;
      }
      const raw = res.results ?? [];
      const merged = [];
      for (const m of raw) {
        if (!m?.id || seenIds.current.has(m.id) || !m.poster_path) {
          continue;
        }
        seenIds.current.add(m.id);
        merged.push(m);
      }
      if (merged.length) {
        setItems(prev => [...prev, ...merged]);
      }
      pageRef.current = next;
      totalPagesRef.current = Math.max(1, Number(res.total_pages) || 1);
    } catch {
      /* keep list */
    } finally {
      pagingRef.current = false;
      setLoadingMore(false);
    }
  }, [locale, categoryId, browseOpts, loading, error]);

  const onEndReached = useCallback(() => {
    void loadNextPage();
  }, [loadNextPage]);

  const goMovie = useCallback(
    id => {
      navigation.navigate('MovieDetail', {movieId: id});
    },
    [navigation],
  );

  const genreLabel = useMemo(() => {
    if (genreId == null) {
      return t(locale, 'allGenres');
    }
    const g = genres.find(x => x.id === genreId);
    return g?.name ?? t(locale, 'allGenres');
  }, [genreId, genres, locale]);

  const sortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find(o => o.id === sort);
    return opt ? t(locale, opt.labelKey) : '';
  }, [locale, sort]);

  const minVoteLabel = useMemo(() => {
    const opt = MIN_VOTE_OPTIONS.find(o => o.value === minVote);
    return opt?.labelKey ? t(locale, opt.labelKey) : String(minVote);
  }, [locale, minVote]);

  const genreOptions = useMemo(
    () => [
      {key: '__all__', genreId: null, label: t(locale, 'allGenres')},
      ...genres.map(g => ({key: String(g.id), genreId: g.id, label: g.name})),
    ],
    [genres, locale],
  );

  const sortOptions = useMemo(
    () =>
      SORT_OPTIONS.map(o => ({
        key: o.id,
        sortId: o.id,
        label: t(locale, o.labelKey),
      })),
    [locale],
  );

  const minVoteOptions = useMemo(
    () =>
      MIN_VOTE_OPTIONS.map(o => ({
        key: String(o.value),
        value: o.value,
        label: o.labelKey ? t(locale, o.labelKey) : String(o.value),
      })),
    [locale],
  );

  const selectedGenreKey = genreId == null ? '__all__' : String(genreId);
  const selectedSortKey = sort;
  const selectedMinVoteKey = String(minVote);

  const closePicker = useCallback(() => setPicker(null), []);

  const renderItem = useCallback(
    ({item}) => (
      <Pressable
        onPress={() => goMovie(item.id)}
        style={[styles.cell, {width: colWidth}]}
        accessibilityRole="button"
        android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
        <View style={styles.card}>
          <View
            style={[
              styles.posterShell,
              shadow.poster,
              {backgroundColor: darkMode ? '#080808' : '#ECE8DC'},
            ]}>
            <View style={styles.posterInner}>
              <PosterImage posterPath={item.poster_path} colors={colors} size="medium" />
            </View>
          </View>
          <View style={styles.cardTextBlock}>
            <Text numberOfLines={2} style={[styles.cardTitle, {color: colors.text}]}>
              {item.title}
            </Text>
            <View style={styles.ratingRow}>
              <Text style={[styles.ratingStar, {color: colors.primary}]}>★</Text>
              <Text style={[styles.cardMeta, {color: colors.textMuted}]}>
                {(Number(item.vote_average) || 0).toFixed(1)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [colWidth, colors, goMovie, theme],
  );

  const filterHeader = useMemo(
    () => (
      <View style={styles.filterHeaderWrap}>
        <View
          style={[
            styles.filterCard,
            shadow.soft,
            {
              borderColor: colors.border,
              backgroundColor: darkMode ? '#121212' : colors.surface,
            },
          ]}>
          <FilterCardRow
            label={t(locale, 'genre')}
            value={genreLabel}
            colors={colors}
            onPress={() => setPicker('genre')}
            isLast={false}
          />
          <FilterCardRow
            label={t(locale, 'sortBy')}
            value={sortLabel}
            colors={colors}
            onPress={() => setPicker('sort')}
            isLast={false}
          />
          <FilterCardRow
            label={t(locale, 'minRating')}
            value={minVoteLabel}
            colors={colors}
            onPress={() => setPicker('minVote')}
            isLast
          />
        </View>
      </View>
    ),
    [colors, genreLabel, locale, minVoteLabel, sortLabel, theme],
  );

  const pickerModals = (
    <>
      <OptionPickerModal
        visible={picker === 'genre'}
        title={t(locale, 'genre')}
        options={genreOptions}
        selectedKey={selectedGenreKey}
        colors={colors}
        locale={locale}
        bottomInset={safeBottom}
        maxListHeight={pickerListMaxH}
        onPick={item => setGenreId(item.genreId)}
        onClose={closePicker}
      />
      <OptionPickerModal
        visible={picker === 'sort'}
        title={t(locale, 'sortBy')}
        options={sortOptions}
        selectedKey={selectedSortKey}
        colors={colors}
        locale={locale}
        bottomInset={safeBottom}
        maxListHeight={pickerListMaxH}
        onPick={item => setSort(item.sortId)}
        onClose={closePicker}
      />
      <OptionPickerModal
        visible={picker === 'minVote'}
        title={t(locale, 'minRating')}
        options={minVoteOptions}
        selectedKey={selectedMinVoteKey}
        colors={colors}
        locale={locale}
        bottomInset={safeBottom}
        maxListHeight={pickerListMaxH}
        onPick={item => setMinVote(item.value)}
        onClose={closePicker}
      />
    </>
  );

  if (!hasApiKey()) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={{color: colors.text}}>{t(locale, 'missingKeyTitle')}</Text>
          <Text style={{color: colors.textMuted, marginTop: 8, textAlign: 'center', paddingHorizontal: 24}}>
            {t(locale, 'missingKeyBody')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error === 'bad_category') {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={{color: colors.text}}>{t(locale, 'error')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['bottom']}>
      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{color: colors.textMuted, marginTop: 8}}>{t(locale, 'loading')}</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={{color: colors.text}}>{t(locale, 'error')}</Text>
          <Pressable
            onPress={() => void resetAndLoad()}
            style={[styles.retry, {backgroundColor: colors.primary}]}>
            <Text style={{color: colors.onPrimary, fontWeight: '700'}}>{t(locale, 'tryAgain')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {pickerModals}
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            ListHeaderComponent={filterHeader}
            renderItem={renderItem}
            columnWrapperStyle={[styles.rowPair, {paddingHorizontal: H_PAD, gap: COL_GAP}]}
            contentContainerStyle={styles.listContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{marginVertical: 20}} color={colors.primary} />
              ) : null
            }
            ListEmptyComponent={
              <Text style={[styles.empty, {color: colors.textMuted}]}>{t(locale, 'noResults')}</Text>
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  listContent: {paddingTop: 14, paddingBottom: 40},
  rowPair: {flexDirection: 'row', alignItems: 'stretch'},
  cell: {marginBottom: 28},
  card: {overflow: 'visible'},
  posterShell: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  posterInner: {
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardTextBlock: {paddingTop: 12, paddingHorizontal: 2},
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.35,
    lineHeight: 20,
    minHeight: 40,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  ratingStar: {fontSize: 13, fontWeight: '800', marginTop: -1},
  cardMeta: {fontSize: 13, fontWeight: '700', letterSpacing: 0.15},
  filterHeaderWrap: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  filterCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  filterCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterCardRowLast: {borderBottomWidth: 0},
  filterCardRowLabel: {
    flex: 0.36,
    minWidth: 86,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.65,
    textTransform: 'uppercase',
  },
  filterCardRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
  },
  filterCardRowValue: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  filterCardRowChev: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
  },
  pickerGrab: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.5,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
    marginRight: 12,
  },
  pickerCloseGlyph: {fontSize: 20, fontWeight: '600'},
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  pickerRowText: {
    flex: 1,
    fontSize: 16,
    letterSpacing: -0.2,
    paddingRight: 12,
  },
  pickerCheck: {fontSize: 17, fontWeight: '900', width: 24, textAlign: 'center'},
  pickerCheckSpacer: {width: 24},
  retry: {marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999},
  empty: {textAlign: 'center', marginTop: 48, paddingHorizontal: 24, fontSize: 15},
});
