jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      createAnimatedComponent: c => c,
      call: () => {},
    },
    useSharedValue: init => ({value: init}),
    useAnimatedStyle: () => ({}),
    withSpring: to => to,
    runOnJS: fn => fn,
  };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({children}) => React.createElement(React.Fragment, null, children),
    DarkTheme: {colors: {}},
    DefaultTheme: {colors: {}},
    useNavigation: () => ({navigate: jest.fn(), setOptions: jest.fn()}),
    useRoute: () => ({params: {}}),
    useFocusEffect: cb => {
      React.useEffect(() => {
        const unsub = cb();
        return typeof unsub === 'function' ? unsub : undefined;
      }, [cb]);
    },
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({children}) => React.createElement(React.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({children}) => React.createElement(React.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    WebView: props => React.createElement(RN.View, {...props, testID: 'webview-mock'}),
  };
});

jest.mock('react-native-keychain', () => {
  const jwtByService = new Map();
  return {
    __esModule: true,
    setGenericPassword: jest.fn(async (_u, password, opts) => {
      jwtByService.set(opts?.service ?? 'default', password);
      return {service: opts?.service ?? 'default', storage: 'mock'};
    }),
    getGenericPassword: jest.fn(async opts => {
      const password = jwtByService.get(opts?.service ?? 'default');
      if (!password) {
        return false;
      }
      return {
        service: opts?.service ?? 'default',
        username: 'moodflix_jwt',
        password,
      };
    }),
    resetGenericPassword: jest.fn(async opts => {
      jwtByService.delete(opts?.service ?? 'default');
      return true;
    }),
  };
});

jest.mock('./src/data/emojiAvatarData', () => ({
  getEmojiAvatarRecords: () => [
    {emoji: '😀', name: 'grinning face', slug: 'grinning_face', group: 'Smileys'},
    {emoji: '🐱', name: 'cat face', slug: 'cat_face', group: 'Animals'},
  ],
  filterEmojiAvatarRecords: (recs, q) => {
    const t = String(q ?? '')
      .trim()
      .toLowerCase();
    if (!t) {
      return recs;
    }
    return recs.filter(r => r.name.toLowerCase().includes(t));
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: async (k) => (store.has(k) ? store.get(k) : null),
      setItem: async (k, v) => {
        store.set(k, v);
      },
      removeItem: async k => {
        store.delete(k);
      },
      clear: async () => {
        store.clear();
      },
    },
  };
});
