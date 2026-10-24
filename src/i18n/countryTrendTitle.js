import {contentLocaleToUiPackId} from './contentLocaleToUiPack';

export function countryTrendTitle(locale) {
  const pack = contentLocaleToUiPackId(locale);
  if (pack === 'tr') {
    return 'Ülkende trend olanlar';
  }
  if (pack === 'de') {
    return 'Trends in deinem Land';
  }
  if (pack === 'fr') {
    return 'Tendances dans ton pays';
  }
  return 'Trending in your country';
}
