const STOP = new Set([
  'bir',
  'bu',
  'su',
  'ile',
  'icin',
  'gibi',
  'cok',
  'ama',
  'veya',
  'the',
  'and',
  'for',
  'that',
  'with',
  'gunu',
  'diye',
  'kadar',
  'sonra',
  'once',
  'bana',
  'sana',
  'beni',
]);

const THEMES = [
  {
    id: 'winter',
    cues: ['kar', 'karli', 'kis', 'snow', 'winter', 'noel', 'yilbasi', 'christmas', 'buz', 'ice', 'blizzard', 'frost', 'kayak'],
    match: ['kar', 'kis', 'snow', 'winter', 'noel', 'christmas', 'yilbasi', 'blizzard', 'somine', 'buz', 'ice', 'frost', 'kayak', 'alpine'],
    keywords: ['snow', 'winter', 'christmas', 'snowstorm'],
  },
  {
    id: 'rain',
    cues: ['yagmur', 'yagmurlu', 'rain', 'storm', 'firtina', 'saganak'],
    match: ['yagmur', 'rain', 'storm', 'firtina', 'saganak', 'thunder'],
    keywords: ['rain', 'rainstorm', 'thunderstorm'],
  },
  {
    id: 'summer',
    cues: ['yaz', 'summer', 'plaj', 'beach', 'tatil', 'gunes', 'sahil', 'palmiye', 'tropik', 'ferah', 'kumsal'],
    match: ['yaz', 'summer', 'plaj', 'beach', 'tatil', 'gunes', 'seaside', 'sahil', 'palmiye', 'kumsal'],
    keywords: ['summer', 'beach', 'vacation'],
    genres: [12, 35, 10749],
    tvGenres: [10759, 35],
  },
  {
    id: 'sea',
    cues: ['deniz', 'okyanus', 'ocean', 'gemi', 'ada', 'island', 'sail'],
    match: ['deniz', 'okyanus', 'ocean', 'gemi', 'ada', 'island', 'sail', 'ship'],
    keywords: ['ocean', 'island', 'ship'],
  },
  {
    id: 'love',
    cues: ['ask', 'romantik', 'sevgili', 'love', 'romantic', 'heartbreak'],
    match: ['ask', 'romantik', 'sevgili', 'love', 'romantic', 'heart'],
    keywords: ['love', 'romance', 'relationship'],
  },
  {
    id: 'fear',
    cues: ['korku', 'korkunc', 'gerilim', 'horror', 'scary', 'thriller'],
    match: ['korku', 'korkunc', 'gerilim', 'horror', 'ghost', 'haunt'],
    keywords: ['horror', 'ghost', 'haunted house'],
  },
  {
    id: 'lonely',
    cues: ['yalniz', 'lonely', 'tekbasina', 'isolation', 'izole'],
    match: ['yalniz', 'lonely', 'isolation', 'solitude', 'izole'],
    keywords: ['loneliness', 'isolation', 'solitude'],
  },
  {
    id: 'space',
    cues: ['uzay', 'astronot', 'space', 'galaxy', 'gezegen', 'moon'],
    match: ['uzay', 'astronot', 'space', 'galaxy', 'gezegen', 'planet', 'moon'],
    keywords: ['space', 'astronaut', 'outer space'],
  },
  {
    id: 'war',
    cues: ['savas', 'war', 'cephe', 'soldier', 'asker'],
    match: ['savas', 'war', 'cephe', 'soldier', 'asker', 'battle'],
    keywords: ['war', 'soldier', 'world war'],
  },
  {
    id: 'school',
    cues: ['okul', 'universite', 'school', 'campus', 'lise'],
    match: ['okul', 'universite', 'school', 'campus', 'lise', 'student'],
    keywords: ['high school', 'college', 'student'],
  },
  {
    id: 'family',
    cues: ['aile', 'family', 'anne', 'baba', 'kardes'],
    match: ['aile', 'family', 'anne', 'baba', 'mother', 'father'],
    keywords: ['family', 'mother', 'father'],
  },
  {
    id: 'night',
    cues: ['gece', 'night', 'uykusuz', 'insomnia', 'geceyarisi'],
    match: ['gece', 'night', 'uykusuz', 'insomnia', 'midnight'],
    keywords: ['night', 'insomnia', 'midnight'],
  },
  {
    id: 'city',
    cues: ['sehir', 'city', 'istanbul', 'metropol', 'sokak'],
    match: ['sehir', 'city', 'istanbul', 'metropol', 'sokak', 'street'],
    keywords: ['city', 'new york', 'street'],
  },
  {
    id: 'forest',
    cues: ['orman', 'forest', 'agac', 'woods', 'doga'],
    match: ['orman', 'forest', 'woods', 'wilderness', 'doga'],
    keywords: ['forest', 'woods', 'wilderness'],
  },
  {
    id: 'road',
    cues: ['yolculuk', 'seyahat', 'roadtrip', 'travel', 'otoyol'],
    match: ['yolculuk', 'seyahat', 'road', 'travel', 'otoyol', 'journey'],
    keywords: ['road trip', 'journey', 'travel'],
    genres: [12, 18],
    tvGenres: [10759, 18],
  },
  {
    id: 'cheerful',
    cues: ['neseli', 'nese', 'isitacak', 'isiticak', 'sicacik', 'sicak', 'komik', 'komedi', 'mutlu', 'kahkaha', 'keyifli', 'eglenceli', 'guldu', 'heartwarm'],
    match: ['neseli', 'komedi', 'komik', 'mutlu', 'sicak', 'aile'],
    keywords: ['heartwarming', 'feel-good', 'uplifting'],
    genres: [35, 10751, 10749],
    tvGenres: [35, 10762],
  },
  {
    id: 'twist',
    cues: ['beyin', 'twist', 'zihin', 'bulmaca', 'sasirt', 'akil', 'kafa', 'kose'],
    match: ['gizem', 'gerilim', 'twist', 'surpriz', 'bulmaca'],
    keywords: ['plot twist', 'mind-bending', 'surprise ending'],
    genres: [9648, 53, 878],
    tvGenres: [9648, 80, 10765],
  },
];

