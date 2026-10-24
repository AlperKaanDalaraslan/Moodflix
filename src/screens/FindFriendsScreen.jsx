import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {acceptFriendRequest, searchUsers, sendFriendRequest} from '../services/socialService';
import {getTheme} from '../theme/colors';

function relationFromUser(user) {
  const raw = String(user?.relation || user?.friendshipStatus || 'none');
  if (raw === 'incoming' || raw === 'incoming_request') {
    return 'incoming_request';
  }
  if (raw === 'outgoing' || raw === 'outgoing_request') {
    return 'outgoing_request';
  }
  if (raw === 'friends' || raw === 'friend') {
    return 'friend';
  }
  return 'none';
}

export function FindFriendsScreen() {
  const {token} = useAuth();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);

  const [searchState, setSearchState] = useState({
    query: '',
    results: [],
    loading: false,
  });
  const [error, setError] = useState('');

  const runSearch = async () => {
    if (searchState.query.trim().length < 2) {
      return;
    }
    setSearchState(prev => ({...prev, loading: true}));
    try {
      const data = await searchUsers(token, searchState.query.trim(), 20);
      const results = Array.isArray(data?.users) ? data.users : [];
      setSearchState(prev => ({...prev, results, loading: false}));
      setError('');
    } catch (e) {
      setSearchState(prev => ({...prev, loading: false}));
      setError(e?.message || t(locale, 'error'));
    }
  };

  const updateRelation = (userId, relation) => {
    setSearchState(prev => ({
      ...prev,
      results: prev.results.map(item =>
        String(item?.id ?? item?._id ?? '') === String(userId) ? {...item, relation} : item,
      ),
    }));
  };

  const onSendRequest = async userId => {
    updateRelation(userId, 'outgoing_request');
    try {
      await sendFriendRequest(token, userId);
      setError('');
    } catch (e) {
      updateRelation(userId, 'none');
      setError(e?.message || t(locale, 'error'));
    }
  };

  const onAcceptRequest = async userId => {
    updateRelation(userId, 'friend');
    try {
      await acceptFriendRequest(token, userId);
      setError('');
    } catch (e) {
      updateRelation(userId, 'incoming_request');
      setError(e?.message || t(locale, 'error'));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'socialFindFriends')}</Text>
        <TextInput
          value={searchState.query}
          onChangeText={query => setSearchState(prev => ({...prev, query}))}
          placeholder={t(locale, 'socialUserSearchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, {borderColor: colors.border, color: colors.text}]}
        />
        <Pressable
          disabled={searchState.query.trim().length < 2 || searchState.loading}
          onPress={runSearch}
          style={[styles.btn, {backgroundColor: colors.primary}]}>
          <Text style={[styles.btnText, {color: colors.onPrimary}]}>
            {searchState.loading ? t(locale, 'loading') : t(locale, 'search')}
          </Text>
        </Pressable>

        {error ? <Text style={[styles.msg, {color: colors.pass}]}>{error}</Text> : null}

        {searchState.results.map(user => {
          const id = String(user?.id ?? user?._id ?? '');
          const name = user?.name || user?.username || id;
          const relation = relationFromUser(user);
          return (
            <View key={id} style={[styles.card, {borderColor: colors.border}]}>
              <View style={styles.userHead}>
                <View style={[styles.avatar, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                  <Text style={[styles.avatarText, {color: colors.text}]}>
                    {String(name).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text style={[styles.name, {color: colors.text}]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.handle, {color: colors.textMuted}]} numberOfLines={1}>
                    @{user?.username || id}
                  </Text>
                </View>
              </View>
              {relation === 'none' ? (
                <Pressable onPress={() => onSendRequest(id)} style={[styles.actionBtn, {backgroundColor: colors.primary}]}>
                  <Text style={[styles.btnText, {color: colors.onPrimary}]}>{t(locale, 'socialSendRequest')}</Text>
                </Pressable>
              ) : null}
              {relation === 'outgoing_request' ? (
                <View style={[styles.actionBtn, styles.disabledBtn, {backgroundColor: colors.surfaceElevated}]}>
                  <Text style={[styles.btnText, {color: colors.textMuted}]}>{t(locale, 'socialRequestSentShort')}</Text>
                </View>
              ) : null}
              {relation === 'incoming_request' ? (
                <Pressable onPress={() => onAcceptRequest(id)} style={[styles.actionBtn, {backgroundColor: colors.primary}]}>
                  <Text style={[styles.btnText, {color: colors.onPrimary}]}>{t(locale, 'socialAcceptRequest')}</Text>
                </Pressable>
              ) : null}
              {relation === 'friend' ? (
                <View style={[styles.actionBtn, styles.disabledBtn, {backgroundColor: colors.surfaceElevated}]}>
                  <Text style={[styles.btnText, {color: colors.textMuted}]}>{t(locale, 'socialFriendStatus')}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: 16, paddingBottom: 30},
  title: {fontSize: 22, fontWeight: '800'},
  input: {marginTop: 12, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14},
  btn: {marginTop: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center'},
  btnText: {fontWeight: '800'},
  msg: {marginTop: 10, fontWeight: '700'},
  card: {marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12},
  userHead: {flexDirection: 'row', alignItems: 'center', gap: 10},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 15, fontWeight: '900'},
  name: {fontSize: 15, fontWeight: '700'},
  handle: {marginTop: 2, fontSize: 12, fontWeight: '600'},
  actionBtn: {marginTop: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  disabledBtn: {opacity: 0.85},
});
