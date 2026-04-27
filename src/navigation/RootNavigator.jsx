import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React, {useMemo} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme, isDarkMode} from '../theme/colors';
import {shadow} from '../theme/shadows';
import {CategoryListScreen} from '../screens/CategoryListScreen';
import {DiscoverScreen} from '../screens/DiscoverScreen';
import {FavoritesScreen} from '../screens/FavoritesScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {MovieDetailScreen} from '../screens/MovieDetailScreen';
import {LoginRegisterScreen} from '../screens/LoginRegisterScreen';
import {ProfileEditScreen} from '../screens/ProfileEditScreen';
import {ProfileMoviesScreen} from '../screens/ProfileMoviesScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {SearchScreen} from '../screens/SearchScreen';
import {SwipeScreen} from '../screens/SwipeScreen';
import {ThemePickerScreen} from '../screens/ThemePickerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabLabel({focused, label, colors}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        fontSize: 11,
        fontWeight: focused ? '800' : '600',
        color: focused ? colors.primary : colors.textMuted,
        marginTop: 4,
        letterSpacing: focused ? -0.15 : -0.05,
        opacity: focused ? 1 : 0.92,
      }}>
      {label}
    </Text>
  );
}

/** Tüm sekmelerde aynı boyut / hizalı ikon; aktif: sarı + hafif zemin */
function TabGlyph({focused, theme, colors, children}) {
  const darkMode = isDarkMode(theme);
  const pill =
    focused && darkMode
      ? 'rgba(245, 197, 24, 0.18)'
      : focused && !darkMode
        ? 'rgba(230, 172, 0, 0.24)'
        : 'transparent';

  return (
    <View style={[tabGlyphStyles.holder, {backgroundColor: pill}]}>
      <Text
        allowFontScaling={false}
        style={[
          tabGlyphStyles.glyph,
          {
            color: focused ? colors.primary : colors.text,
            opacity: focused ? 1 : 0.42,
            fontWeight: focused ? '900' : '700',
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

const tabGlyphStyles = StyleSheet.create({
  holder: {
    minWidth: 44,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  glyph: {
    fontSize: 20,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

function MainTabs() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      /** Dil değişince sekmelerin etiketleri güncellensin (options önbelleği) */
      key={locale}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          ...shadow.tabBar,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarItemStyle: {paddingVertical: 2},
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({focused}) => (
            <TabLabel focused={focused} label={t(locale, 'appName')} colors={colors} />
          ),
          tabBarIcon: ({focused}) => (
            <TabGlyph focused={focused} theme={theme} colors={colors}>
              ⌂
            </TabGlyph>
          ),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: ({focused}) => (
            <TabLabel
              focused={focused}
              label={t(locale, 'discover')}
              colors={colors}
            />
          ),
          tabBarIcon: ({focused}) => (
            <TabGlyph focused={focused} theme={theme} colors={colors}>
              ✦
            </TabGlyph>
          ),
        }}
      />
      <Tab.Screen
        name="Swipe"
        component={SwipeScreen}
        options={{
          tabBarLabel: ({focused}) => (
            <TabLabel focused={focused} label={t(locale, 'swipe')} colors={colors} />
          ),
          tabBarIcon: ({focused}) => (
            <TabGlyph focused={focused} theme={theme} colors={colors}>
              ⇄
            </TabGlyph>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: ({focused}) => (
            <TabLabel focused={focused} label={t(locale, 'search')} colors={colors} />
          ),
          tabBarIcon: ({focused}) => (
            <TabGlyph focused={focused} theme={theme} colors={colors}>
              ⊙
            </TabGlyph>
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: ({focused}) => (
            <TabLabel
              focused={focused}
              label={t(locale, 'favorites')}
              colors={colors}
            />
          ),
          tabBarIcon: ({focused}) => (
            <TabGlyph focused={focused} theme={theme} colors={colors}>
              ♥
            </TabGlyph>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);

  const navigationTheme = useMemo(() => {
    const base = isDarkMode(theme) ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primaryDark,
      },
    };
  }, [colors, theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: colors.surface},
          headerTintColor: colors.text,
          headerTitleStyle: {color: colors.text, fontWeight: '800', fontSize: 17},
          /** iOS’ta geri yanında uzun başlık istemiyorsak */
          headerBackTitleVisible: false,
          contentStyle: {backgroundColor: colors.background},
        }}>
        <Stack.Screen
          name="Root"
          component={MainTabs}
          options={{
            headerShown: false,
            /** iOS geri etiketi: uygulama adı yerine «Ana sayfa» çevirisi (dil değişiminde belli olsun). */
            title: t(locale, 'home'),
          }}
        />
        <Stack.Screen
          name="MovieDetail"
          component={MovieDetailScreen}
          options={{title: ''}}
        />
        <Stack.Screen
          name="CategoryList"
          component={CategoryListScreen}
          options={{title: ''}}
        />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
        <Stack.Screen name="ProfileMovies" component={ProfileMoviesScreen} />
        <Stack.Screen name="ThemePicker" component={ThemePickerScreen} />
        <Stack.Screen
          name="LoginRegister"
          component={LoginRegisterScreen}
          options={{title: ''}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
