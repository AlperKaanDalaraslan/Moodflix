const reactNativeJestPreset = require('@react-native/jest-preset/jest-preset');

module.exports = {
  ...reactNativeJestPreset,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    ...reactNativeJestPreset.transform,
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};
