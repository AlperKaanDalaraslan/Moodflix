import uiPacks from './uiPacks.generated.json';
import {contentLocaleToUiPackId} from './contentLocaleToUiPack';
import {styleButtonLabel} from './styleButtonLabels';
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
  const localeHand = handPacks[packId];
  const fromLocaleHand = localeHand?.[key];
  const fromStyle = styleButtonLabel(packId, key);
  const fromPack = pack?.[key];
  const fromEnHand = handPacks.en?.[key];
  const fromEn = uiPacks.en?.[key];
  if (typeof fromLocaleHand === 'string' && fromLocaleHand.length > 0) {
    return fromLocaleHand;
  }
  if (typeof fromStyle === 'string' && fromStyle.length > 0) {
    return fromStyle;
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
