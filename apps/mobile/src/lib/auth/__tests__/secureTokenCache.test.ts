import * as SecureStore from "expo-secure-store";

import { devSessionTokenStore, secureTokenCache } from "../secureTokenCache";

describe("secureTokenCache", () => {
  it("stores and retrieves tokens via the OS secure store only", async () => {
    await secureTokenCache.saveToken("clerk-token", "value-1");
    expect(await secureTokenCache.getToken("clerk-token")).toBe("value-1");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("clerk-token", "value-1");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("clerk-token");
  });

  it("clears tokens on demand", async () => {
    await secureTokenCache.saveToken("clerk-token", "value-2");
    await secureTokenCache.clearToken?.("clerk-token");
    expect(await secureTokenCache.getToken("clerk-token")).toBeNull();
  });

  it("returns null instead of throwing when the keystore fails", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error("keystore unavailable")
    );
    expect(await secureTokenCache.getToken("anything")).toBeNull();
  });

  it("round-trips the dev session token through secure storage", async () => {
    await devSessionTokenStore.save("local-dev-token");
    expect(await devSessionTokenStore.get()).toBe("local-dev-token");
    await devSessionTokenStore.clear();
    expect(await devSessionTokenStore.get()).toBeNull();
  });
});
