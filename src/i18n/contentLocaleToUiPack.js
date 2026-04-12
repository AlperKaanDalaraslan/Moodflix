/**
 * TMDB `xx-YY` içerik dilini UI çeviri paketi kimliğine eşler.
 * Çince: ayrı paketler; Norveç (bokmål): `nb`.
 */
export function contentLocaleToUiPackId(code) {
  if (!code || typeof code !== 'string') {
    return 'en';
  }
  const c = code.trim();
  if (c === 'zh-CN') {
    return 'zh-Hans';
  }
  if (c === 'zh-TW' || c === 'zh-HK') {
    return 'zh-Hant';
  }
  const primary = c.split('-')[0].toLowerCase();
  if (primary === 'nb') {
    return 'nb';
  }
  return primary;
}
