import {AUTH_API_BASE} from '../config/authApi';
import {looksLikeOverviewDump, writeHook} from './discoverCopyWriter';

const BANNED_REASON =
  /ortalama boşuna|damarını öne|vektör|güncel tempo|görsel dil olarak|net.? bir seçim|kontrast için|kopya değil|aynı cümleyi|izleme vektörü|sıcaklıkta duruyor|sinyalini birlikte|bu geceye bir yön arıyorsun|tam o hale giriyor|yazdıysan|senin geceni|bu geceye oturuyor|süs diye listede|diye geçme/i;

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

export async function readDiscoverPhoto(imageBase64, locale) {
  const image = String(imageBase64 || '').replace(/\s/g, '');
  if (image.length < 80) {
    return null;
  }
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/discover/photo`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({
        image: image.slice(0, 2500000),
        locale: locale || 'tr-TR',
      }),
    });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : null;
    const plan = data?.plan && typeof data.plan === 'object' ? data.plan : null;
    const sentence = String(data?.sentence || plan?.sentence || '').trim();
    const keywords = Array.isArray(plan?.keywords) ? plan.keywords : [];
    const genres = Array.isArray(plan?.genres) ? plan.genres : [];
    const tvGenres = Array.isArray(plan?.tvGenres) ? plan.tvGenres : [];
    if (!res.ok || !data?.ok || (!sentence && !keywords.length && !genres.length)) {
      return null;
    }
    return {
      sentence: sentence.slice(0, 180),
      keywords,
      genres,
      tvGenres,
    };
  } catch {
    return null;
  }
}

export async function interpretDiscoverPrompt(prompt) {
  const text = String(prompt || '').trim();
  if (text.length < 2) {
    return null;
  }
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/discover/interpret`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({prompt: text.slice(0, 280)}),
    });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!res.ok || !data?.ok) {
      return null;
    }
    return data.plan || null;
  } catch {
    return null;
  }
}
