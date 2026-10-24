import {watchLine} from '../src/components/WhereToWatch';
import {
  collapseOffers,
  parsePriceAmount,
  pickWatchNode,
  summarizeOffers,
} from '../src/api/watchOffers';

test('parses regional prices', () => {
  expect(parsePriceAmount('24,99₺')).toBe(24.99);
  expect(parsePriceAmount('$3.99')).toBe(3.99);
  expect(parsePriceAmount('1.378,20₺')).toBe(1378.2);
  expect(parsePriceAmount(null)).toBeNull();
});

test('keeps the cheaper offer and the sharper one when prices match', () => {
  const rows = collapseOffers([
    {
      monetizationType: 'RENT',
      presentationType: 'HD',
      retailPrice: '39,99₺',
      standardWebURL: 'https://example.com/hd',
      package: {clearName: 'Apple TV Store', icon: '/icon/1/{profile}/itunes.{format}'},
    },
    {
      monetizationType: 'RENT',
      presentationType: 'SD',
      retailPrice: '24,99₺',
      standardWebURL: 'https://example.com/sd',
      package: {clearName: 'Apple TV Store', icon: '/icon/1/{profile}/itunes.{format}'},
    },
    {
      monetizationType: 'RENT',
      presentationType: 'SD',
      retailPrice: '$3.99',
      standardWebURL: 'https://example.com/a-sd',
      package: {clearName: 'Amazon Video', icon: '/icon/2/{profile}/amazon.{format}'},
    },
    {
      monetizationType: 'RENT',
      presentationType: 'HD',
      retailPrice: '$3.99',
      standardWebURL: 'https://example.com/a-hd',
      package: {clearName: 'Amazon Video', icon: '/icon/2/{profile}/amazon.{format}'},
    },
    {
      monetizationType: 'FLATRATE',
      presentationType: 'HD',
      retailPrice: null,
      standardWebURL: 'https://www.netflix.com/title/1',
      package: {clearName: 'Netflix', icon: '/icon/3/{profile}/netflix.{format}'},
    },
  ]);
  const apple = rows.find(row => row.name === 'Apple TV Store');
  const amazon = rows.find(row => row.name === 'Amazon Video');
  expect(apple.priceAmount).toBe(24.99);
  expect(apple.url).toBe('https://example.com/sd');
  expect(amazon.quality).toBe('HD');
  expect(amazon.url).toBe('https://example.com/a-hd');
  expect(rows[0].name).toBe('Netflix');
  expect(rows[0].icon).toBe('https://images.justwatch.com/icon/3/s100/netflix.png');
});

test('matches the TMDB id before the title', () => {
  const edges = [
    {
      node: {
        objectType: 'MOVIE',
        content: {
          title: 'Başlangıç',
          originalTitle: 'Inception',
          originalReleaseYear: 2010,
          externalIds: {tmdbId: '27205'},
        },
        offers: [],
      },
    },
    {
      node: {
        objectType: 'MOVIE',
        content: {
          title: 'Inception',
          originalTitle: 'Inception',
          originalReleaseYear: 2010,
          externalIds: {tmdbId: '999'},
        },
        offers: [],
      },
    },
  ];
  const node = pickWatchNode(edges, {
    id: 27205,
    mediaType: 'movie',
    title: 'Başlangıç',
    originalTitle: 'Inception',
    year: '2010',
  });
  expect(node.content.externalIds.tmdbId).toBe('27205');
});

test('summarizes the cheapest rent and the swipe line', () => {
  const summary = summarizeOffers([
    {
      monetizationType: 'FLATRATE',
      presentationType: 'HD',
      retailPrice: null,
      standardWebURL: 'https://www.netflix.com/title/1',
      package: {clearName: 'Netflix'},
    },
    {
      monetizationType: 'FLATRATE',
      presentationType: 'HD',
      retailPrice: null,
      standardWebURL: 'https://tvplus.com.tr/x',
      package: {clearName: 'TV+'},
    },
    {
      monetizationType: 'RENT',
      presentationType: 'HD',
      retailPrice: '24,99₺',
      standardWebURL: 'https://tv.apple.com/tr/movie/x',
      package: {clearName: 'Apple TV Store'},
    },
    {
      monetizationType: 'BUY',
      presentationType: 'HD',
      retailPrice: '179,99₺',
      standardWebURL: 'https://tv.apple.com/tr/movie/x',
      package: {clearName: 'Apple TV Store'},
    },
  ]);
  expect(summary.lowestRent.priceLabel).toBe('24,99₺');
  expect(summary.lowestBuy.priceAmount).toBe(179.99);
  expect(watchLine('tr-TR', summary)).toBe('Netflix · TV+ · Apple TV Store');
});
