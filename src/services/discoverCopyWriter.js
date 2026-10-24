const MOOD_TR = {
  happy: 'hafiflemek istiyorsun',
  chill: 'sakin bir gece istiyorsun',
  romantic: 'birine yakın hissetmek istiyorsun',
  sad: 'için ağır, biraz kırık',
  hyped: 'nabzın yüksek',
  scared: 'biraz ürpermek istiyorsun',
  cozy: 'eve çekilmek istiyorsun',
  thoughtful: 'kafan dolu',
  adventurous: 'kaçacak bir yol arıyorsun',
  fantasy: 'bu dünyadan çıkmak istiyorsun',
  crime: 'karanlık tarafa bakmak istiyorsun',
  curious: 'bir sır istiyorsun',
  nostalgic: 'eski bir hisse dönmek istiyorsun',
  melancholic: 'hüzünle oturmak istiyorsun',
  playful: 'ciddiyeti bırakmak istiyorsun',
  heroic: 'birinin peşinden gitmek istiyorsun',
  inspired: 'bir kıvılcım arıyorsun',
  angry: 'içindeki öfkeye yer arıyorsun',
  weird: 'tuhaf bir gece istiyorsun',
  dark: 'karanlıkta kalmak istiyorsun',
};

const MOOD_EN = {
  happy: 'you want the night lighter',
  chill: 'you want a quiet night',
  romantic: 'you want to feel close',
  sad: 'you’re a little broken tonight',
  hyped: 'your pulse is up',
  scared: 'you want a shiver',
  cozy: 'you want to stay in',
  thoughtful: 'your head is full',
  adventurous: 'you want a way out',
  fantasy: 'you want out of this world',
  crime: 'you want the dark side',
  curious: 'you want a secret',
  nostalgic: 'you want an old feeling',
  melancholic: 'you want to sit with the ache',
  playful: 'you want to drop the seriousness',
  heroic: 'you want someone to follow',
  inspired: 'you want a spark',
  angry: 'you want somewhere for the heat',
  weird: 'you want a crooked night',
  dark: 'you want the dark',
};

function firstGenre(movie) {
  const names = movie?.genres || [];
  if (Array.isArray(names) && names.length && typeof names[0] === 'string') {
    return names[0];
  }
  return '';
}

function shortTitle(title, fallback) {
  const t = String(title || '').trim();
  if (!t) {
    return fallback;
  }
  const head = t.split(':')[0].trim();
  return head.length >= 2 ? head : t;
}

function feelLine(mood, locale) {
  const tr = String(locale || '').startsWith('tr');
  const map = tr ? MOOD_TR : MOOD_EN;
  return map[mood] || (tr ? 'sana yakın bir his arıyorsun' : 'you want something that fits');
}

function flavorFromHits(hits, tr) {
  const blob = (hits || []).join(' ');
  if (/kar|kis|snow|winter|noel|christmas|yilbasi|buz|ice|frost|blizzard|kayak/.test(blob)) {
    return tr
      ? 'Kar, soğuk ve dışarıya kapanmış bir hava bunun içinde.'
      : 'Snow, cold, and a shut-in feeling run through it.';
  }
  if (/yagmur|rain|storm|firtina/.test(blob)) {
    return tr ? 'Yağmur ve ıslak bir gece bunun içinde.' : 'Rain and a wet night run through it.';
  }
  if (/ask|romantik|love|romantic/.test(blob)) {
    return tr ? 'Yakınlık ve ilişki bunun merkezinde.' : 'Closeness sits at the center of it.';
  }
  if (/korku|horror|gerilim|ghost/.test(blob)) {
    return tr ? 'Tedirginlik bunun dokusu.' : 'The unease is the texture.';
  }
  if (/yaz|plaj|beach|gunes|sahil|palmiye|deniz|okyanus|ocean|tatil|summer|sea/.test(blob)) {
    return tr
      ? 'Güneş, deniz ve ferah bir hava bunun içinde.'
      : 'Sun, sea, and an open air run through it.';
  }
  if (/cheerful|neseli|komedi|heartwarm/.test(blob)) {
    return tr
      ? 'Sıcak, neşeli, içini açan bir hali var.'
      : 'It is warm, cheerful, and easy to sink into.';
  }
  if (/twist|beyin|gizem|bulmaca/.test(blob)) {
    return tr
      ? 'Ters köşe kuran, kafa kurcalayan bir hikâye.'
      : 'It is a story that twists and will not leave your head.';
  }
  if (hits?.length) {
    return tr ? 'Yazdığın hal bu hikâyenin içinde geçiyor.' : 'The feeling you wrote runs through this one.';
  }
  return tr ? 'Bu, o havaya yakın duranlardan.' : 'This sits close to that mood.';
}

