const JUSTWATCH_URL = 'https://apis.justwatch.com/graphql';
const ICON_BASE = 'https://images.justwatch.com';
const MAX_IN_FLIGHT = 3;

const SEARCH_QUERY = `
  query WatchSearch(
    $country: Country!
    $language: Language!
    $platform: Platform!
    $query: String!
  ) {
    popularTitles(country: $country, first: 20, filter: {searchQuery: $query}) {
      edges {
        node {
          objectType
          content(country: $country, language: $language) {
            title
            originalTitle
            originalReleaseYear
            externalIds { tmdbId }
          }
          offers(country: $country, platform: $platform) {
            monetizationType
            presentationType
            retailPrice(language: $language)
            currency
            standardWebURL
            package { clearName icon }
          }
        }
      }
    }
  }
`;

const cache = new Map();
const inflight = new Map();
let active = 0;
const waiters = [];

function schedule(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      active += 1;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          const next = waiters.shift();
          if (next) {
            next();
          }
        });
    };
    if (active < MAX_IN_FLIGHT) {
      run();
    } else {
      waiters.push(run);
    }
  });
}

export function regionFromLocale(locale) {
  const match = /^[a-z]{2,3}-([A-Za-z]{2})$/i.exec(String(locale || ''));
  return match ? match[1].toUpperCase() : 'TR';
}

function languageFromLocale(locale) {
  const primary = String(locale || 'en')
    .split('-')[0]
    .toLowerCase();
  return /^[a-z]{2}$/.test(primary) ? primary : 'en';
}

export function normalizeTitle(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '');
}

/** "24,99₺", "$3.99", "1.234,56 €" → sayı. Sıralama için. */
export function parsePriceAmount(label) {
  if (!label) {
    return null;
  }
  const match = String(label).replace(/\s/g, '').match(/\d[\d.,]*/);
  if (!match) {
    return null;
  }
  let raw = match[0];
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    raw =
      lastComma > lastDot
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const fraction = raw.length - lastComma - 1;
    raw = fraction === 2 ? raw.replace(',', '.') : raw.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const fraction = raw.length - lastDot - 1;
    if (fraction !== 2) {
      raw = raw.replace(/\./g, '');
    }
  }
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

function kindOf(monetizationType) {
  switch (monetizationType) {
    case 'FREE':
    case 'ADS':
      return 'free';
    case 'FLATRATE':
      return 'included';
    case 'RENT':
      return 'rent';
    case 'BUY':
      return 'buy';
    case 'CINEMA':
      return 'cinema';
    default:
      return null;
  }
}

const QUALITY_RANK = {_4K: 3, HD: 2, SD: 1, CANVAS: 0};
const KIND_RANK = {free: 0, included: 1, rent: 2, buy: 3, cinema: 4};

export function providerIconUrl(icon) {
  if (!icon || typeof icon !== 'string') {
    return null;
  }
  const path = icon.replace('{profile}', 's100').replace('{format}', 'png');
  if (!path.startsWith('/icon/')) {
    return null;
  }
  return `${ICON_BASE}${path}`;
}

function qualityLabel(presentationType) {
  if (presentationType === '_4K') {
    return '4K';
  }
  if (presentationType === 'HD') {
    return 'HD';
  }
  return '';
}

