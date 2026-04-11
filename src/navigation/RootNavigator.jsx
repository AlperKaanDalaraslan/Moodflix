import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSettings} from '../context/SettingsContext';
import {t} from '../i18n/translations';
import {getTheme} from '../theme/colors';
import {shadow} from '../theme/shadows';
import {DiscoverScreen} from '../screens/DiscoverScreen';
import {FavoritesScreen} from '../screens/FavoritesScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {MovieDetailScreen} from '../screens/MovieDetailScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {SearchScreen} from '../screens/SearchScreen';
import {SwipeScreen} from '../screens/SwipeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabLabel({focused, label, colors}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        fontSize: 11,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.primary : colors.textMuted,
        marginTop: 2,
        letterSpacing: focused ? -0.1 : 0,
      }}>
      {label}
    </Text>
  );
}

function MainTabs() {
  const {locale, theme} = useSettings();
  const colors = getTheme(theme);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          ...shadow.tabBar,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({focused}) => (
            <TabLabel focused={focused} label={t(locale, 'home')} colors={colors} />
          ),
          tabBarIcon: ({focused}) => (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: focused ? colors.primary : 'transparent',
                marginBottom: -2,
              }}
            />
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
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: focused ? colors.primary : 'transparent',
                marginBottom: -2,
              }}
            />
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
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: focused ? colors.primary : colors.surfaceElevated,
              }}>
              <Text style={{fontWeight: '800', color: focused ? colors.onPrimary : colors.text}}>
                ⇄
              </Text>
            </View>
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
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: focused ? colors.primary : 'transparent',
                marginBottom: -2,
              }}
            />
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
            <Text style={{fontSize: 16, color: focused ? colors.primary : colors.textMuted}}>
              ♥
            </Text>
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
    const base = theme === 'dark' ? DarkTheme : DefaultTheme;
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
          headerTitleStyle: {color: colors.text},
          contentStyle: {backgroundColor: colors.background},
        }}>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="MovieDetail"
          component={MovieDetailScreen}
          options={{title: ''}}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{title: t(locale, 'profile')}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