export function writeHook(movie, ctx, index, used) {
  const tr = String(ctx.locale || '').startsWith('tr');
  const title = shortTitle(movie?.title, tr ? 'Bu film' : 'This film');
  const genre = firstGenre(movie);
  const feel = feelLine(ctx.mood, ctx.locale);
  const prompt = String(ctx.prompt || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48);
  if (prompt && movie?.briefLoose) {
    const loose = tr
      ? `${title}, “${prompt}” cümlesine en yakın duranlardan.`
      : `${title} is one of the closer matches for “${prompt}”.`;
    if (!used.has(loose)) {
      used.add(loose);
      return loose;
    }
  }
  const g = genre
    ? tr
      ? genre.toLocaleLowerCase('tr-TR')
      : genre.toLowerCase()
    : '';
  const flavor = flavorFromHits(movie?.briefHits, tr);

  const trLines = prompt
    ? [
        `${title}, “${prompt}” için duruyor. ${flavor}`,
        `${flavor} ${title} o günün içine oturuyor.`,
        `“${prompt}” deyince ${title} o havayı taşıyor. ${flavor}`,
        `${title} bu his için seçildi: “${prompt}”. ${flavor}`,
        g
          ? `${title} ${g} tarafında, ama asıl bağı “${prompt}”. ${flavor}`
          : `${flavor} ${title} tam o cümlenin karşılığı.`,
      ]
    : [
        `${title} bu listeye girdi çünkü ${feel}.`,
        `${title}${g ? ` ${g} tarafında` : ''}, asıl işi senin haline yakın durmak.`,
        `${title} o hissi örtbas etmiyor, yanında duruyor.`,
        `${title} süs diye değil, o boşluk için burada.`,
        `${title} bu havayı ciddiye alıyor.`,
      ];

  const enLines = prompt
    ? [
        `${title} is here for “${prompt}”. ${flavor}`,
        `${flavor} ${title} sits inside that day.`,
        `“${prompt}” points at ${title}. ${flavor}`,
        `${title} was picked for this feeling: “${prompt}”. ${flavor}`,
        g
          ? `${title} leans ${g}, but the real tie is “${prompt}”. ${flavor}`
          : `${flavor} ${title} is the match for that line.`,
      ]
    : [
        `${title} fits tonight because ${feel}. Close enough to watch — no need to read the plot.`,
        `${title}${g ? ` looks like ${g}` : ''}, but it is here to hold your mood. ${feel}.`,
        `Tonight ${feel}. ${title} does not paper over it; it sits with you.`,
        `${title} is not decoration. ${feel} — this one fills that gap.`,
        g
          ? `Don’t shrug it off as ${g}. ${title} takes your night seriously; a couple of scenes and you’re in.`
          : `${title} takes your night seriously. A couple of scenes and you’re in.`,
      ];

  const lines = tr ? trLines : enLines;
  const pick =
    lines.find((line, i) => i >= index % lines.length && !used.has(line)) ||
    lines.find(line => !used.has(line)) ||
    lines[index % lines.length];
  used.add(pick);
  return pick;
}

export function looksLikeOverviewDump(movie, reason) {
  const raw = String(movie?.overview || '')
    .replace(/\s+/g, ' ')
    .trim();
  const text = String(reason || '');
  if (raw.length >= 24 && text.includes(raw.slice(0, 24))) {
    return true;
  }
  const mid = raw.slice(20, 52);
  return Boolean(mid.length >= 18 && text.includes(mid));
}
