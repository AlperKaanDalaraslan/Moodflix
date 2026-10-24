import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {addGroupMember, leaveGroup} from '../services/socialService';
import {
  castVote,
  createGroup,
  getGroupById,
  getGroupResult,
  joinGroup,
  listMyGroups,
} from '../services/groupService';
import {getTheme} from '../theme/colors';

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function normalizeGroups(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.groups)) {
    return payload.groups;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
}

function normalizeVotes(payload) {
  if (Array.isArray(payload?.votes)) {
    return payload.votes;
  }
  if (Array.isArray(payload?.data?.votes)) {
    return payload.data.votes;
  }
  return [];
}

function normalizeResult(payload) {
  const root = payload?.data ?? payload;
  return {
    selectedMovie:
      root?.selectedMovie ??
      root?.winner ??
      (root?.movieTitle ? {movieTitle: root.movieTitle, movieId: root.movieId} : null),
    breakdown: Array.isArray(root?.breakdown) ? root.breakdown : [],
  };
}

function toUserErrorMessage(err, locale) {
  const status = Number(err?.status);
  const backendMessage = firstString(err?.body?.message, err?.message);
  const backendHint = firstString(err?.body?.hint);
  const endpointMissing =
    status === 404 ||
    /endpoint yok|not found|cannot .*\/groups|\/api\/groups/i.test(
      `${backendMessage} ${backendHint}`,
    );
  if (endpointMissing) {
    return t(locale, 'watchTogetherBackendUnavailable');
  }
  return firstString(backendMessage, t(locale, 'error'));
}

