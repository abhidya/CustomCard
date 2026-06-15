import * as SecureStore from "expo-secure-store";

import { secureTokenCache } from "../secureTokenCache";

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
});
