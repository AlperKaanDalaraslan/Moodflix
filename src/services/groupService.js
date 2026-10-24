import {AUTH_API_BASE} from '../config/authApi';
import {authHeaders} from './authService';

const GROUPS_PREFIXES = ['/api/groups', '/groups'];

async function parseResponse(res) {
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
      typeof data.message === 'string' && data.message ? data.message : `HTTP ${res.status}`,
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function buildGroupsUrl(prefix, path = '') {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${AUTH_API_BASE}${prefix}${suffix === '/' ? '' : suffix}`;
}

export async function groupRequest(method, path, {token, body} = {}) {
  if (!token) {
    const err = new Error('NO_AUTH_TOKEN');
    err.code = 'NO_AUTH_TOKEN';
    throw err;
  }
  const init = {
    method,
    headers: authHeaders(token),
  };
  if (body != null) {
    init.body = JSON.stringify(body);
  }
  let lastError = null;
  for (let i = 0; i < GROUPS_PREFIXES.length; i += 1) {
    const prefix = GROUPS_PREFIXES[i];
    try {
      const res = await fetch(buildGroupsUrl(prefix, path), init);
      return await parseResponse(res);
    } catch (err) {
      lastError = err;
      const isNotFound = Number(err?.status) === 404;
      const isLast = i === GROUPS_PREFIXES.length - 1;
      if (!isNotFound || isLast) {
        throw err;
      }
    }
  }
  throw lastError ?? new Error('GROUP_REQUEST_FAILED');
}

export function createGroup(token, body) {
  return groupRequest('POST', '', {token, body});
}

export function listMyGroups(token) {
  return groupRequest('GET', '', {token});
}

export function getGroupById(token, groupId) {
  return groupRequest('GET', `/${encodeURIComponent(String(groupId))}`, {token});
}

export function joinGroup(token, groupId) {
  return groupRequest('POST', `/${encodeURIComponent(String(groupId))}/join`, {token});
}

export function castVote(token, groupId, body) {
  return groupRequest('POST', `/${encodeURIComponent(String(groupId))}/votes`, {token, body});
}

export function getGroupResult(token, groupId) {
  return groupRequest('GET', `/${encodeURIComponent(String(groupId))}/result`, {token});
}
