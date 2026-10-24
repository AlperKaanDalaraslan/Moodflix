function withMeta(theme, mode) {
  return {...theme, mode};
}

const yellow = {
  primary: '#F5C518',
  primaryDark: '#D4A012',
  onPrimary: '#0D0D0D',
};

export const darkTheme = withMeta({
  background: '#000000',
  surface: '#141414',
  surfaceElevated: '#1F1F1F',
  text: '#FFFFFF',
  textMuted: '#B3B3B3',
  ...yellow,
  border: '#2A2A2A',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.65)',
}, 'dark');

export const lightTheme = withMeta({
  background: '#FFF8E1',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF3C4',
  text: '#1A1204',
  textMuted: '#5D5340',
  primary: '#E6AC00',
  primaryDark: '#C49200',
  onPrimary: '#141204',
  border: '#E0D2A8',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.35)',
}, 'light');

export const midnightTheme = withMeta({
  background: '#060A16',
  surface: '#111A2C',
  surfaceElevated: '#1A2640',
  text: '#ECF2FF',
  textMuted: '#A7B8DA',
  primary: '#7FB3FF',
  primaryDark: '#5A92E6',
  onPrimary: '#071326',
  border: '#243456',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.6)',
}, 'dark');

export const forestTheme = withMeta({
  background: '#08140E',
  surface: '#102118',
  surfaceElevated: '#173024',
  text: '#E8F8EC',
  textMuted: '#A5CBB2',
  primary: '#7ED957',
  primaryDark: '#5CB63A',
  onPrimary: '#0A1A0D',
  border: '#274A35',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.55)',
}, 'dark');

export const sunsetTheme = withMeta({
  background: '#1B0C11',
  surface: '#2A121B',
  surfaceElevated: '#3A1C27',
  text: '#FFEAF0',
  textMuted: '#D8A8B8',
  primary: '#FF8A5B',
  primaryDark: '#E66D3E',
  onPrimary: '#2A120A',
  border: '#5B2B3A',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.55)',
}, 'dark');

export const roseLightTheme = withMeta({
  background: '#FFF5F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFE8F0',
  text: '#2A1118',
  textMuted: '#7E5965',
  primary: '#E85D8F',
  primaryDark: '#C94577',
  onPrimary: '#FFF6FA',
  border: '#E9C3D1',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.25)',
}, 'light');

export const oceanLightTheme = withMeta({
  background: '#F2FAFF',
  surface: '#FFFFFF',
  surfaceElevated: '#DFF3FF',
  text: '#0F2430',
  textMuted: '#4F6D7E',
  primary: '#1B9CE5',
  primaryDark: '#167DB8',
  onPrimary: '#F5FCFF',
  border: '#B7D9EA',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.25)',
}, 'light');

export const graphiteTheme = withMeta({
  background: '#0C0C0E',
  surface: '#1A1B1F',
  surfaceElevated: '#252730',
  text: '#F0F1F5',
  textMuted: '#A5A8B5',
  primary: '#B0B8FF',
  primaryDark: '#8F98E6',
  onPrimary: '#0F1222',
  border: '#313545',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.6)',
}, 'dark');

export const amoledPurpleTheme = withMeta({
  background: '#050108',
  surface: '#14081C',
  surfaceElevated: '#221033',
  text: '#F8EEFF',
  textMuted: '#C5A8D8',
  primary: '#C87DFF',
  primaryDark: '#A75CE6',
  onPrimary: '#1D082E',
  border: '#3A2054',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.62)',
}, 'dark');

export const mintLightTheme = withMeta({
  background: '#F3FFF9',
  surface: '#FFFFFF',
  surfaceElevated: '#DDF8EA',
  text: '#0D2A1E',
  textMuted: '#4D7464',
  primary: '#24C48E',
  primaryDark: '#199B70',
  onPrimary: '#F4FFFB',
  border: '#B8E6D4',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.2)',
}, 'light');

export const amberLightTheme = withMeta({
  background: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFECCC',
  text: '#2A1C03',
  textMuted: '#78623A',
  primary: '#F2A31B',
  primaryDark: '#CD850F',
  onPrimary: '#221503',
  border: '#E8CF9B',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.24)',
}, 'light');

export const slateLightTheme = withMeta({
  background: '#F4F7FA',
  surface: '#FFFFFF',
  surfaceElevated: '#E8EEF5',
  text: '#1D2734',
  textMuted: '#5C6E82',
  primary: '#4A79A8',
  primaryDark: '#355D84',
  onPrimary: '#F4FAFF',
  border: '#CDD8E4',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.24)',
}, 'light');

export const crimsonTheme = withMeta({
  background: '#14060A',
  surface: '#241016',
  surfaceElevated: '#351820',
  text: '#FFECEE',
  textMuted: '#D7A8B0',
  primary: '#FF4D6A',
  primaryDark: '#E03652',
  onPrimary: '#2A0A10',
  border: '#5A2430',
  like: '#46D369',
  pass: '#FFB4B4',
  overlay: 'rgba(0,0,0,0.58)',
}, 'dark');

