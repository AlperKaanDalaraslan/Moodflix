import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchPersonDetail, hasApiKey} from '../api/tmdbClient';
import {PosterImage} from '../components/PosterImage';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';
import {openTitle} from '../utils/catalog';

const DEPT_KEYS = {
  Acting: 'personDeptActing',
  Directing: 'personDeptDirecting',
  Writing: 'personDeptWriting',
  Production: 'personDeptProduction',
  Creator: 'personDeptCreator',
};

function formatPersonDate(iso, locale) {
  if (!iso) {
    return '';
  }
  const [year, month, day] = String(iso).split('-').map(Number);
  if (!year) {
    return String(iso);
  }
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  try {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: month ? 'long' : undefined,
      day: day ? 'numeric' : undefined,
      timeZone: 'UTC',
    });
  } catch {
    return String(iso);
  }
}

function personWorks(person) {
  const seen = new Set();
  const rows = [];
  for (const raw of person?.combined_credits?.cast || []) {
    if (raw?.adult || raw?.id == null) {
      continue;
    }
    const mediaType = raw.media_type === 'tv' ? 'tv' : raw.media_type === 'movie' ? 'movie' : null;
    if (!mediaType) {
      continue;
    }
    const key = `${mediaType}:${raw.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      id: raw.id,
      media_type: mediaType,
      title: mediaType === 'tv' ? raw.name || raw.title || '' : raw.title || raw.name || '',
      poster_path: raw.poster_path || null,
      character: raw.character || '',
      popularity: raw.popularity || 0,
    });
  }
  rows.sort((a, b) => Number(b.popularity) - Number(a.popularity));
  return rows.slice(0, 18);
}

export function PersonScreen() {
  const {params} = useRoute();
  const navigation = useNavigation();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const personId = params?.personId;

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!hasApiKey()) {
      setError('TMDB_API_KEY_MISSING');
      setLoading(false);
      return;
    }
    if (personId == null) {
      setError('err');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPersonDetail(locale, personId);
      setPerson(next);
      if (next?.name) {
        navigation.setOptions({title: next.name});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'err');
    } finally {
      setLoading(false);
    }
  }, [locale, navigation, personId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: colors.background}]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, {color: colors.textMuted}]}>{t(locale, 'loading')}</Text>
      </View>
    );
  }

  if (error || !person) {
    return (
      <View style={[styles.center, styles.pad, {backgroundColor: colors.background}]}>
        <Text style={[styles.errorText, {color: colors.text}]}>
          {error === 'TMDB_API_KEY_MISSING' ? t(locale, 'missingKeyBody') : t(locale, 'error')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            load();
          }}
          style={[styles.cta, {backgroundColor: colors.primary}]}>
          <Text style={[styles.ctaText, {color: colors.onPrimary}]}>{t(locale, 'tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deptKey = DEPT_KEYS[person.known_for_department];
  const department = deptKey ? t(locale, deptKey) : person.known_for_department || '';
  const born = formatPersonDate(person.birthday, locale);
  const died = formatPersonDate(person.deathday, locale);
  const works = personWorks(person);

  return (
    <SafeAreaView style={[styles.screen, {backgroundColor: colors.background}]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={[styles.portrait, shadow.poster]}>
            <PosterImage posterPath={person.profile_path} colors={colors} size="large" />
          </View>
          <View style={styles.headBody}>
            <Text style={[styles.name, {color: colors.text}]}>{person.name}</Text>
            {department ? (
              <Text style={[styles.dept, {color: colors.primary}]}>{department}</Text>
            ) : null}
            {born ? (
              <Text style={[styles.fact, {color: colors.textMuted}]}>
                {t(locale, 'personBorn')}: {born}
              </Text>
            ) : null}
            {died ? (
              <Text style={[styles.fact, {color: colors.textMuted}]}>
                {t(locale, 'personDied')}: {died}
              </Text>
            ) : null}
            {person.place_of_birth ? (
              <Text style={[styles.fact, {color: colors.textMuted}]}>
                {t(locale, 'personFrom')}: {person.place_of_birth}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={[styles.section, {color: colors.text}]}>{t(locale, 'personBio')}</Text>
        <Text style={[styles.bio, {color: colors.textMuted}]}>{person.biography?.trim() || '—'}</Text>

        {works.length ? (
          <Text style={[styles.section, {color: colors.text}]}>{t(locale, 'personWorks')}</Text>
        ) : null}
        {works.length ? (
          <FlatList
            horizontal
            data={works}
            keyExtractor={item => `${item.media_type}:${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.works}
            style={styles.worksList}
            renderItem={({item}) => (
              <TouchableOpacity
                onPress={() => openTitle(navigation, item)}
                style={styles.work}>
                <View style={[styles.workPoster, shadow.poster]}>
                  <PosterImage posterPath={item.poster_path} colors={colors} size="small" />
                </View>
                <Text numberOfLines={2} style={[styles.workTitle, {color: colors.text}]}>
                  {item.title}
                </Text>
                {item.character ? (
                  <Text numberOfLines={1} style={[styles.workRole, {color: colors.textMuted}]}>
                    {item.character}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  pad: {padding: 20},
  loadingText: {marginTop: 10},
  errorText: {textAlign: 'center'},
  cta: {marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999},
  ctaText: {fontWeight: '800'},
  scroll: {paddingTop: 12, paddingBottom: 24},
  head: {flexDirection: 'row', gap: 14, paddingHorizontal: 16},
  portrait: {width: 120, aspectRatio: 2 / 3, borderRadius: 14, overflow: 'hidden'},
  headBody: {flex: 1, minWidth: 0, justifyContent: 'center'},
  name: {fontSize: 24, fontWeight: '900', letterSpacing: -0.3},
  dept: {marginTop: 6, fontSize: 14, fontWeight: '800'},
  fact: {marginTop: 6, fontSize: 13, fontWeight: '600', lineHeight: 18},
  section: {fontSize: 16, fontWeight: '900', marginTop: 18, marginBottom: 8, paddingHorizontal: 16},
  bio: {fontSize: 15, lineHeight: 22, paddingHorizontal: 16},
  worksList: {flexGrow: 0},
  works: {paddingHorizontal: 16, gap: 12},
  work: {width: 104},
  workPoster: {aspectRatio: 2 / 3, borderRadius: 12, overflow: 'hidden'},
  workTitle: {marginTop: 8, fontSize: 13, fontWeight: '800'},
  workRole: {marginTop: 2, fontSize: 12, fontWeight: '600'},
});
