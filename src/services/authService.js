import AsyncStorage from '@react-native-async-storage/async-storage';
import {AUTH_API_BASE, AUTH_PATH_PREFIX, buildAuthUrl} from '../config/authApi';
import * as jwtKeychain from '../utils/jwtKeychain';

const STORAGE_TOKEN_LEGACY = '@moodflix/auth_token';
const STORAGE_USER = '@moodflix/auth_user';

export const AUTH_ERROR_HTML = 'AUTH_ERROR_HTML';

const LOG = '[Moodflix auth]';
const BODY_PREVIEW_MAX = 4000;

function looksLikeHtmlResponse(text) {
  const s = String(text ?? '').trim();
  return /^<!DOCTYPE/i.test(s) || /^<html/i.test(s);
}

/** Konsolda şifre / JWT görünmesin. */
function redactForLog(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const o = {...obj};
  if ('password' in o) {
    o.password = '***';
  }
  if (typeof o.token === 'string' && o.token) {
    o.token = `[jwt len=${o.token.length}]`;
  }
  return o;
}

function authConsole(phase, detail) {
  console.log(LOG, phase, detail);
}

async function postAuth(path, body) {
  const url = buildAuthUrl(path);
  const payloadJson = JSON.stringify(body);

  authConsole('→ istek', {
    base: AUTH_API_BASE,
    pathPrefix: AUTH_PATH_PREFIX,
    path,
    url,
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: redactForLog(body),
    bodyRawLength: payloadJson.length,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: payloadJson,
  });

  const text = await res.text();
  const preview =
    text.length > BODY_PREVIEW_MAX
      ? `${text.slice(0, BODY_PREVIEW_MAX)}… (+${text.length - BODY_PREVIEW_MAX} byte)`
      : text;

  authConsole('← yanıt meta', {
    url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    contentType: res.headers?.get?.('content-type') ?? null,
    bodyLength: text.length,
  });
  authConsole('← yanıt gövdesi (ham metin)', preview || '(boş)');

  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
      authConsole('← yanıt (JSON)', redactForLog(data));
    } catch {
      if (!res.ok && looksLikeHtmlResponse(text)) {
        authConsole('← parse: HTML / JSON değil', {hint: 'Sunucuda route veya base URL kontrol et.'});
        const err = new Error(AUTH_ERROR_HTML);
        err.code = 'AUTH_ERROR_HTML';
        err.status = res.status;
        throw err;
      }
      if (!res.ok) {
        const err = new Error(text.trim().slice(0, 200) || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const err = new Error('INVALID_AUTH_RESPONSE');
      throw err;
    }
  }
  if (!res.ok) {
    authConsole('← hata (JSON message)', data);
    const err = new Error(
      typeof data.message === 'string' && data.message
        ? data.message
        : `HTTP ${res.status}`,
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  authConsole('✓ başarılı', {url, user: data.user ? redactForLog({user: data.user}) : undefined});
  return data;
}

export async function register(body) {
  return postAuth('/register', body);
}

export async function login(body) {
  return postAuth('/login', body);
}

export async function persistSession({token, user}) {
  const userJson = JSON.stringify(user);
  const usedKeychain = await jwtKeychain.storeJwt(token);
  if (usedKeychain) {
    await AsyncStorage.removeItem(STORAGE_TOKEN_LEGACY);
  } else {
    await AsyncStorage.setItem(STORAGE_TOKEN_LEGACY, token);
  }
  await AsyncStorage.setItem(STORAGE_USER, userJson);
}

export async function clearSession() {
  authConsole('oturum sil', {});
  await jwtKeychain.deleteJwt();
  await AsyncStorage.removeItem(STORAGE_TOKEN_LEGACY);
  await AsyncStorage.removeItem(STORAGE_USER);
}

async function loadTokenWithMigration() {
  const fromKeychain = await jwtKeychain.readJwt();
  if (fromKeychain) {
    return fromKeychain;
  }
  return AsyncStorage.getItem(STORAGE_TOKEN_LEGACY);
}

export async function loadStoredSession() {
  const [token, userJson] = await Promise.all([
    loadTokenWithMigration(),
    AsyncStorage.getItem(STORAGE_USER),
  ]);
  let user = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      user = null;
    }
  }
  return {token: token || null, user};
}

export function authHeaders(token) {
  const h = {'Content-Type': 'application/json'};
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

export async function getStoredToken() {
  const {token} = await loadStoredSession();
  return token;
}

/**
 * GET /api/auth/health — backend ayakta mı (JSON veya düz metin).
 */
export async function getAuthHealth() {
  const url = buildAuthUrl('/health');
  const res = await fetch(url, {method: 'GET'});
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {raw: text.trim().slice(0, 200)};
    }
  }
  return {ok: res.ok, status: res.status, data};
}
