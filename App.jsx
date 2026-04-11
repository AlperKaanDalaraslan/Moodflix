import React from 'react';
import {StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FavoritesProvider} from './src/context/FavoritesContext';
import {SettingsProvider, useSettings} from './src/context/SettingsContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {getTheme} from './src/theme/colors';

function ThemedStatusBar() {
  const {theme} = useSettings();
  return (
    <StatusBar
      barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={getTheme(theme).background}
    />
  );
}

function AppInner() {
  return (
    <>
      <ThemedStatusBar />
      <RootNavigator />
    </>
  );
}

function App() {
  return (
    <View style={{flex: 1}}>
      <SafeAreaProvider>
        <SettingsProvider>
          <FavoritesProvider>
            <AppInner />
          </FavoritesProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </View>
  );
}

export default App;
