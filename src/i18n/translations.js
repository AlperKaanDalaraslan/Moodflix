import uiPacks from './uiPacks.generated.json';
import {contentLocaleToUiPackId} from './contentLocaleToUiPack';
import enHand from './strings.en';
import trHand from './strings.tr';
import deHand from './strings.de';
import frHand from './strings.fr';

const handPacks = {
  en: enHand,
  tr: trHand,
  de: deHand,
  fr: frHand,
};

/**
 * @param {string} locale TMDB içerik yereli (ör. `fr-FR`, `de-DE`)
 * @param {string} key
 */
export function t(locale, key) {
  const packId = contentLocaleToUiPackId(locale);
  const pack = uiPacks[packId] ?? uiPacks.en;
  const handPack = handPacks[packId] ?? handPacks.en;
  const fromHand = handPack?.[key];
  const fromPack = pack[key];
  const fromEn = uiPacks.en[key];
  const fromEnHand = handPacks.en[key];
  if (typeof fromHand === 'string' && fromHand.length > 0) {
    return fromHand;
  }
  if (typeof fromPack === 'string' && fromPack.length > 0) {
    return fromPack;
  }
  if (typeof fromEnHand === 'string' && fromEnHand.length > 0) {
    return fromEnHand;
  }
  if (typeof fromEn === 'string' && fromEn.length > 0) {
    return fromEn;
  }
  return key;
}

/** @deprecated Sadece geriye dönük uyumluluk; `t()` kullanın. */
export const translations = uiPacks;
