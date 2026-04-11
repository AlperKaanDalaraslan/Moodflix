const yellow = {
  /** Rich gold — high contrast on true black without looking washed out */
  primary: '#F5C518',
  primaryDark: '#D4A012',
  onPrimary: '#0D0D0D',
};

export const darkTheme = {
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
};

export const lightTheme = {
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
};

export function getTheme(mode) {
  return mode === 'light' ? lightTheme : darkTheme;
}