export function foldBrief(input) {
  return String(input ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[çÇ]/g, 'c')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandToken(token) {
  const out = [token];
  if (token.length >= 5 && /l[iu]$/.test(token)) {
    out.push(token.slice(0, -2));
  }
  return out.filter(part => part.length >= 3 && !STOP.has(part));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cueHitsToken(token, cue) {
  if (token === cue) {
    return true;
  }
  return cue.length >= 3 && token.startsWith(cue) && token.length <= cue.length + 3;
}

const SETTING_THEMES = new Set([
  'winter',
  'rain',
  'summer',
  'sea',
  'space',
  'war',
  'forest',
  'school',
  'city',
  'road',
  'cheerful',
  'twist',
]);

export function readBrief(prompt) {
  const folded = foldBrief(prompt);
  const rawTokens = folded.split(' ').filter(word => word.length >= 3 && !STOP.has(word));
  const tokens = unique(rawTokens.flatMap(expandToken));
  const themes = THEMES.filter(theme =>
    theme.cues.some(cue => tokens.some(token => cueHitsToken(token, foldBrief(cue)))),
  );
  const setting = themes
    .filter(theme => SETTING_THEMES.has(theme.id))
    .filter(theme => theme.id !== 'night' || !themes.some(item => item.id === 'summer'));
  const lead = setting.length ? setting : themes;
  const matchTerms = unique([
    ...lead.flatMap(theme => theme.match),
    ...tokens,
  ]);
  const primaryTerms = unique(lead.flatMap(theme => theme.match));
  const keywordQueries = unique([
    ...lead.flatMap(theme => theme.keywords || []),
    ...(lead.length ? [] : tokens.filter(token => token.length >= 4)),
  ]).slice(0, 4);
  const genres = unique(lead.flatMap(theme => theme.genres || []));
  const tvGenres = unique(lead.flatMap(theme => theme.tvGenres || theme.genres || []));
  return {
    active: folded.length >= 4 && (themes.length > 0 || tokens.length > 0),
    themes: lead.map(theme => theme.id),
    matchTerms,
    primaryTerms,
    keywordQueries,
    genres,
    tvGenres,
    tokens,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function textHasTerm(text, term) {
  const folded = foldBrief(text);
  const needle = foldBrief(term);
  if (needle.length < 3 || !folded) {
    return false;
  }
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`);
  return pattern.test(folded);
}

export function scoreBrief(movie, brief) {
  if (!brief?.active) {
    return {score: 0, hits: []};
  }
  const text = `${movie?.title || ''} ${movie?.name || ''} ${movie?.overview || ''}`;
  const hits = [];
  let score = 0;
  for (const term of brief.matchTerms || []) {
    if (textHasTerm(text, term)) {
      score += foldBrief(term).length >= 5 ? 2 : 1;
      hits.push(foldBrief(term));
    }
  }
  const primaryList = brief.primaryTerms?.length ? brief.primaryTerms : null;
  if (primaryList) {
    const primary = new Set(primaryList.map(foldBrief));
    const primaryHit = hits.some(hit => primary.has(hit));
    if (!primaryHit && !movie?._fromBriefKeyword && !movie?._fromBriefGenre && !movie?._fromBriefSearch) {
      return {score: 0, hits: []};
    }
  }
  if (movie?._fromBriefKeyword) {
    score += 3;
  }
  if (movie?._fromBriefGenre) {
    score += 2;
  }
  if (movie?._fromBriefSearch) {
    score += 1;
  }
  return {score, hits};
}

const MOVIE_GENRE_IDS = new Set([
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37,
]);
const TV_GENRE_IDS = new Set([
  10759, 16, 35, 80, 99, 18, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768,
]);

export function applyInterpretPlan(brief, plan) {
  if (!plan || !brief) {
    return brief;
  }
  const genres = unique([...(brief.genres || []), ...(plan.genres || [])])
    .map(Number)
    .filter(id => MOVIE_GENRE_IDS.has(id))
    .slice(0, 4);
  const tvGenres = unique([...(brief.tvGenres || []), ...(plan.tvGenres || [])])
    .map(Number)
    .filter(id => TV_GENRE_IDS.has(id))
    .slice(0, 4);
  const keywordQueries = unique([
    ...(brief.keywordQueries || []),
    ...(plan.keywords || []).map(item => String(item || '').trim()),
  ])
    .filter(item => item.length >= 3)
    .slice(0, 4);
  return {
    ...brief,
    active: Boolean(brief.active || genres.length || keywordQueries.length),
    genres,
    tvGenres,
    keywordQueries,
  };
}
