const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "coverage/**", "scripts/**"]
  },
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Apostrophes/quotes render correctly inside React Native <Text>; this
      // web-oriented rule produces only noise here.
      "react/no-unescaped-entities": "off",
      // Hydrating an editable form once from server-loaded draft state is a
      // legitimate external-sync effect; keep it as a hint, not an error.
      "react-hooks/set-state-in-effect": "warn"
    }
  }
]);
