/**
 * Elle bakım: `strings.en.js`, `strings.tr.js`, `strings.de.js`, `strings.fr.js`.
 * Diğer TMDB dil paketleri: her metin ayrı çevrilir (Lingva toplu çeviride ayırıcıyı bozuyordu).
 * Sıra: Lingva → MyMemory; ikisi de düşerse İngilizce kalır.
 *
 * Çalıştır: npm run i18n:build
 */
import {existsSync, readFileSync, writeFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const {default: en} = await import(join(root, 'src/i18n/strings.en.js'));
const {default: trHand} = await import(join(root, 'src/i18n/strings.tr.js'));
const {default: deHand} = await import(join(root, 'src/i18n/strings.de.js'));
const {default: frHand} = await import(join(root, 'src/i18n/strings.fr.js'));
const {TMDB_CONTENT_LOCALES} = await import(
  join(root, 'src/i18n/contentLocales.js'),
);
const {contentLocaleToUiPackId} = await import(
  join(root, 'src/i18n/contentLocaleToUiPack.js'),
);

const UI_KEYS = Object.keys(en);

/** Aynı anda en fazla kaç metin isteği (Lingva hız sınırı) */
const CONCURRENCY = 5;
const BETWEEN_BATCH_MS = 160;

/** MyMemory `langpair` hedef kodu. */
const MYMEMORY_TO = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  nb: 'no',
};

/** Lingva `/en/{target}/…` hedef kodu (örnek: `he` → `iw`). */
const LINGVA_TARGET = {
  'zh-Hans': 'zh',
  'zh-Hant': 'zh',
  nb: 'no',
  he: 'iw',
};

const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud',
];

const packIds = [
  ...new Set(
    TMDB_CONTENT_LOCALES.map(({code}) => contentLocaleToUiPackId(code)),
  ),
].sort();

function assertKeys(obj, label) {
  for (const k of UI_KEYS) {
    if (obj[k] === undefined) {
      throw new Error(`${label}: missing key "${k}"`);
    }
  }
}

assertKeys(en, 'en');
assertKeys(trHand, 'tr');
assertKeys(deHand, 'de');
assertKeys(frHand, 'fr');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function lingvaTranslateString(text, packId) {
  const target = LINGVA_TARGET[packId] ?? packId;
  const encoded = encodeURIComponent(text);
  let lastErr;
  for (const base of LINGVA_INSTANCES) {
    const url = `${base}/api/v1/en/${target}/${encoded}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`Lingva HTTP ${res.status}`);
        continue;
      }
      const j = await res.json();
      if (typeof j.translation === 'string' && j.translation.length > 0) {
        return j.translation;
      }
      lastErr = new Error('Lingva empty translation');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Lingva failed');
}

async function mymemoryTranslateString(text, packId) {
  const target = MYMEMORY_TO[packId] ?? packId;
  const langpair = `en|${target}`;
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', langpair);
  const res = await fetch(url);
  const j = await res.json();
  if (j.responseStatus !== 200) {
    throw new Error(j.responseDetails || `HTTP ${j.responseStatus}`);
  }
  return j.responseData.translatedText;
}

async function translateValue(text, packId) {
  const s = String(text ?? '');
  if (s === '' || s === 'Moodflix') {
    return s;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await lingvaTranslateString(s, packId);
      if (typeof r === 'string' && r.length > 0) {
        return r;
      }
    } catch {
      await sleep(280 * attempt);
    }
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await mymemoryTranslateString(s, packId);
      if (typeof r === 'string' && r.length > 0) {
        return r;
      }
    } catch {
      await sleep(400 * attempt);
    }
  }

  return s;
}

async function buildPack(packId) {
  const out = {};
  for (let i = 0; i < UI_KEYS.length; i += CONCURRENCY) {
    const batch = UI_KEYS.slice(i, i + CONCURRENCY);
    const pairs = await Promise.all(
      batch.map(async k => {
        const v = await translateValue(en[k], packId);
        return [k, v];
      }),
    );
    for (const [k, v] of pairs) {
      out[k] = v;
    }
    await sleep(BETWEEN_BATCH_MS);
  }
  assertKeys(out, packId);
  return out;
}

const dest = join(root, 'src/i18n/uiPacks.generated.json');
let previousPacks = null;
if (existsSync(dest)) {
  try {
    previousPacks = JSON.parse(readFileSync(dest, 'utf8'));
  } catch {
    /* ignore */
  }
}

/** Önceki çalıştırmadan kalan paketler (yeni dil kodları için birleştirme). */
const out = {...(previousPacks ?? {})};
out.en = {...en};
out.tr = {...trHand};
out.de = {...deHand};
out.fr = {...frHand};

const autoIds = packIds.filter(
  id => id !== 'en' && id !== 'tr' && id !== 'de' && id !== 'fr',
);

const allowedPackIds = new Set(packIds);

function canReuseTranslatedPack(id) {
  const p = out[id];
  if (!p || typeof p !== 'object') {
    return false;
  }
  try {
    assertKeys(p, `reuse-${id}`);
  } catch {
    return false;
  }
  return p.whatToday !== en.whatToday || p.discover !== en.discover;
}

function writePacksPartial() {
  const trimmed = {};
  for (const k of Object.keys(out)) {
    if (allowedPackIds.has(k)) {
      trimmed[k] = out[k];
    }
  }
  writeFileSync(dest, JSON.stringify(trimmed, null, 2), 'utf8');
}

const keyCount = UI_KEYS.length;
for (const id of autoIds) {
  if (canReuseTranslatedPack(id)) {
    console.log(`i18n: ${id} (${keyCount} keys)… reuse`);
    continue;
  }
  process.stdout.write(`i18n: ${id} (${keyCount} keys)… `);
  try {
    out[id] = await buildPack(id);
    console.log('ok');
  } catch (e) {
    console.log('FAIL', e.message ?? e);
    out[id] = {...en};
  }
  writePacksPartial();
}

for (const k of Object.keys(out)) {
  if (!allowedPackIds.has(k)) {
    delete out[k];
  }
}

writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote', dest);
