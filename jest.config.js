const reactNativeJestPreset = require('@react-native/jest-preset/jest-preset');

module.exports = {
  ...reactNativeJestPreset,
  moduleNameMapper: {
    ...reactNativeJestPreset.moduleNameMapper,
    '^@env$': '<rootDir>/__mocks__/env.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    ...reactNativeJestPreset.transform,
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};
