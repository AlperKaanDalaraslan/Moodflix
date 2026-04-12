import uiPacks from './uiPacks.generated.json';
import {contentLocaleToUiPackId} from './contentLocaleToUiPack';

/**
 * @param {string} locale TMDB içerik yereli (ör. `fr-FR`, `de-DE`)
 * @param {string} key
 */
export function t(locale, key) {
  const packId = contentLocaleToUiPackId(locale);
  const pack = uiPacks[packId] ?? uiPacks.en;
  const v = pack[key] ?? uiPacks.en[key];
  return v !== undefined && v !== '' ? v : key;
}

/** @deprecated Sadece geriye dönük uyumluluk; `t()` kullanın. */
export const translations = uiPacks;
