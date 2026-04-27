import {AUTH_API_BASE, PROFILE_PATH_PREFIX, buildProfileUrl} from '../config/authApi';
import {authHeaders} from './authService';

const LOG = '[Moodflix profile]';

function profileConsole(phase, detail) {
  if (__DEV__) {
    console.log(LOG, phase, detail);
  }
}

/**
 * @param {Response} res
 */
async function parseProfileResponse(res) {
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const err = new Error(text.trim().slice(0, 200) || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
  }
  if (!res.ok) {
    const err = new Error(
      typeof data.message === 'string' && data.message
        ? data.message
        : `HTTP ${res.status}`,
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/**
 * @param {string} method
 * @param {string} path örn. '/me', '/me/favorites/movies/42'
 * @param {{ token: string, body?: object }} opts
 */
export async function profileRequest(method, path, {token, body} = {}) {
  if (!token) {
    const err = new Error('NO_AUTH_TOKEN');
    err.code = 'NO_AUTH_TOKEN';
    throw err;
  }
  const url = buildProfileUrl(path);
  /** @type {RequestInit} */
  const init = {
    method,
    headers: authHeaders(token),
  };
  if (body !== undefined && body !== null) {
    init.body = JSON.stringify(body);
  }
  profileConsole('→', {method, url, hasBody: body != null});
  const res = await fetch(url, init);
  const data = await parseProfileResponse(res);
  profileConsole('←', {url, status: res.status, ok: res.ok});
  return data;
}

export function getMe(token) {
  return profileRequest('GET', '/me', {token});
}

export function patchMe(token, body) {
  return profileRequest('PATCH', '/me', {token, body});
}

export function getInsights(token) {
  return profileRequest('GET', '/me/insights', {token});
}

export function getFeed(token) {
  return profileRequest('GET', '/me/feed', {token});
}

export function addFavoriteMovie(token, body) {
  return profileRequest('POST', '/me/favorites/movies', {token, body});
}

export function removeFavoriteMovie(token, movieId) {
  const id = encodeURIComponent(String(movieId));
  return profileRequest('DELETE', `/me/favorites/movies/${id}`, {token});
}

export function addLikedMovie(token, body) {
  return profileRequest('POST', '/me/liked-movies', {token, body});
}

export function removeLikedMovie(token, movieId) {
  const id = encodeURIComponent(String(movieId));
  return profileRequest('DELETE', `/me/liked-movies/${id}`, {token});
}

export function addWatchedMovie(token, body) {
  return profileRequest('POST', '/me/watched-movies', {token, body});
}

export function removeWatchedMovie(token, movieId) {
  const id = encodeURIComponent(String(movieId));
  return profileRequest('DELETE', `/me/watched-movies/${id}`, {token});
}

export function postMood(token, body) {
  return profileRequest('POST', '/me/mood', {token, body});
}

export function postSearch(token, body) {
  return profileRequest('POST', '/me/search', {token, body});
}

export function profileApiMeta() {
  return {
    baseUrl: AUTH_API_BASE,
    profilePrefix: PROFILE_PATH_PREFIX,
  };
}
