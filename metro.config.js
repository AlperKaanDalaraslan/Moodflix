const fs = require('fs');
const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Build shims/@env/index.js from .env before Metro resolves imports.
require('./scripts/write-env-shim.js');

const envPkgRoot = path.resolve(__dirname, 'shims', '@env');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      '@env': envPkgRoot,
    },
  },
  watchFolders: [envPkgRoot],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
