import React, {useEffect, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getFeed} from '../services/socialService';
import {getTheme} from '../theme/colors';

function formatFeedText(item) {
  const actorName = item?.actor?.name || item?.actor?.username || 'Someone';
  const type = item?.type;
  const title = item?.payload?.title || 'a movie';
  const mood = item?.payload?.mood || 'something';
  if (type === 'watched_movie') {
    return `${actorName} watched ${title}`;
  }
  if (type === 'liked_movie') {
    return `${actorName} liked ${title}`;
  }
  if (type === 'mood_logged') {
    return `${actorName} is feeling ${mood}`;
  }
  return `${actorName} did something`;
}

export function ActivityFeedScreen() {
  const {token} = useAuth();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const [feedState, setFeedState] = useState({
    items: [],
    loading: false,
    refreshing: false,
    error: '',
  });

  const load = async refreshing => {
    setFeedState(prev => ({...prev, loading: !refreshing, refreshing: Boolean(refreshing)}));
    try {
      const data = await getFeed(token, 20, true);
      setFeedState({
        items: Array.isArray(data?.feed) ? data.feed : [],
        loading: false,
        refreshing: false,
        error: '',
      });
    } catch (e) {
      setFeedState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: e?.message || t(locale, 'error'),
      }));
    }
  };

  useEffect(() => {
    void load(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={feedState.refreshing}
            onRefresh={() => load(true)}
          />
        }>
        <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'socialFeed')}</Text>
        {feedState.loading ? <Text style={[styles.msg, {color: colors.textMuted}]}>{t(locale, 'loading')}</Text> : null}
        {feedState.error ? <Text style={[styles.msg, {color: colors.pass}]}>{feedState.error}</Text> : null}
        {feedState.items.map((it, idx) => (
          <View key={`${it?._id ?? idx}`} style={[styles.card, {borderColor: colors.border}]}>
            <Text style={[styles.main, {color: colors.text}]}>{formatFeedText(it)}</Text>
            <Text style={[styles.sub, {color: colors.textMuted}]}>
              {it?.createdAt || ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: 16, paddingBottom: 30},
  title: {fontSize: 22, fontWeight: '800'},
  msg: {marginTop: 10, fontWeight: '700'},
  card: {marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12},
  main: {fontSize: 14, fontWeight: '700'},
  sub: {marginTop: 4, fontSize: 13, fontWeight: '500'},
});
