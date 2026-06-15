import { ConfigError, resolveAppConfig } from "../env";

const base = {
  apiBaseUrl: "https://api.example.test",
  appEnv: "production",
  clerkPublishableKey: "pk_live_x",
  realOrderKillSwitch: "disabled"
};

describe("resolveAppConfig", () => {
  it("accepts an https API URL in production", () => {
    const config = resolveAppConfig(base, false);
    expect(config.apiBaseUrl).toBe("https://api.example.test");
    expect(config.appEnv).toBe("production");
  });

  it("normalizes QA environment aliases", () => {
    expect(
      resolveAppConfig({ ...base, appEnv: "qa", clerkPublishableKey: "pk_test_x" }).appEnv
    ).toBe("qa");
    expect(
      resolveAppConfig({ ...base, appEnv: "staging", clerkPublishableKey: "pk_test_x" }).appEnv
    ).toBe("qa");
    expect(
      resolveAppConfig({ ...base, appEnv: "preview", clerkPublishableKey: "pk_test_x" }).appEnv
    ).toBe("qa");
  });

  it("rejects a missing API base URL", () => {
    expect(() => resolveAppConfig({ ...base, apiBaseUrl: "" }, true)).toThrow(ConfigError);
  });

  it("rejects cleartext http URLs for every mobile environment", () => {
    expect(() => resolveAppConfig({ ...base, apiBaseUrl: "http://api.example.test" })).toThrow(
      /https/
    );
    expect(() =>
      resolveAppConfig({ ...base, apiBaseUrl: "http://127.0.0.1:8787", appEnv: "qa" })
    ).toThrow(/https/);
  });

  it("rejects unsupported mobile environments", () => {
    expect(() => resolveAppConfig({ ...base, appEnv: "development" })).toThrow(/qa or production/);
  });

  it("requires Clerk publishable keys", () => {
    expect(() => resolveAppConfig({ ...base, clerkPublishableKey: "" })).toThrow(/Clerk/);
    expect(() => resolveAppConfig({ ...base, clerkPublishableKey: "sk_live_secret" })).toThrow(
      /Clerk/
    );
  });

  it("requires live Clerk keys for production builds", () => {
    expect(() => resolveAppConfig({ ...base, clerkPublishableKey: "pk_test_x" })).toThrow(
      /live publishable key/
    );
    expect(
      resolveAppConfig({ ...base, appEnv: "qa", clerkPublishableKey: "pk_test_x" })
        .clerkPublishableKey
    ).toBe("pk_test_x");
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
