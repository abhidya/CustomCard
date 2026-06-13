import { ConfigError, resolveAppConfig } from "../env";

const base = {
  apiBaseUrl: "https://api.example.test",
  appEnv: "production",
  clerkPublishableKey: "pk_test_x",
  realOrderKillSwitch: "disabled"
};

describe("resolveAppConfig", () => {
  it("accepts an https API URL in production", () => {
    const config = resolveAppConfig(base, false);
    expect(config.apiBaseUrl).toBe("https://api.example.test");
    expect(config.appEnv).toBe("production");
    expect(config.devSessionSignInAllowed).toBe(false);
  });

  it("rejects a missing API base URL", () => {
    expect(() => resolveAppConfig({ ...base, apiBaseUrl: "" }, true)).toThrow(ConfigError);
  });

  it("rejects cleartext http URLs outside local development", () => {
    expect(() =>
      resolveAppConfig({ ...base, apiBaseUrl: "http://api.example.test" }, false)
    ).toThrow(/https/);
    // Release build pointed at http must fail even if appEnv claims development.
    expect(() =>
      resolveAppConfig(
        { ...base, apiBaseUrl: "http://api.example.test", appEnv: "development" },
        false
      )
    ).toThrow(/https/);
  });

  it("allows http only for development builds in the development environment", () => {
    const config = resolveAppConfig(
      { ...base, apiBaseUrl: "http://127.0.0.1:8787", appEnv: "development" },
      true
    );
    expect(config.apiBaseUrl).toBe("http://127.0.0.1:8787");
    expect(config.devSessionSignInAllowed).toBe(true);
  });

  it("strips trailing slashes from the base URL", () => {
    expect(
      resolveAppConfig({ ...base, apiBaseUrl: "https://api.example.test///" }, false).apiBaseUrl
    ).toBe("https://api.example.test");
  });

  it("treats the kill switch as disabled unless explicitly enabled", () => {
    expect(resolveAppConfig(base, false).realOrderKillSwitch).toBe("disabled");
    expect(
      resolveAppConfig({ ...base, realOrderKillSwitch: "enabled" }, false).realOrderKillSwitch
    ).toBe("enabled");
  });
});
