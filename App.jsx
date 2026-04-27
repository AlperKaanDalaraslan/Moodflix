import React, {useEffect, useRef} from 'react';
import {StatusBar, View} from 'react-native';
import RNShake from 'react-native-shake';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {FavoritesProvider} from './src/context/FavoritesContext';
import {ProfileProvider} from './src/context/ProfileContext';
import {SettingsProvider, useSettings} from './src/context/SettingsContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {getTheme, isDarkMode, nextThemeId} from './src/theme/colors';

function ThemedStatusBar() {
  const {theme} = useSettings();
  return (
    <StatusBar
      barStyle={isDarkMode(theme) ? 'light-content' : 'dark-content'}
      backgroundColor={getTheme(theme).background}
    />
  );
}

function ThemeShakeController() {
  const {theme, setTheme, shakeThemeEnabled} = useSettings();
  const lastShakeRef = useRef(0);

  useEffect(() => {
    if (!shakeThemeEnabled) {
      return undefined;
    }
    const sub = RNShake.addListener(() => {
      const now = Date.now();
      if (now - lastShakeRef.current < 1200) {
        return;
      }
      lastShakeRef.current = now;
      setTheme(nextThemeId(theme));
    });
    return () => {
      sub.remove();
    };
  }, [shakeThemeEnabled, theme, setTheme]);

  return null;
}

function AppInner() {
  return (
    <>
      <ThemedStatusBar />
      <ThemeShakeController />
      <RootNavigator />
    </>
  );
}

/** FavoritesProvider içinde useAuth kullanılmaz; auth state prop ile gelir (Hooks sırası / import döngüsü önlenir). */
function FavoritesAuthBridge({children}) {
  const {hydrated, isLoggedIn} = useAuth();
  return (
    <FavoritesProvider authHydrated={hydrated} authIsLoggedIn={isLoggedIn}>
      {children}
    </FavoritesProvider>
  );
}

function App() {
  return (
    <View style={{flex: 1}}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <ProfileProvider>
              <FavoritesAuthBridge>
                <AppInner />
              </FavoritesAuthBridge>
            </ProfileProvider>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </View>
  );
}

export default App;