function safeUrl(url) {
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

/**
 * Aynı platform + aynı erişim türünde tek satır.
 * Fiyat farklıysa ucuz olan kalır; fiyat aynıysa daha iyi görüntü kalitesi kalır.
 */
export function collapseOffers(rawOffers) {
  const byKey = new Map();
  for (const raw of rawOffers || []) {
    const kind = kindOf(raw?.monetizationType);
    const name = raw?.package?.clearName;
    if (!kind || !name) {
      continue;
    }
    const priceAmount = parsePriceAmount(raw.retailPrice);
    const next = {
      kind,
      monetizationType: raw.monetizationType,
      name,
      priceLabel: raw.retailPrice || '',
      priceAmount,
      quality: qualityLabel(raw.presentationType),
      qualityRank: QUALITY_RANK[raw.presentationType] || 0,
      url: safeUrl(raw.standardWebURL),
      icon: providerIconUrl(raw.package?.icon),
    };
    const key = `${raw.monetizationType}:${name}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, next);
      continue;
    }
    const nextCheaper =
      next.priceAmount != null &&
      (prev.priceAmount == null || next.priceAmount < prev.priceAmount);
    const samePrice = next.priceAmount === prev.priceAmount;
    if (nextCheaper || (samePrice && next.qualityRank > prev.qualityRank)) {
      byKey.set(key, next);
    }
  }
  return [...byKey.values()]
    .map(row => ({
      ...row,
      id: `${row.monetizationType}:${row.name}:${row.priceLabel}`,
    }))
    .sort((a, b) => {
      const kindDelta = KIND_RANK[a.kind] - KIND_RANK[b.kind];
      if (kindDelta) {
        return kindDelta;
      }
      const aPrice = a.priceAmount == null ? Number.POSITIVE_INFINITY : a.priceAmount;
      const bPrice = b.priceAmount == null ? Number.POSITIVE_INFINITY : b.priceAmount;
      if (aPrice !== bPrice) {
        return aPrice - bPrice;
      }
      return a.name.localeCompare(b.name);
    });
}

function lowestPriced(offers, kind) {
  const rows = offers.filter(row => row.kind === kind);
  const priced = rows.filter(row => row.priceAmount != null);
  const pool = priced.length ? priced : rows;
  if (!pool.length) {
    return null;
  }
  return pool.reduce((best, row) =>
    row.priceAmount != null &&
    (best.priceAmount == null || row.priceAmount < best.priceAmount)
      ? row
      : best,
  );
}

export function summarizeOffers(rawOffers) {
  const offers = collapseOffers(rawOffers);
  return {
    offers,
    lowestRent: lowestPriced(offers, 'rent'),
    lowestBuy: lowestPriced(offers, 'buy'),
  };
}

function sameType(objectType, mediaType) {
  if (mediaType === 'tv') {
    return objectType === 'SHOW';
  }
  return objectType === 'MOVIE';
}

export function pickWatchNode(edges, {id, mediaType, title, originalTitle, year}) {
  const nodes = (edges || []).map(edge => edge?.node).filter(Boolean);
  const idText = String(id ?? '');
  const byTmdb = node => String(node.content?.externalIds?.tmdbId || '') === idText;
  const typed = nodes.filter(node => sameType(node.objectType, mediaType));
  const typedHit = typed.find(byTmdb);
  if (typedHit) {
    return typedHit;
  }
  const anyHit = nodes.find(byTmdb);
  if (anyHit) {
    return anyHit;
  }
  const names = [title, originalTitle].map(normalizeTitle).filter(Boolean);
  const yearNum = Number(year);
  const pool = typed.length ? typed : nodes;
  return (
    pool.find(node => {
      const nodeYear = Number(node.content?.originalReleaseYear);
      if (yearNum && nodeYear && nodeYear !== yearNum) {
        return false;
      }
      const nodeNames = [node.content?.title, node.content?.originalTitle]
        .map(normalizeTitle)
        .filter(Boolean);
      return names.some(name => nodeNames.includes(name));
    }) || null
  );
}

async function postSearch(country, language, query) {
  const response = await fetch(JUSTWATCH_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: {country, language, platform: 'WEB', query},
    }),
  });
  if (!response.ok) {
    throw new Error(`watch_http_${response.status}`);
  }
  return response.json();
}

async function searchOffers(country, locale, query) {
  const preferred = languageFromLocale(locale);
  const languages = preferred === 'en' ? ['en'] : [preferred, 'en'];
  let lastError = null;
  for (const language of languages) {
    const json = await postSearch(country, language, query);
    if (!json?.errors) {
      return json?.data?.popularTitles?.edges || [];
    }
    lastError = new Error('watch_graphql');
    const message = JSON.stringify(json.errors);
    const languageRejected = /language|enum/i.test(message);
    if (!languageRejected) {
      throw lastError;
    }
  }
  throw lastError || new Error('watch_graphql');
}

function queryVariants(title, originalTitle) {
  const variants = [];
  const add = value => {
    const text = String(value || '').trim();
    if (text.length < 2) {
      return;
    }
    if (variants.some(existing => normalizeTitle(existing) === normalizeTitle(text))) {
      return;
    }
    variants.push(text);
  };
  add(originalTitle);
  add(title);
  return variants.slice(0, 2);
}

async function loadWatchOffers(input, country) {
  const year = String(input.releaseDate || '').slice(0, 4);
  const needle = {
    id: input.id,
    mediaType: input.mediaType === 'tv' ? 'tv' : 'movie',
    title: input.title,
    originalTitle: input.originalTitle,
    year,
  };
  for (const query of queryVariants(input.title, input.originalTitle)) {
    const edges = await schedule(() => searchOffers(country, input.locale, query));
    const node = pickWatchNode(edges, needle);
    if (node) {
      return summarizeOffers(node.offers);
    }
  }
  return summarizeOffers([]);
}

export function fetchWatchOffers(input) {
  const country = regionFromLocale(input?.locale);
  const mediaType = input?.mediaType === 'tv' ? 'tv' : 'movie';
  const key = `${country}:${mediaType}:${input?.id}`;
  if (input?.id == null) {
    return Promise.resolve(summarizeOffers([]));
  }
  if (!input?.fresh && cache.has(key)) {
    return Promise.resolve(cache.get(key));
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }
  const job = loadWatchOffers({...input, mediaType}, country)
    .then(summary => {
      const searched = queryVariants(input.title, input.originalTitle).length > 0;
      if (searched || summary.offers.length) {
        cache.set(key, summary);
      }
      return summary;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, job);
  return job;
}
