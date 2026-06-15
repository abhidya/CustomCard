import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runMobileNativeInstallProof } from "../apps/mobile/scripts/native-install-proof.mjs";

const now = new Date("2026-06-15T17:45:00.000Z");

describe("mobile native install proof", () => {
  it("fails closed unless the guarded local scan is explicitly enabled", () => {
    const report = runMobileNativeInstallProof({ env: {}, now });

    expect(report).toMatchObject({
      service: "customcard-mobile-native-install-proof",
      status: "blocked",
      destructiveActions: false,
      externalNetworkCalls: false,
      realOrdersEnabled: false,
      liveProviderCalls: false,
      valuesRedacted: true
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF=enabled is required before scanning installed native app bundles.",
        "CUSTOMCARD_MOBILE_SIMULATOR_UDID, CUSTOMCARD_MOBILE_APP_BUNDLE_PATH, or CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH is required."
      ])
    );
  });

  it("blocks stale installed bundles without leaking raw paths or secret-like config values", () => {
    const appPath = createNativeAppBundle({
      mainBundleText: [
        "Finish manually",
        "request local regeneration",
        "Template artwork is ready now"
      ].join("\n"),
      appConfig: {
        extra: {
          appEnv: "qa",
          apiBaseUrl: "https://api.qa.customcard.test",
          clerkPublishableKey: "pk_test_secret_native_install_key",
          oauthRedirectUrl: "customcard://sso-callback",
          realOrderKillSwitch: "disabled"
        }
      }
    });

    const report = runMobileNativeInstallProof({
      env: {
        CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF: "enabled",
        CUSTOMCARD_MOBILE_APP_BUNDLE_PATH: appPath
      },
      now
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.bundle).toMatchObject({
      bundleId: "com.customcard.app",
      bundlePathConfigured: true,
      bundlePathResolved: true,
      mainBundleFound: true
    });
    expect(report.bundle.bundlePathFingerprint).toMatch(/^[a-f0-9]{12}$/);
    expect(report.appConfig).toMatchObject({
      present: true,
      appEnv: "qa",
      apiBaseUrlConfigured: true,
      clerkPublishableKeyKind: "test",
      oauthRedirectConfigured: true,
      realOrderKillSwitch: "disabled"
    });
    expect(report.presentStaleSignals).toEqual(
      expect.arrayContaining(["Finish manually", "request local regeneration", "Template artwork is ready now"])
    );
    expect(report.missingCurrentSignals).toEqual(
      expect.arrayContaining(["print through your preferred print shop", "Finish at a print shop"])
    );
    expect(serialized).not.toContain(appPath);
    expect(serialized).not.toContain("pk_test_secret_native_install_key");
    expect(serialized).not.toContain("https://api.qa.customcard.test");
  });

  it("accepts a current QA native bundle while keeping real orders disabled", () => {
    const appPath = createNativeAppBundle({
      mainBundleText: [
        "print through your preferred print shop",
        "Finish at a print shop",
        "Draft again",
        "The card assistant",
        "secure Google Calendar connection is still pending"
      ].join("\n"),
      appConfig: {
        extra: {
          appEnv: "qa",
          apiBaseUrl: "https://api.qa.customcard.test",
          clerkPublishableKey: "pk_test_customcard",
          oauthRedirectUrl: "customcard://sso-callback",
          realOrderKillSwitch: "disabled"
        }
      }
    });

    expect(
      runMobileNativeInstallProof({
        env: {
          CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF: "enabled",
          CUSTOMCARD_MOBILE_APP_BUNDLE_PATH: appPath
        },
        now
      })
    ).toMatchObject({
      status: "ready",
      missingCurrentSignals: [],
      presentStaleSignals: [],
      appConfig: {
        present: true,
        appEnv: "qa",
        apiBaseUrlConfigured: true,
        clerkPublishableKeyKind: "test",
        oauthRedirectConfigured: true,
        realOrderKillSwitch: "disabled"
      },
      blockers: []
    });
  });

  it("accepts an exported native JS bundle with a separate Expo config proof", () => {
    const root = mkdtempSync(join(tmpdir(), "customcard-exported-native-proof-"));
    const mainBundlePath = join(root, "main.jsbundle");
    const appConfigPath = join(root, "app.config.json");
    writeFileSync(
      mainBundlePath,
      [
        "print through your preferred print shop",
        "Finish at a print shop",
        "Draft again",
        "The card assistant",
        "secure Google Calendar connection is still pending"
      ].join("\n")
    );
    writeFileSync(
      appConfigPath,
      `${JSON.stringify({
        expo: {
          extra: {
            appEnv: "qa",
            apiBaseUrl: "https://api.qa.customcard.test",
            clerkPublishableKey: "pk_test_customcard",
            oauthRedirectUrl: "customcard://sso-callback",
            realOrderKillSwitch: "disabled"
          }
        }
      })}\n`
    );

    expect(
      runMobileNativeInstallProof({
        env: {
          CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF: "enabled",
          CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH: mainBundlePath,
          CUSTOMCARD_MOBILE_APP_CONFIG_PATH: appConfigPath
        },
        now
      })
    ).toMatchObject({
      status: "ready",
      bundle: {
        mainBundlePathConfigured: true,
        appConfigPathConfigured: true,
        bundlePathResolved: false,
        mainBundleFound: true
      },
      appConfig: {
        present: true,
        appEnv: "qa",
        apiBaseUrlConfigured: true,
        clerkPublishableKeyKind: "test",
        oauthRedirectConfigured: true,
        realOrderKillSwitch: "disabled"
      },
      missingCurrentSignals: [],
      presentStaleSignals: [],
      blockers: []
    });
  });

  it("requires production native bundles to use a live Clerk publishable key", () => {
    const appPath = createNativeAppBundle({
      mainBundleText: [
        "print through your preferred print shop",
        "Finish at a print shop",
        "Draft again",
        "The card assistant",
        "secure Google Calendar connection is still pending"
      ].join("\n"),
      appConfig: {
        extra: {
          appEnv: "prod",
          apiBaseUrl: "https://api.customcard.test",
          clerkPublishableKey: "pk_test_customcard",
          oauthRedirectUrl: "customcard://sso-callback",
          realOrderKillSwitch: "disabled"
        }
      }
    });

    const report = runMobileNativeInstallProof({
      env: {
        CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF: "enabled",
        CUSTOMCARD_MOBILE_APP_BUNDLE_PATH: appPath
      },
      now
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toContain("Production native bundle must use a live Clerk publishable key.");
  });
});

function createNativeAppBundle({
  mainBundleText,
  appConfig
}: {
  mainBundleText: string;
  appConfig: unknown;
}): string {
  const appPath = mkdtempSync(join(tmpdir(), "customcard-native-install-proof-"));
  mkdirSync(join(appPath, "EXConstants.bundle"), { recursive: true });
  writeFileSync(join(appPath, "main.jsbundle"), mainBundleText);
  writeFileSync(join(appPath, "EXConstants.bundle", "app.config"), `${JSON.stringify(appConfig)}\n`);

  expect(readFileSync(join(appPath, "main.jsbundle"), "utf8")).toBe(mainBundleText);
  return appPath;
}
