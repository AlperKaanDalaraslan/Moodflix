import {applyInterpretPlan, readBrief, scoreBrief} from '../src/services/discoverBrief';
import {writeHook} from '../src/services/discoverCopyWriter';

test('a snowy winter sentence is a winter brief, not a blank mood', () => {
  const brief = readBrief('Karlı bir kış günü');
  expect(brief.active).toBe(true);
  expect(brief.themes).toContain('winter');
  expect(brief.keywordQueries).toEqual(expect.arrayContaining(['snow', 'winter']));
});

test('superhero shows do not score as a snow day', () => {
  const brief = readBrief('Karlı bir kış gecesi');
  expect(brief.themes).toEqual(['winter']);
  expect(brief.keywordQueries).not.toContain('night');
  const arcane = scoreBrief(
    {
      title: 'Arcane',
      overview: 'Bir gece iki kardeş, yeraltı şehrinde karşı karşıya gelir.',
    },
    brief,
  );
  const snow = scoreBrief(
    {
      title: 'Kar Toplumu',
      overview: 'And Dağları’nda bir uçak kazası. Kar fırtınasında hayatta kalmaya çalışırlar.',
    },
    brief,
  );
  expect(arcane.score).toBe(0);
  expect(snow.score).toBeGreaterThan(0);
  expect(snow.hits).toEqual(expect.arrayContaining(['kar']));
});

test('cheerful and twist sentences become a real search, not an empty page', () => {
  const warm = readBrief('İçimi ısıtacak, neşeli bir şeyler');
  expect(warm.themes).toContain('cheerful');
  expect(warm.genres).toEqual(expect.arrayContaining([35, 10751]));
  const comedy = scoreBrief(
    {title: 'Paddington', overview: 'A bear finds a home.', _fromBriefGenre: true},
    warm,
  );
  expect(comedy.score).toBeGreaterThan(0);

  const twist = readBrief('Beyin yakan, ters köşe hikayeler');
  expect(twist.themes).toContain('twist');
  expect(twist.genres).toEqual(expect.arrayContaining([9648, 878]));
  expect(twist.keywordQueries).toEqual(expect.arrayContaining(['plot twist']));
});
test('a sunny beach is summer and sea, not a night list', () => {
  const beach = readBrief('Güneşli, ferah bir sahil, denizin ortasında');
  expect(beach.themes).toEqual(expect.arrayContaining(['summer', 'sea']));
  expect(beach.themes).not.toContain('night');
  const used = new Set();
  const line = writeHook(
    {title: 'The Beach', genres: ['Macera'], briefHits: ['summer', 'deniz']},
    {locale: 'tr-TR', mood: null, prompt: 'Güneşli, ferah bir sahil'},
    0,
    used,
  );
  expect(line).toContain('Güneşli, ferah bir sahil');
  expect(line).toContain('Güneş, deniz');
  expect(line).not.toMatch(/yön arıyorsun|senin geceni|bu geceye oturuyor/);
});

test('an unknown sentence still becomes a search plan', () => {
  const odd = readBrief('annemle sessizce oturup iç geçireceğim bir şey');
  expect(odd.active).toBe(true);
  expect(odd.keywordQueries.length).toBeGreaterThan(0);
  const merged = applyInterpretPlan(odd, {
    genres: [18, 999999],
    tvGenres: [18],
    keywords: ['melancholy'],
  });
  expect(merged.genres).toContain(18);
  expect(merged.genres).not.toContain(999999);
  expect(merged.keywordQueries).toContain('melancholy');
});
test('the card line does not pretend an unrelated title is the feeling', () => {
  const used = new Set();
  const line = writeHook(
    {title: 'Kar Toplumu', genres: ['Dram'], briefHits: ['kar', 'kis']},
    {locale: 'tr-TR', mood: null, prompt: 'Karlı bir kış günü'},
    0,
    used,
  );
  expect(line).toContain('Karlı bir kış günü');
  expect(line).toContain('Kar, soğuk');
  expect(line).not.toMatch(/yön arıyorsun|tam o hale giriyor/);
});
