import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  mobileChatTranscript,
  mobileExperienceSections,
  mobileHandoffSteps,
  mobileRenderChoices,
  requiredMobileCapabilities,
  summarizeMobileExperience,
  validateMobileExperience
} from "../apps/mobile/src/customerExperience";

describe("mobile customer experience contract", () => {
  it("covers the required customer app capabilities with visible sections", () => {
    const summary = summarizeMobileExperience();

    expect(validateMobileExperience()).toEqual([]);
    expect(summary.capabilityCount).toBe(requiredMobileCapabilities.length);
    expect(summary.customerVisibleSections).toBe(requiredMobileCapabilities.length);
    expect(mobileExperienceSections.map((section) => section.id)).toEqual(
      expect.arrayContaining(requiredMobileCapabilities)
    );
  });

  it("keeps mobile chat, render, and handoff paths local or gated", () => {
    expect(mobileChatTranscript.map((message) => message.text).join(" ")).toContain(
      "Live AI and vendor orders stay off"
    );
    expect(mobileRenderChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Browser SVG renderer", mode: "free-local" }),
        expect.objectContaining({ label: "AI image providers", mode: "credential-gated" })
      ])
    );
    expect(mobileHandoffSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Download SVG set", realOrderState: "manual" }),
        expect.objectContaining({ label: "Confirm pickup manually", realOrderState: "disabled" })
      ])
    );
  });

  it("passes the mobile doctor with env configuration and fails if real orders are enabled", () => {
    const validOutput = execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
      encoding: "utf8",
      env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "disabled" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(validOutput).toContain("customer experience contract");

    let stderr = "";
    try {
      execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
        encoding: "utf8",
        env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "enabled" },
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      stderr = String((error as { stderr?: string }).stderr);
    }
    expect(stderr).toContain("kill switch must resolve to disabled");
  });
});
