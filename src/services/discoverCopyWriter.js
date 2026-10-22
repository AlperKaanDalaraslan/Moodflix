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
  return map[mood] || (tr ? 'bu geceye bir yön arıyorsun' : 'you want a direction for tonight');
}

export function writeHook(movie, ctx, index, used) {
  const tr = String(ctx.locale || '').startsWith('tr');
  const title = shortTitle(movie?.title, tr ? 'Bu film' : 'This film');
  const genre = firstGenre(movie);
  const feel = feelLine(ctx.mood, ctx.locale);
  const prompt = String(ctx.prompt || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 36);
  const g = genre
    ? tr
      ? genre.toLocaleLowerCase('tr-TR')
      : genre.toLowerCase()
    : '';

  const trLines = [
    `${title} bu geceye oturuyor çünkü ${feel}. İzlemeye değecek kadar yakın, özet okumaya gerek yok.`,
    prompt
      ? `“${prompt}” yazdıysan ${title} tam o hale giriyor. ${g ? `${g} perdesinden, ` : ''}sessizce içine işliyor.`
      : `${title}${g ? ` ${g} gibi duruyor` : ''} ama asıl işi senin halini tutmak. ${feel}.`,
    `Bu gece ${feel}. ${title} o hissi örtbas etmiyor, yanında oturuyor.`,
    `${title} süs diye listede değil. ${feel} ya — bu film o boşluğu dolduruyor.`,
    g
      ? `${g} diye geçme. ${title} senin geceni ciddiye alıyor; bir iki sahne yeter, yakalıyor.`
      : `${title} senin geceni ciddiye alıyor. Bir iki sahne yeter, yakalıyor.`,
  ];

  const enLines = [
    `${title} fits tonight because ${feel}. Close enough to watch — no need to read the plot.`,
    prompt
      ? `If you wrote “${prompt}”, ${title} walks into that feeling. ${g ? `A ${g} tint, ` : ''}it gets under the skin.`
      : `${title}${g ? ` looks like ${g}` : ''}, but it is here to hold your mood. ${feel}.`,
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
