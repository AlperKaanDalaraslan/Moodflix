import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  fetchGenreList,
  fetchTopRated,
  fetchTrendingMovies,
  hasApiKey,
} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

export function HomeScreen() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const navigation = useNavigation();

  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tr, top, g] = await Promise.all([
        fetchTrendingMovies(locale),
        fetchTopRated(locale, 1),
        fetchGenreList(locale),
      ]);
      setTrending(tr.results.slice(0, 12));
      setTopRated(top.results.slice(0, 12));
      setGenres(g.genres.slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const goMovie = id => {
    navigation.navigate('MovieDetail', {movieId: id});
  };

  const renderRow = (title, data) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, {color: colors.text}]}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 16, gap: 12}}
        renderItem={({item}) => (
          <Pressable onPress={() => goMovie(item.id)} style={{width: 120}}>
            <View style={{aspectRatio: 2 / 3, borderRadius: 14, overflow: 'hidden'}}>
              <PosterImage posterPath={item.poster_path} colors={colors} size="medium" />
            </View>
            <Text
              numberOfLines={2}
              style={{color: colors.text, marginTop: 8, fontSize: 13, fontWeight: '600'}}>
              {item.title}
            </Text>
            <Text style={{color: colors.textMuted, fontSize: 12}}>
              ★ {item.vote_average.toFixed(1)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, {color: colors.primary}]}>{t(locale, 'appName')}</Text>
          <Text style={{color: colors.textMuted, marginTop: 2}}>{t(locale, 'home')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={[styles.profileBtn, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <Text style={{color: colors.text, fontWeight: '700'}}>Me</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{color: colors.textMuted, marginTop: 8}}>{t(locale, 'loading')}</Text>
        </View>
      ) : error === 'TMDB_API_KEY_MISSING' ? (
        <View style={[styles.banner, {borderColor: colors.primary, backgroundColor: colors.surface}]}>
          <Text style={[styles.bannerTitle, {color: colors.text}]}>{t(locale, 'missingKeyTitle')}</Text>
          <Text style={{color: colors.textMuted, marginTop: 6, lineHeight: 20}}>
            {t(locale, 'missingKeyBody')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{color: colors.text}}>{t(locale, 'error')}</Text>
          <TouchableOpacity onPress={() => void load()} style={[styles.cta, {backgroundColor: colors.primary}]}>
            <Text style={{color: colors.onPrimary, fontWeight: '700'}}>{t(locale, 'tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{paddingBottom: 24}} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Discover')}
            style={[styles.heroCta, {backgroundColor: colors.primary}]}>
            <Text style={[styles.heroCtaText, {color: colors.onPrimary}]}>{t(locale, 'whatToday')}</Text>
            <Text style={{color: colors.onPrimary, opacity: 0.85, marginTop: 4}}>
              {t(locale, 'pickForYou')}
            </Text>
          </TouchableOpacity>

          {renderRow(t(locale, 'trending'), trending)}
          {renderRow(t(locale, 'topRated'), topRated)}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>{t(locale, 'categories')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 16, gap: 10}}>
              {genres.map(g => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => navigation.navigate('Discover', {initialGenreId: g.id})}
                  style={[
                    styles.chip,
                    {borderColor: colors.primary, backgroundColor: colors.surfaceElevated},
                  ]}>
                  <Text style={{color: colors.text, fontWeight: '600'}}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {fontSize: 22, fontWeight: '800', letterSpacing: 0.5},
  profileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroCta: {
    marginHorizontal: 16,
    marginBottom: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  heroCtaText: {fontSize: 17, fontWeight: '800'},
  section: {marginBottom: 22},
  sectionTitle: {fontSize: 18, fontWeight: '800', marginBottom: 12, paddingHorizontal: 16},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  banner: {margin: 16, padding: 16, borderRadius: 16, borderWidth: 1},
  bannerTitle: {fontSize: 18, fontWeight: '800'},
  cta: {marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999},
});
