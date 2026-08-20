// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // `.expo` holds generated output (typed routes, caches); linting it
    // reports problems in files no one edits.
    ignores: ["dist/*", ".expo/*"],
  }
]);
