import {AUTH_API_BASE} from '../config/authApi';
import {authHeaders} from './authService';

async function parseJson(res) {
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
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function toQueryString(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    params.append(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

async function authedRequest(method, path, token, body) {
  if (!token) {
    throw new Error('NO_AUTH_TOKEN');
  }
  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    method,
    headers: authHeaders(token),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return parseJson(res);
}

export const searchUsers = (token, q, limit) =>
  authedRequest(
    'GET',
    `/api/social/users/search${toQueryString({q, limit})}`,
    token,
  );

export const sendFriendRequest = (token, toUserId) =>
  authedRequest('POST', '/api/social/friends/requests', token, {toUserId});

export const acceptFriendRequest = (token, userId) =>
  authedRequest(
    'POST',
    `/api/social/friends/requests/${encodeURIComponent(String(userId))}/accept`,
    token,
  );

export const getFriends = token => authedRequest('GET', '/api/social/friends', token);

export const getFeed = (token, limit, includeSelf) =>
  authedRequest(
    'GET',
    `/api/social/feed${toQueryString({limit, includeSelf})}`,
    token,
  );

export const getFriendProfile = (token, userId) =>
  authedRequest(
    'GET',
    `/api/social/friends/${encodeURIComponent(String(userId))}/profile`,
    token,
  );

// Legacy chat and group endpoints kept for compatibility.
export const getPrivateChat = (token, userId) =>
  authedRequest('GET', `/api/chat/private/${encodeURIComponent(String(userId))}`, token);
export const listMyChats = token => authedRequest('GET', '/api/chat', token);
export const sendPrivateMessage = (token, userId, text) =>
  authedRequest('POST', `/api/chat/private/${encodeURIComponent(String(userId))}`, token, {text});
export const getGroupChat = (token, groupId) =>
  authedRequest('GET', `/api/chat/groups/${encodeURIComponent(String(groupId))}`, token);
export const sendGroupMessage = (token, groupId, text) =>
  authedRequest('POST', `/api/chat/groups/${encodeURIComponent(String(groupId))}`, token, {text});
export const addGroupMember = (token, groupId, userId) =>
  authedRequest('POST', `/api/groups/${encodeURIComponent(String(groupId))}/members`, token, {userId});
export const leaveGroup = (token, groupId) =>
  authedRequest('POST', `/api/groups/${encodeURIComponent(String(groupId))}/leave`, token);
