// Shared jest setup for the CustomCard mobile suite.
//
// Native modules that need an OS keychain/keystore or a real device are mocked
// here with in-memory equivalents so unit and component tests stay hermetic.

// React 19 requires the concurrent act() environment flag to be set explicitly
// so React Testing Library renders/updates are wrapped correctly.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native-safe-area-context", () => {
  const mock = jest.requireActual("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __reset: () => store.clear()
  };
});

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => `00000000-0000-4000-8000-${String(Math.random()).slice(2, 14).padEnd(12, "0")}`)
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: "https://api.qa.customcard.example",
        appEnv: "qa",
        clerkPublishableKey: "pk_test_customcard_qa",
        oauthRedirectUrl: "customcard://sso-callback",
        realOrderKillSwitch: "disabled"
      }
    }
  }
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true }))
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(async () => ({ type: "dismiss" })),
  openAuthSessionAsync: jest.fn(async () => ({ type: "dismiss" })),
  maybeCompleteAuthSession: jest.fn()
}));
