// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "coverage/*"],
  },
  {
    // Known backlog: these React Compiler rules flag existing screens (setState in effects,
    // components declared inside render, functions used in effects before declaration).
    // They stay visible as warnings until those screens are refactored, so CI can fail on
    // every other lint error.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);