export function WatchTogetherScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {locale, theme} = useSettings();
  const {hydrated, isLoggedIn, token} = useAuth();
  const colors = getTheme(theme);

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupDetail, setGroupDetail] = useState(null);
  const [groupVotes, setGroupVotes] = useState([]);
  const [groupResult, setGroupResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createName, setCreateName] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [voteMovieId, setVoteMovieId] = useState('');
  const [voteMovieTitle, setVoteMovieTitle] = useState('');
  const [memberUserId, setMemberUserId] = useState('');

  const selectedGroup = useMemo(
    () => groups.find(g => String(g?._id ?? g?.id) === selectedGroupId) ?? groupDetail,
    [groups, selectedGroupId, groupDetail],
  );

  const clearStatus = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const loadGroups = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      const data = await listMyGroups(token);
      const nextGroups = normalizeGroups(data);
      setGroups(nextGroups);
      if (!selectedGroupId && nextGroups.length > 0) {
        setSelectedGroupId(String(nextGroups[0]?._id ?? nextGroups[0]?.id ?? ''));
      }
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  }, [token, selectedGroupId, clearStatus, locale]);

  const loadSelectedGroup = useCallback(async () => {
    if (!token || !selectedGroupId) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      const detail = await getGroupById(token, selectedGroupId);
      setGroupDetail(detail?.data ?? detail);
      setGroupVotes(normalizeVotes(detail));
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  }, [token, selectedGroupId, clearStatus, locale]);

  useEffect(() => {
    if (hydrated && isLoggedIn) {
      void loadGroups();
    }
  }, [hydrated, isLoggedIn, loadGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      void loadSelectedGroup();
    } else {
      setGroupDetail(null);
      setGroupVotes([]);
      setGroupResult(null);
    }
  }, [selectedGroupId, loadSelectedGroup]);

  useEffect(() => {
    const initialGroupId = route?.params?.initialGroupId;
    if (typeof initialGroupId === 'string' && initialGroupId.trim()) {
      setSelectedGroupId(initialGroupId.trim());
    }
  }, [route?.params]);

  const onCreateGroup = async () => {
    const name = createName.trim();
    if (!name || !token) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      const payload = await createGroup(token, {name});
      const created = payload?.data ?? payload;
      const createdId = String(created?._id ?? created?.id ?? '');
      setCreateName('');
      setSuccess(t(locale, 'watchTogetherGroupCreated'));
      await loadGroups();
      if (createdId) {
        setSelectedGroupId(createdId);
      }
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  };

  const onJoinGroup = async () => {
    const groupId = joinGroupId.trim();
    if (!groupId || !token) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      await joinGroup(token, groupId);
      setJoinGroupId('');
      setSuccess(t(locale, 'watchTogetherJoined'));
      await loadGroups();
      setSelectedGroupId(groupId);
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  };

  const onCastVote = async () => {
    const movieId = voteMovieId.trim();
    const movieTitle = voteMovieTitle.trim();
    if (!token || !selectedGroupId || !movieId || !movieTitle) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      await castVote(token, selectedGroupId, {movieId, movieTitle});
      setSuccess(t(locale, 'watchTogetherVoted'));
      await loadSelectedGroup();
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  };

  const onFetchResult = async () => {
    if (!token || !selectedGroupId) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      const payload = await getGroupResult(token, selectedGroupId);
      setGroupResult(normalizeResult(payload));
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  };

  const onAddMember = async () => {
    const userId = memberUserId.trim();
    if (!token || !selectedGroupId || !userId) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      await addGroupMember(token, selectedGroupId, userId);
      setMemberUserId('');
      setSuccess(t(locale, 'watchTogetherMemberAdded'));
      await loadSelectedGroup();
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  };

  const onLeaveGroup = async () => {
    if (!token || !selectedGroupId) {
      return;
    }
    setLoading(true);
    clearStatus();
    try {
      await leaveGroup(token, selectedGroupId);
      setSuccess(t(locale, 'watchTogetherLeftGroup'));
      setSelectedGroupId('');
      await loadGroups();
    } catch (e) {
      setError(toUserErrorMessage(e, locale));
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || !isLoggedIn) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, {color: colors.text}]}>
            {t(locale, 'authRequiredTitle')}
          </Text>
          <Text style={[styles.emptyHint, {color: colors.textMuted}]}>
            {t(locale, 'watchTogetherNeedLogin')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'watchTogether')}</Text>
        <Text style={[styles.subtitle, {color: colors.textMuted}]}>
          {t(locale, 'watchTogetherSubtitle')}
        </Text>

        {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
        {error ? <Text style={[styles.feedbackError, {color: colors.pass}]}>{error}</Text> : null}
        {success ? (
          <Text style={[styles.feedbackSuccess, {color: colors.primary}]}>{success}</Text>
        ) : null}

        <View style={[styles.card, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <Text style={[styles.cardTitle, {color: colors.text}]}>
            {t(locale, 'watchTogetherCreateGroup')}
          </Text>
          <TextInput
            value={createName}
            onChangeText={setCreateName}
            placeholder={t(locale, 'watchTogetherGroupNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, {borderColor: colors.border, color: colors.text}]}
          />
          <Pressable
            onPress={onCreateGroup}
            style={[styles.button, {backgroundColor: colors.primary}]}>
            <Text style={[styles.buttonText, {color: colors.onPrimary}]}>
              {t(locale, 'watchTogetherCreate')}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <Text style={[styles.cardTitle, {color: colors.text}]}>
            {t(locale, 'watchTogetherJoinGroup')}
          </Text>
          <TextInput
            value={joinGroupId}
            onChangeText={setJoinGroupId}
            placeholder={t(locale, 'watchTogetherGroupIdPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={[styles.input, {borderColor: colors.border, color: colors.text}]}
          />
          <Pressable
            onPress={onJoinGroup}
            style={[styles.button, {backgroundColor: colors.primaryDark}]}>
            <Text style={[styles.buttonText, {color: colors.onPrimary}]}>
              {t(locale, 'watchTogetherJoin')}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, {color: colors.text}]}>
              {t(locale, 'watchTogetherMyGroups')}
            </Text>
            <Pressable onPress={() => void loadGroups()}>
              <Text style={[styles.link, {color: colors.primary}]}>{t(locale, 'profileRefresh')}</Text>
            </Pressable>
          </View>
          {groups.length === 0 ? (
            <Text style={[styles.emptyHint, {color: colors.textMuted}]}>
              {t(locale, 'watchTogetherNoGroups')}
            </Text>
          ) : (
            groups.map(group => {
              const id = String(group?._id ?? group?.id ?? '');
              const active = selectedGroupId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedGroupId(id)}
                  style={[
                    styles.groupItem,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.surfaceElevated : 'transparent',
                    },
                  ]}>
                  <Text style={[styles.groupName, {color: colors.text}]}>
                    {firstString(group?.name, t(locale, 'watchTogetherUntitledGroup'))}
                  </Text>
                  <Text style={[styles.groupMeta, {color: colors.textMuted}]}>
                    {id}
                  </Text>
                  <Pressable
                    style={[styles.inlineChatBtn, {borderColor: colors.primary}]}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        targetType: 'group',
                        targetId: id,
                        targetTitle: firstString(group?.name, t(locale, 'watchTogetherUntitledGroup')),
                      })
                    }>
                    <Text style={[styles.inlineChatText, {color: colors.primary}]}>
                      {t(locale, 'socialMessage')}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </View>

        {selectedGroupId ? (
          <View style={[styles.card, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            <Text style={[styles.cardTitle, {color: colors.text}]}>
              {t(locale, 'watchTogetherVote')}
            </Text>
            <TextInput
              value={voteMovieId}
              onChangeText={setVoteMovieId}
              placeholder={t(locale, 'watchTogetherMovieIdPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {borderColor: colors.border, color: colors.text}]}
            />
            <TextInput
              value={voteMovieTitle}
              onChangeText={setVoteMovieTitle}
              placeholder={t(locale, 'watchTogetherMovieTitlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {borderColor: colors.border, color: colors.text}]}
            />
            <Pressable
              onPress={onCastVote}
              style={[styles.button, {backgroundColor: colors.primary}]}>
              <Text style={[styles.buttonText, {color: colors.onPrimary}]}>
                {t(locale, 'watchTogetherCastVote')}
              </Text>
            </Pressable>

            <Pressable
              onPress={onFetchResult}
              style={[styles.buttonSecondary, {borderColor: colors.primary}]}>
              <Text style={[styles.buttonSecondaryText, {color: colors.primary}]}>
                {t(locale, 'watchTogetherSeeResult')}
              </Text>
            </Pressable>

            <TextInput
              value={memberUserId}
              onChangeText={setMemberUserId}
              placeholder={t(locale, 'watchTogetherAddMemberPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {borderColor: colors.border, color: colors.text}]}
            />
            <Pressable
              onPress={onAddMember}
              style={[styles.buttonSecondary, {borderColor: colors.primary}]}>
              <Text style={[styles.buttonSecondaryText, {color: colors.primary}]}>
                {t(locale, 'watchTogetherAddMember')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onLeaveGroup}
              style={[styles.buttonSecondary, {borderColor: colors.pass}]}>
              <Text style={[styles.buttonSecondaryText, {color: colors.pass}]}>
                {t(locale, 'watchTogetherLeaveGroup')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate('Chat', {
                  targetType: 'group',
                  targetId: selectedGroupId,
                  targetTitle: firstString(selectedGroup?.name, t(locale, 'watchTogetherUntitledGroup')),
                })
              }
              style={[styles.buttonSecondary, {borderColor: colors.primary}]}>
              <Text style={[styles.buttonSecondaryText, {color: colors.primary}]}>
                {t(locale, 'watchTogetherOpenGroupChat')}
              </Text>
            </Pressable>

            {groupVotes.length > 0 ? (
              <View style={styles.listBlock}>
                <Text style={[styles.listTitle, {color: colors.text}]}>
                  {t(locale, 'watchTogetherVotes')}
                </Text>
                {groupVotes.map((vote, idx) => (
                  <Text key={`${vote?.userId ?? 'user'}-${idx}`} style={[styles.listItem, {color: colors.textMuted}]}>
                    {firstString(vote?.movieTitle, vote?.movieId)} - {firstString(vote?.userId, 'user')}
                  </Text>
                ))}
              </View>
            ) : null}

            {groupResult?.selectedMovie ? (
              <View style={styles.listBlock}>
                <Text style={[styles.listTitle, {color: colors.text}]}>
                  {t(locale, 'watchTogetherResult')}
                </Text>
                <Text style={[styles.resultWinner, {color: colors.primary}]}>
                  {firstString(
                    groupResult.selectedMovie?.movieTitle,
                    groupResult.selectedMovie?.title,
                    groupResult.selectedMovie?.movieId,
                  )}
                </Text>
                {groupResult.breakdown.map((row, idx) => (
                  <Text key={`${row?.movieId ?? 'movie'}-${idx}`} style={[styles.listItem, {color: colors.textMuted}]}>
                    {firstString(row?.movieTitle, row?.movieId)}: {Number(row?.votes ?? row?.count ?? 0)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: 16, paddingBottom: 30},
  title: {fontSize: 22, fontWeight: '800'},
  subtitle: {marginTop: 6, fontSize: 14, fontWeight: '600', lineHeight: 20},
  loading: {marginTop: 12},
  feedbackError: {marginTop: 10, fontSize: 13, fontWeight: '700'},
  feedbackSuccess: {marginTop: 10, fontSize: 13, fontWeight: '700'},
  card: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  cardHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  cardTitle: {fontSize: 16, fontWeight: '800'},
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {fontSize: 14, fontWeight: '800'},
  buttonSecondary: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonSecondaryText: {fontSize: 14, fontWeight: '800'},
  link: {fontSize: 13, fontWeight: '700'},
  groupItem: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  groupName: {fontSize: 14, fontWeight: '700'},
  groupMeta: {marginTop: 3, fontSize: 12, fontWeight: '500'},
  inlineChatBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inlineChatText: {fontSize: 12, fontWeight: '800'},
  listBlock: {marginTop: 12},
  listTitle: {fontSize: 14, fontWeight: '800'},
  listItem: {marginTop: 6, fontSize: 13, fontWeight: '600'},
  resultWinner: {marginTop: 8, fontSize: 16, fontWeight: '900'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  emptyTitle: {fontSize: 18, fontWeight: '800'},
  emptyHint: {marginTop: 8, fontSize: 14, fontWeight: '600', textAlign: 'center'},
});
