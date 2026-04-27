import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, {useCallback, useLayoutEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {AUTH_ERROR_HTML} from '../services/authService';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';

const PAD = 16;

/** Sunucu şeması ile uyumlu: 2–32, yalnızca a-z, 0-9, ., _ */
const USERNAME_RE = /^[a-z0-9._]{2,32}$/;

export function LoginRegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {locale, theme} = useSettings();
  const {login, register} = useAuth();

  const [mode, setMode] = useState(() =>
    route.params?.mode === 'register' ? 'register' : 'login',
  );
  const [loginId, setLoginId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const colors = getTheme(theme);

  useFocusEffect(
    useCallback(() => {
      const m = route.params?.mode;
      if (m === 'register' || m === 'login') {
        setMode(m);
      }
    }, [route.params?.mode]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        mode === 'login'
          ? t(locale, 'loginRegisterTitleLogin')
          : t(locale, 'loginRegisterTitleRegister'),
    });
  }, [navigation, locale, mode]);

  const onToggleMode = useCallback(() => {
    if (mode === 'register') {
      const em = email.trim();
      if (em) {
        setLoginId(em);
      }
      setMode('login');
      return;
    }
    setLoginId('');
    setMode('register');
  }, [mode, email]);

  const onSubmit = useCallback(async () => {
    const em = email.trim();
    const rawUser = username.trim().toLowerCase();
    const pw = password;
    if (mode === 'register') {
      const u = rawUser;
      if (!u || !em || !pw) {
        Alert.alert(t(locale, 'error'), t(locale, 'authFillAll'));
        return;
      }
      if (!USERNAME_RE.test(u)) {
        Alert.alert(t(locale, 'error'), t(locale, 'authUsernameInvalid'));
        return;
      }
    } else {
      const id = loginId.trim();
      if (!pw) {
        Alert.alert(t(locale, 'error'), t(locale, 'authFillAll'));
        return;
      }
      if (!id) {
        Alert.alert(t(locale, 'error'), t(locale, 'authLoginNeedIdentifier'));
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const id = loginId.trim();
        const body = {password: pw};
        if (id.includes('@')) {
          body.email = id.toLowerCase();
        } else {
          body.username = id.toLowerCase();
        }
        await login(body);
        if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
          navigation.dispatch(CommonActions.goBack());
        } else if (typeof navigation.goBack === 'function') {
          navigation.goBack();
        } else {
          navigation.navigate('Profile');
        }
      } else {
        await register({username: rawUser, email: em, password: pw});
        Alert.alert(t(locale, 'authRegisterDoneTitle'), t(locale, 'authSuccessRegister'), [
          {
            text: t(locale, 'authLoginCta'),
            onPress: () => {
              setMode('login');
              setUsername('');
              if (em) {
                setLoginId(em);
              }
            },
          },
        ]);
      }
    } catch (e) {
      let msg = t(locale, 'error');
      if (e && typeof e.message === 'string' && e.message !== 'INVALID_AUTH_RESPONSE') {
        if (e.message === AUTH_ERROR_HTML || e.code === 'AUTH_ERROR_HTML') {
          msg = t(locale, 'authServerHtmlError');
        } else {
          msg = e.message;
        }
      }
      Alert.alert(t(locale, 'error'), msg);
    } finally {
      setBusy(false);
    }
  }, [mode, loginId, username, email, password, login, register, navigation, locale]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {mode === 'register' ? (
            <View style={styles.field}>
              <Text style={[styles.label, {color: colors.textMuted}]}>
                {t(locale, 'authUsername')}
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                placeholder={t(locale, 'authUsername')}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
              />
              <Text style={[styles.fieldHint, {color: colors.textMuted}]}>
                {t(locale, 'authUsernameHint')}
              </Text>
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={[styles.label, {color: colors.textMuted}]}>
                {t(locale, 'authLoginIdLabel')}
              </Text>
              <TextInput
                value={loginId}
                onChangeText={setLoginId}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                keyboardType="default"
                placeholder={t(locale, 'authLoginIdLabel')}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
              />
              <Text style={[styles.fieldHint, {color: colors.textMuted}]}>
                {t(locale, 'authLoginIdentifierHint')}
              </Text>
            </View>
          )}

          {mode === 'register' ? (
            <View style={styles.field}>
              <Text style={[styles.label, {color: colors.textMuted}]}>{t(locale, 'authEmail')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                placeholder={t(locale, 'authEmail')}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, {color: colors.textMuted}]}>
              {t(locale, 'authPassword')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t(locale, 'authPassword')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                },
              ]}
            />
          </View>

          <TouchableOpacity
            onPress={onSubmit}
            disabled={busy}
            style={[
              styles.primaryBtn,
              {backgroundColor: colors.primary, opacity: busy ? 0.65 : 1},
            ]}>
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.primaryBtnText, {color: colors.onPrimary}]}>
                {mode === 'login'
                  ? t(locale, 'authSubmitLogin')
                  : t(locale, 'authSubmitRegister')}
              </Text>
            )}
          </TouchableOpacity>

          <Pressable onPress={onToggleMode} style={styles.switchRow} hitSlop={12}>
            <Text style={[styles.switchText, {color: colors.primary}]}>
              {mode === 'login' ? t(locale, 'authNoAccount') : t(locale, 'authHaveAccount')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  scroll: {padding: PAD, paddingBottom: 32, gap: 14},
  field: {gap: 6},
  label: {fontSize: 13, fontWeight: '700'},
  fieldHint: {fontSize: 12, lineHeight: 17, fontWeight: '500', marginTop: 2},
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: {fontSize: 16, fontWeight: '800'},
  switchRow: {alignItems: 'center', paddingVertical: 16},
  switchText: {fontSize: 15, fontWeight: '700'},
});