export const lagoonTheme = withMeta({
  background: '#041416',
  surface: '#0C2428',
  surfaceElevated: '#14383E',
  text: '#E7FBFC',
  textMuted: '#9DCFD4',
  primary: '#2EC4B6',
  primaryDark: '#1A9E92',
  onPrimary: '#042220',
  border: '#1E5558',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.58)',
}, 'dark');

export const sandLightTheme = withMeta({
  background: '#FBF6EE',
  surface: '#FFFFFF',
  surfaceElevated: '#F3E6D4',
  text: '#2C2418',
  textMuted: '#7A6A56',
  primary: '#C4A574',
  primaryDark: '#A88855',
  onPrimary: '#23180C',
  border: '#E4D3BA',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.22)',
}, 'light');

export const lavenderLightTheme = withMeta({
  background: '#F7F4FF',
  surface: '#FFFFFF',
  surfaceElevated: '#EBE4FF',
  text: '#241C38',
  textMuted: '#6E6288',
  primary: '#8B6CDB',
  primaryDark: '#6E50C0',
  onPrimary: '#F8F5FF',
  border: '#D5CBEE',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.22)',
}, 'light');

export const emberTheme = withMeta({
  background: '#120C08',
  surface: '#24160E',
  surfaceElevated: '#352016',
  text: '#FFF3E8',
  textMuted: '#D2B39A',
  primary: '#FF7A2F',
  primaryDark: '#E06018',
  onPrimary: '#2A1206',
  border: '#5A3420',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.58)',
}, 'dark');

export const glacierLightTheme = withMeta({
  background: '#F4FBFF',
  surface: '#FFFFFF',
  surfaceElevated: '#E3F4FB',
  text: '#102833',
  textMuted: '#5A7582',
  primary: '#3AA0C8',
  primaryDark: '#2A7EA0',
  onPrimary: '#F4FCFF',
  border: '#C5E0EB',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.22)',
}, 'light');

export const cocoaTheme = withMeta({
  background: '#120E0C',
  surface: '#241C16',
  surfaceElevated: '#342820',
  text: '#F8F0E8',
  textMuted: '#CDB8A4',
  primary: '#D4A276',
  primaryDark: '#B88458',
  onPrimary: '#24160C',
  border: '#4A382C',
  like: '#46D369',
  pass: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.58)',
}, 'dark');

export const pearlLightTheme = withMeta({
  background: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceElevated: '#EEEEF1',
  text: '#1C1C22',
  textMuted: '#6A6A76',
  primary: '#5C5C6A',
  primaryDark: '#454552',
  onPrimary: '#F7F7F8',
  border: '#D8D8DE',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.22)',
}, 'light');

export const THEME_OPTIONS = [
  {id: 'dark', key: 'themeDark'},
  {id: 'light', key: 'themeLight'},
  {id: 'midnight', key: 'themeMidnight'},
  {id: 'forest', key: 'themeForest'},
  {id: 'sunset', key: 'themeSunset'},
  {id: 'graphite', key: 'themeGraphite'},
  {id: 'amoledPurple', key: 'themeAmoledPurple'},
  {id: 'rose', key: 'themeRose'},
  {id: 'ocean', key: 'themeOcean'},
  {id: 'mint', key: 'themeMint'},
  {id: 'amber', key: 'themeAmber'},
  {id: 'slate', key: 'themeSlate'},
  {id: 'crimson', key: 'themeCrimson'},
  {id: 'lagoon', key: 'themeLagoon'},
  {id: 'sand', key: 'themeSand'},
  {id: 'lavender', key: 'themeLavender'},
  {id: 'ember', key: 'themeEmber'},
  {id: 'glacier', key: 'themeGlacier'},
  {id: 'cocoa', key: 'themeCocoa'},
  {id: 'pearl', key: 'themePearl'},
];

const themeMap = {
  dark: darkTheme,
  light: lightTheme,
  midnight: midnightTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  graphite: graphiteTheme,
  amoledPurple: amoledPurpleTheme,
  rose: roseLightTheme,
  ocean: oceanLightTheme,
  mint: mintLightTheme,
  amber: amberLightTheme,
  slate: slateLightTheme,
  crimson: crimsonTheme,
  lagoon: lagoonTheme,
  sand: sandLightTheme,
  lavender: lavenderLightTheme,
  ember: emberTheme,
  glacier: glacierLightTheme,
  cocoa: cocoaTheme,
  pearl: pearlLightTheme,
};

const themeOrder = THEME_OPTIONS.map(x => x.id);

export function getThemeMode(themeId) {
  return getTheme(themeId).mode;
}

export function isDarkMode(themeId) {
  return getThemeMode(themeId) === 'dark';
}

export function isThemeId(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(themeMap, value);
}

export function nextThemeId(currentThemeId) {
  const idx = themeOrder.indexOf(currentThemeId);
  if (idx < 0) {
    return themeOrder[0] ?? 'dark';
  }
  return themeOrder[(idx + 1) % themeOrder.length];
}

export function getTheme(mode) {
  return themeMap[mode] ?? darkTheme;
}
