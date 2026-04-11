const yellow = {
  primary: '#FFC107',
  primaryDark: '#F9A825',
  onPrimary: '#1A1204',
};

export const darkTheme = {
  background: '#0F0D08',
  surface: '#1A1610',
  surfaceElevated: '#242018',
  text: '#FAF7EF',
  textMuted: '#A89B82',
  ...yellow,
  border: '#2E281C',
  like: '#4CAF50',
  pass: '#E57373',
  overlay: 'rgba(0,0,0,0.55)',
};

export const lightTheme = {
  background: '#FFF8E1',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF3C4',
  text: '#1A1204',
  textMuted: '#5D5340',
  ...yellow,
  border: '#E0D2A8',
  like: '#2E7D32',
  pass: '#C62828',
  overlay: 'rgba(0,0,0,0.35)',
};

export function getTheme(mode) {
  return mode === 'light' ? lightTheme : darkTheme;
}
