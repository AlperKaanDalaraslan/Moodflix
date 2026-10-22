import {AUTH_API_BASE} from '../config/authApi';
import {looksLikeOverviewDump, writeHook} from './discoverCopyWriter';

const BANNED_REASON =
  /ortalama boşuna|damarını öne|vektör|güncel tempo|görsel dil olarak|net.? bir seçim|kontrast için|kopya değil|aynı cümleyi|izleme vektörü|sıcaklıkta duruyor|sinyalini birlikte/i;

export function polishPickReasons(picks, ctx) {
  const used = new Set();
  return (picks || []).map((row, i) => {
    let reason = String(row.reason || '').trim();
    const movie = row.movie;
    if (
      !reason ||
      BANNED_REASON.test(reason) ||
      used.has(reason) ||
      looksLikeOverviewDump(movie, reason)
    ) {
      reason = writeHook(movie, ctx, i, used);
    } else {
      used.add(reason);
    }
    return {...row, reason};
  });
}

export async function rankDiscoverWithAi(payload) {
  const res = await fetch(`${AUTH_API_BASE}/api/discover/ai`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || 'DISCOVER_AI_FAILED');
  }
  return data;
}
