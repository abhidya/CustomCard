import * as SecureStore from "expo-secure-store";

import { devLog } from "../api/redact";

/**
 * Clerk token cache backed by the OS keychain/keystore via expo-secure-store.
 * Tokens never touch AsyncStorage, logs, or JS-readable disk locations.
 */
export interface TokenCache {
  getToken(key: string): Promise<string | null>;
  saveToken(key: string, value: string): Promise<void>;
  clearToken?(key: string): Promise<void>;
}

export const secureTokenCache: TokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      devLog("Secure storage read failed; treating token as absent.");
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      devLog("Secure storage write failed; token not persisted.");
    }
  },
  async clearToken(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      devLog("Secure storage delete failed.");
    }
  }
};

const DEV_SESSION_TOKEN_KEY = "customcard.devSessionToken";

/**
 * Development-only session token storage for the local memory-runtime API.
 * Never used in release builds (guarded by `devSessionSignInAllowed`).
 */
export const devSessionTokenStore = {
  get: () => secureTokenCache.getToken(DEV_SESSION_TOKEN_KEY),
  save: (token: string) => secureTokenCache.saveToken(DEV_SESSION_TOKEN_KEY, token),
  clear: () => secureTokenCache.clearToken?.(DEV_SESSION_TOKEN_KEY) ?? Promise.resolve()
};
