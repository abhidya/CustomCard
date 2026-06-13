/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|react-native-.*|@react-native(-community)?|expo|expo-.*|@expo/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@clerk/.*|@tanstack/.*)/)"
  ],
  clearMocks: true
};
