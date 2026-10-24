import React, {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {castVote, getGroupResult} from '../services/groupService';
import {
  getGroupChat,
  getPrivateChat,
  listMyChats,
  sendGroupMessage,
  sendPrivateMessage,
} from '../services/socialService';
import {getTheme} from '../theme/colors';

function buildPollMovieIdFromTitle(title) {
  const normalized = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
  return normalized || `movie-${Date.now()}`;
}

export function ChatScreen({navigation, route}) {
  const {token, user} = useAuth();
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const [activeChat, setActiveChat] = useState(null);
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [chats, setChats] = useState([]);
  const [voteMovieTitle, setVoteMovieTitle] = useState('');
  const [voteSummary, setVoteSummary] = useState(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const safeItems = Array.isArray(items) ? items : [];

  const targetType = activeChat?.type ?? '';
  const targetId = activeChat?.id ?? '';
  const targetTitle = activeChat?.title ?? t(locale, 'socialChat');

  useEffect(() => {
    const preType = route?.params?.targetType;
    const preId = route?.params?.targetId;
    const preTitle = route?.params?.targetTitle;
    if (preType === 'private' || preType === 'group') {
      const id = typeof preId === 'string' ? preId.trim() : '';
      if (id) {
        setActiveChat({
          type: preType,
          id,
          title: typeof preTitle === 'string' && preTitle.trim() ? preTitle.trim() : id,
        });
      }
    }
  }, [route?.params]);

  const loadChats = async () => {
    try {
      const data = await listMyChats(token);
      const list = Array.isArray(data?.chats)
        ? data.chats
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
      const mapped = list.map(chat => {
        const isPrivate = chat?.type === 'private';
        const id = String(
          isPrivate ? chat?.peer?.id ?? chat?.peer?._id : chat?.group?.id ?? chat?.group?._id,
        );
        const title = isPrivate
          ? chat?.peer?.name || chat?.peer?.username || id
          : chat?.group?.name || id;
        return {
          type: isPrivate ? 'private' : 'group',
          id,
          title,
          preview: chat?.lastMessage?.text || t(locale, 'socialNoMessage'),
        };
      });
      setChats(mapped);
      setMsg('');
    } catch (e) {
      setMsg(e?.message || t(locale, 'error'));
    }
  };

  const load = async () => {
    if (!targetId.trim()) {
      return;
    }
    try {
      const data =
        targetType === 'private'
          ? await getPrivateChat(token, targetId)
          : await getGroupChat(token, targetId);
      setItems(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      if (targetType === 'group') {
        const payload = await getGroupResult(token, targetId).catch(() => null);
        const root = payload?.data ?? payload;
        if (root) {
          setVoteSummary(root);
        }
      }
      setMsg('');
    } catch (e) {
      setMsg(e?.message || t(locale, 'error'));
    }
  };

  const send = async () => {
    if (!targetId.trim() || !text.trim()) {
      return;
    }
    try {
      if (targetType === 'private') {
        await sendPrivateMessage(token, targetId, text);
      } else {
        await sendGroupMessage(token, targetId, text);
      }
      setText('');
      setMsg(t(locale, 'socialMessageSent'));
      await load();
    } catch (e) {
      setMsg(e?.message || t(locale, 'error'));
    }
  };

  useEffect(() => {
    void loadChats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (targetId) {
      void load();
    }
  }, [targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top']}>
      {!activeChat ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, {color: colors.text}]}>{t(locale, 'socialChat')}</Text>
          <Pressable style={[styles.btn, {backgroundColor: colors.surfaceElevated}]} onPress={loadChats}>
            <Text style={[styles.btnText, {color: colors.text}]}>{t(locale, 'socialLoadChats')}</Text>
          </Pressable>
          {chats.map((chat, idx) => (
            <Pressable
              key={`${chat.type}-${chat.id}-${idx}`}
              style={[styles.card, {borderColor: colors.border}]}
              onPress={() => {
                setActiveChat(chat);
                setItems([]);
                setVoteSummary(null);
              }}>
              <Text style={{color: colors.text, fontWeight: '700'}}>{chat.title}</Text>
              <Text style={{color: colors.textMuted, marginTop: 4}}>{chat.preview}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.threadWrap}>
          <View style={[styles.threadHead, {borderBottomColor: colors.border}]}>
            <Pressable onPress={() => setActiveChat(null)}>
              <Text style={[styles.backText, {color: colors.primary}]}>‹ {t(locale, 'home')}</Text>
            </Pressable>
            <Text numberOfLines={1} style={[styles.threadTitle, {color: colors.text}]}>
              {targetTitle}
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.messages}>
            {targetType === 'group' ? (
              <Pressable
                style={[styles.groupInfoBtn, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}
                onPress={() =>
                  navigation.navigate('WatchTogether', {
                    initialGroupId: targetId,
                  })
                }>
                <Text style={[styles.btnText, {color: colors.text}]}>
                  {t(locale, 'socialGroupInfo')}
                </Text>
              </Pressable>
            ) : null}
            {safeItems.map((it, idx) => {
              const mine =
                String(it?.senderId ?? it?.sender?._id ?? '') !== '' &&
                String(it?.senderId ?? it?.sender?._id ?? '') === String(user?._id ?? user?.id ?? '');
              return (
                <View
                  key={`${it?._id ?? idx}`}
                  style={[
                    styles.bubble,
                    {
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      backgroundColor: mine ? colors.primary : colors.surfaceElevated,
                    },
                  ]}>
                  <Text style={{color: mine ? colors.onPrimary : colors.text, fontWeight: '600'}}>
                    {it?.text || ''}
                  </Text>
                </View>
              );
            })}
            {targetType === 'group' && voteSummary ? (
              <View style={[styles.pollCard, {borderColor: colors.border, backgroundColor: colors.surfaceElevated}]}>
                <Text style={[styles.pollTitle, {color: colors.text}]}>Anket sonucu</Text>
                <Text style={[styles.pollWinner, {color: colors.primary}]}>
                  {(voteSummary?.selectedMovie?.movieTitle ||
                    voteSummary?.winner?.movieTitle ||
                    voteSummary?.movieTitle ||
                    '-') + ''}
                </Text>
                {(Array.isArray(voteSummary?.breakdown) ? voteSummary.breakdown : []).map((row, idx) => (
                  <Text key={`b-${idx}`} style={[styles.pollLine, {color: colors.textMuted}]}>
                    {(row?.movieTitle || row?.movieId || '-') + ' - ' + String(row?.votes ?? row?.count ?? 0)}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <View style={[styles.composer, {borderTopColor: colors.border}]}>
            {targetType === 'group' ? (
              <Pressable
                style={[styles.pollBtn, {backgroundColor: colors.surfaceElevated, borderColor: colors.border}]}
                onPress={() => setPollModalVisible(true)}>
                <Text style={[styles.pollBtnText, {color: colors.text}]}>Anket</Text>
              </Pressable>
            ) : null}
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t(locale, 'socialMessagePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.composerInput, {borderColor: colors.border, color: colors.text}]}
            />
            <Pressable style={[styles.sendBtn, {backgroundColor: colors.primary}]} onPress={send}>
              <Text style={[styles.btnText, {color: colors.onPrimary}]}>{t(locale, 'socialSend')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Modal
        visible={pollModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPollModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Anket aç / Oy ver</Text>
            <TextInput
              value={voteMovieTitle}
              onChangeText={setVoteMovieTitle}
              placeholder={t(locale, 'watchTogetherMovieTitlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {borderColor: colors.border, color: colors.text}]}
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, {backgroundColor: colors.surfaceElevated}]}
                onPress={() => setPollModalVisible(false)}>
                <Text style={[styles.btnText, {color: colors.text}]}>Vazgec</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, {backgroundColor: colors.primary}]}
                onPress={() =>
                  castVote(token, targetId, {
                    movieId: buildPollMovieIdFromTitle(voteMovieTitle),
                    movieTitle: voteMovieTitle.trim(),
                  })
                    .then(() => {
                      setMsg(t(locale, 'watchTogetherVoted'));
                      setPollModalVisible(false);
                      setVoteMovieTitle('');
                      return load();
                    })
                    .catch(e => setMsg(e?.message || t(locale, 'error')))
                }>
                <Text style={[styles.btnText, {color: colors.onPrimary}]}>Oy ver</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {msg ? <Text style={[styles.msg, {color: colors.pass, paddingHorizontal: 16}]}>{msg}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: 16, paddingBottom: 30},
  threadWrap: {flex: 1},
  threadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: {fontSize: 14, fontWeight: '700'},
  threadTitle: {fontSize: 18, fontWeight: '800', flex: 1},
  messages: {padding: 12, paddingBottom: 18},
  title: {fontSize: 22, fontWeight: '800'},
  row: {flexDirection: 'row', gap: 8, marginTop: 10},
  bubble: {
    maxWidth: '84%',
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupInfoBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  input: {marginTop: 10, borderWidth: 1, borderRadius: 10, padding: 10},
  btn: {paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10},
  pollBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pollBtnText: {fontWeight: '700'},
  pollCard: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  pollTitle: {fontSize: 13, fontWeight: '800'},
  pollWinner: {marginTop: 4, fontSize: 14, fontWeight: '800'},
  pollLine: {marginTop: 3, fontSize: 12, fontWeight: '600'},
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtn: {paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999},
  btnText: {fontWeight: '800'},
  msg: {marginTop: 10, fontWeight: '700'},
  meta: {marginTop: 8, fontSize: 12, fontWeight: '600'},
  card: {marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {fontSize: 16, fontWeight: '800'},
});
