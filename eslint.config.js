const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { ignores: ['.expo/**', 'dist/**', 'web-build/**', 'expo-env.d.ts'] },
]);
