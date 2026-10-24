import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {acceptFriendRequest, getFriends} from '../services/socialService';
import {getTheme} from '../theme/colors';

const TABS = ['friends', 'incoming', 'outgoing'];

export function FriendsScreen({navigation}) {
  const {token} = useAuth();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);

  const [friendsState, setFriendsState] = useState({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const displayName = useCallback(
    item => item?.name || item?.username || item?.displayName || String(item?.id ?? item?._id ?? ''),
    [],
  );

  const getId = useCallback(item => String(item?.id ?? item?._id ?? ''), []);

  const hydrateFriends = useCallback(async isRefresh => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getFriends(token);
      setFriendsState({
        friends: Array.isArray(data?.friends) ? data.friends : [],
        incomingRequests: Array.isArray(data?.incomingRequests) ? data.incomingRequests : [],
        outgoingRequests: Array.isArray(data?.outgoingRequests) ? data.outgoingRequests : [],
      });
      setError('');
    } catch (e) {
      setError(e?.message || t(locale, 'error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locale, token]);

  useEffect(() => {
    void hydrateFriends(false);
  }, [hydrateFriends]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(locale, 'socialFriends'),
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('FindFriends')}>
          <Text style={{color: colors.primary, fontWeight: '800'}}>{t(locale, 'socialFindFriends')}</Text>
        </Pressable>
      ),
    });
  }, [navigation, locale, colors.primary]);

  const tabItems = useMemo(() => {
    if (activeTab === 'incoming') {
      return friendsState.incomingRequests;
    }
    if (activeTab === 'outgoing') {
      return friendsState.outgoingRequests;
    }
    return friendsState.friends;
  }, [activeTab, friendsState]);

  const acceptIncoming = async userId => {
    const accepted = friendsState.incomingRequests.find(item => getId(item) === userId);
    if (!accepted) {
      return;
    }
    setFriendsState(prev => ({
      ...prev,
      incomingRequests: prev.incomingRequests.filter(item => getId(item) !== userId),
      friends: [{...accepted, relation: 'friend'}, ...prev.friends],
    }));
    try {
      await acceptFriendRequest(token, userId);
    } catch (e) {
      setError(e?.message || t(locale, 'error'));
      void hydrateFriends(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={refreshing}
            onRefresh={() => hydrateFriends(true)}
          />
        }>
        <Pressable
          onPress={() => navigation.navigate('FindFriends')}
          style={[styles.addFriendBtn, {backgroundColor: colors.primary}]}>
          <Text style={[styles.addFriendBtnText, {color: colors.onPrimary}]}>
            {t(locale, 'socialAddFriend')}
          </Text>
        </Pressable>

        <View style={styles.tabsRow}>
          {TABS.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabChip,
                {
                  borderColor: activeTab === tab ? colors.primary : colors.border,
                  backgroundColor:
                    activeTab === tab ? colors.surfaceElevated : colors.surface,
                },
              ]}>
              <Text
                style={[
                  styles.tabChipText,
                  {color: activeTab === tab ? colors.primary : colors.text},
                ]}>
                {tab === 'friends'
                  ? t(locale, 'socialMyFriends')
                  : tab === 'incoming'
                    ? t(locale, 'socialIncomingRequests')
                    : t(locale, 'socialOutgoingRequests')}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={[styles.msg, {color: colors.pass}]}>{error}</Text> : null}
        {loading ? <Text style={[styles.msg, {color: colors.textMuted}]}>{t(locale, 'loading')}</Text> : null}
        {!loading && tabItems.length === 0 ? (
          <Text style={[styles.msg, {color: colors.textMuted}]}>
            {activeTab === 'incoming'
              ? t(locale, 'socialNoIncomingRequests')
              : t(locale, 'socialNoFriends')}
          </Text>
        ) : null}

        {tabItems.map(item => {
          const id = getId(item);
          const name = displayName(item);
          return (
            <View key={id} style={[styles.card, {borderColor: colors.border}]}>
              <Pressable
                onPress={() => navigation.navigate('FriendProfile', {userId: id, displayName: name})}
                style={styles.userHead}>
                <View style={[styles.avatar, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                  <Text style={[styles.avatarText, {color: colors.text}]}>
                    {String(name).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text style={[styles.name, {color: colors.text}]}>{name}</Text>
                  <Text style={[styles.handle, {color: colors.textMuted}]}>
                    @{item?.username || id}
                  </Text>
                </View>
              </Pressable>
              {activeTab === 'incoming' ? (
                <Pressable
                  onPress={() => acceptIncoming(id)}
                  style={[styles.btn, {backgroundColor: colors.primary}]}>
                  <Text style={[styles.btnText, {color: colors.onPrimary}]}>
                    {t(locale, 'socialAccept')}
                  </Text>
                </Pressable>
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
  addFriendBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  addFriendBtnText: {fontSize: 14, fontWeight: '800'},
  tabsRow: {flexDirection: 'row', gap: 8},
  tabChip: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1},
  tabChipText: {fontWeight: '700', fontSize: 12},
  btn: {paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10},
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
});
