import {NativeModules} from 'react-native';

const SERVICE = 'com.moodflix.auth.jwt';
const USERNAME = 'moodflix_jwt';

/**
 * react-native-keychain, modül bağlı değilken setGenericPassword çağrısında
 * senkron TypeError fırlatıyor. Önce yerel köprüyü kontrol et; yoksa hiç import etme.
 */
function getRnKeychainManager() {
  const m = NativeModules.RNKeychainManager;
  if (!m || typeof m.setGenericPasswordForOptions !== 'function') {
    return null;
  }
  return m;
}

function loadKeychainModule() {
  try {
    return require('react-native-keychain');
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function storeJwt(token) {
  if (!getRnKeychainManager()) {
    if (__DEV__) {
      console.warn(
        '[Moodflix auth] RNKeychainManager yok — token AsyncStorage’da saklanacak. `cd ios && pod install` sonrası Xcode’dan tam rebuild.',
      );
    }
    return false;
  }
  const Keychain = loadKeychainModule();
  if (!Keychain?.setGenericPassword) {
    return false;
  }
  try {
    const ok = await Keychain.setGenericPassword(USERNAME, token, {
      service: SERVICE,
    });
    return ok !== false;
  } catch (e) {
    if (__DEV__) {
      console.warn('[Moodflix auth] Keychain yazılamadı, AsyncStorage kullanılacak.', e?.message ?? e);
    }
    return false;
  }
}

/**
 * @returns {Promise<string|null>}
 */
export async function readJwt() {
  if (!getRnKeychainManager()) {
    return null;
  }
  const Keychain = loadKeychainModule();
  if (!Keychain?.getGenericPassword) {
    return null;
  }
  try {
    const creds = await Keychain.getGenericPassword({service: SERVICE});
    if (!creds || typeof creds.password !== 'string' || !creds.password) {
      return null;
    }
    return creds.password;
  } catch {
    return null;
  }
}

export async function deleteJwt() {
  if (!getRnKeychainManager()) {
    return;
  }
  const Keychain = loadKeychainModule();
  if (!Keychain?.resetGenericPassword) {
    return;
  }
  try {
    await Keychain.resetGenericPassword({service: SERVICE});
  } catch {
    /* ignore */
  }
}
