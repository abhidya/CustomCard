import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";

const chromePath = resolveChromePath();
const describeWithChrome = existsSync(chromePath) ? describe : describe.skip;

interface PendingCommand {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface EventWaiter {
  method: string;
  sessionId?: string;
  resolve: (message: any) => void;
}

describeWithChrome("CustomCard UI smoke", () => {
  let server: ViteDevServer;
  let baseUrl: string;
  let chrome: ChildProcess | undefined;
  let chromeStartupLog = "";
  let userDataDir: string | undefined;
  let ws: WebSocket | undefined;
  let nextId = 1;
  const pending = new Map<number, PendingCommand>();
  const eventWaiters: EventWaiter[] = [];
  const browserConsoleErrors: string[] = [];
  const debuggingPort = 9400 + Math.floor(Math.random() * 500);

  beforeAll(async () => {
    server = await createServer({
      root: process.cwd(),
      logLevel: "error",
      server: {
        host: "127.0.0.1",
        port: 5200 + Math.floor(Math.random() * 500),
        strictPort: false
      }
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("Unable to determine Vite server address");
    baseUrl = `http://127.0.0.1:${address.port}/`;

    userDataDir = mkdtempSync(join(tmpdir(), "customcard-ui-smoke-"));
    chrome = spawn(
      chromePath,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--remote-debugging-address=127.0.0.1",
        `--remote-debugging-port=${debuggingPort}`,
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--disable-extensions",
        "about:blank"
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    chrome.stderr?.on("data", (chunk) => {
      chromeStartupLog = `${chromeStartupLog}${String(chunk)}`.slice(-4000);
    });

    const version = await waitForDebuggingVersion(debuggingPort, chrome, () => chromeStartupLog);
    ws = new WebSocket(version.webSocketDebuggerUrl);
    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && pending.has(message.id)) {
        const command = pending.get(message.id);
        pending.delete(message.id);
        if (!command) return;
        if (message.error) command.reject(new Error(message.error.message));
        else command.resolve(message.result);
      }

      if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
        browserConsoleErrors.push(formatRuntimeArgs(message.params.args));
      }

      if (message.method === "Runtime.exceptionThrown") {
        browserConsoleErrors.push(message.params?.exceptionDetails?.text ?? "Browser runtime exception");
      }

      for (let index = eventWaiters.length - 1; index >= 0; index -= 1) {
        const waiter = eventWaiters[index];
        if (waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
          eventWaiters.splice(index, 1);
          waiter.resolve(message);
        }
      }
    };
    await new Promise<void>((resolve, reject) => {
      ws!.onopen = () => resolve();
      ws!.onerror = () => reject(new Error("Chrome debugging WebSocket failed"));
    });
  }, 45000);

  afterEach(() => {
    const errors = browserConsoleErrors.splice(0);
    expect(errors).toEqual([]);
  });

  afterAll(async () => {
    if (ws) await send("Browser.close").catch(() => undefined);
    ws?.close();
    await waitForChromeExit(chrome);
    await server?.close();
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
  });

  it("runs the customer-first create-to-print flow", async () => {
    const sessionId = await createPage(1280, 900);
    const result = await evaluate(
      sessionId,
      `(async () => {
        const raf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const clickByText = async (label) => {
          const target = [...document.querySelectorAll("button, a")].find((node) => node.textContent?.includes(label));
          if (!target) throw new Error("Missing clickable text: " + label);
          target.click();
          await raf();
        };
        const setValue = (node, value) => {
          const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value");
          descriptor.set.call(node, value);
          node.dispatchEvent(new Event("input", { bubbles: true }));
        };

        const homeText = document.body.textContent;
        await clickByText("Anniversary");
        const studioHeading = document.querySelector("h1")?.textContent;
        const recipient = [...document.querySelectorAll("input")].find((node) => node.placeholder === "Their name");
        const sender = [...document.querySelectorAll("input")].find((node) => node.placeholder === "Your name");
        if (!recipient || !sender) throw new Error("Missing studio name fields");
        setValue(recipient, "Sara and Ahmed");
        setValue(sender, "Abdul");
        await raf();
        const preDraftDock = !!document.querySelector(".ctadock");
        const preDraftProofCta = [...document.querySelectorAll("button, a")].some((node) =>
          node.textContent?.includes("Continue to proof checks")
        );
        await clickByText("Review template instead");
        const panelCount = document.querySelectorAll(".pagetab img").length;
        const objectFaceCount = document.querySelectorAll(".studioObject-face").length;
        const generationTargetCount = document.querySelectorAll(".generationTarget").length;
        const generateWholeButton = [...document.querySelectorAll("button")].find((node) =>
          node.textContent?.includes("Generate whole card")
        );
        const improveSelectedButton = [...document.querySelectorAll("button")].find((node) =>
          node.textContent?.includes("Improve 1 selected face")
        );
        const regeneratePanelButton = [...document.querySelectorAll("button")].find((node) =>
          node.textContent?.includes("Regenerate this panel")
        );
        const studioObjectText = document.querySelector(".studioObject")?.textContent;
        const generationScopeText = document.querySelector(".generationScope")?.textContent;
        await clickByText("Continue to proof checks");
        const printCtaDock = !!document.querySelector(".ctadock");
        const proofInputs = [...document.querySelectorAll(".proofcheck input")];
        proofInputs.forEach((node) => node.click());
        await raf();
        const checkoutButton = [...document.querySelectorAll("button")].find((node) =>
          node.textContent?.includes("Download print package")
        );

        return {
          homeText,
          studioHeading,
          preDraftDock,
          preDraftProofCta,
          panelCount,
          objectFaceCount,
          generationTargetCount,
          generateWholeDisabledSignedOut: generateWholeButton ? generateWholeButton.disabled : false,
          improveSelectedDisabledSignedOut: improveSelectedButton ? improveSelectedButton.disabled : false,
          regeneratePanelDisabledSignedOut: regeneratePanelButton ? regeneratePanelButton.disabled : false,
          studioObjectText,
          generationScopeText,
          checkoutButtonEnabledAfterApproval: checkoutButton ? !checkoutButton.disabled : false,
          printHeading: document.querySelector("h1")?.textContent,
          printCtaDock,
          printText: document.body.textContent,
          proofProgress: document.querySelector(".proofprogress")?.textContent,
          downloadButtons: [...document.querySelectorAll("button")].map((node) => node.textContent),
          checkoutInputs: [...document.querySelectorAll(".checkoutgrid input")].length,
          storeSteps: document.querySelectorAll(".storestep").length,
          adminRows: document.querySelectorAll(".adminHeroCard, .adapterRow").length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.homeText).toContain("Make the card you meant to send.");
    expect(result.homeText).toContain("Pick the occasion");
    expect(result.homeText).not.toContain("Admin panel");
    expect(result.homeText).not.toContain("Adapter readiness");
    expect(result.studioHeading).toBe("Your card, their story");
    expect(result.preDraftDock).toBe(false);
    expect(result.preDraftProofCta).toBe(false);
    expect(result.panelCount).toBe(4);
    expect(result.objectFaceCount).toBe(4);
    expect(result.generationTargetCount).toBe(4);
    expect(result.generateWholeDisabledSignedOut).toBe(true);
    expect(result.improveSelectedDisabledSignedOut).toBe(true);
    expect(result.regeneratePanelDisabledSignedOut).toBe(true);
    expect(result.studioObjectText).toContain("Folded card object");
    expect(result.generationScopeText).toContain("Choose what to improve");
    expect(result.generationScopeText).toContain("Current proof");
    expect(result.printHeading).toBe("Finish at a print shop");
    expect(result.printText).toContain("Print-shop details");
    expect(result.printText).toContain("Save print package");
    expect(result.printText).toContain("Download print package");
    expect(result.printText).toContain("Approve your proof");
    expect(result.printText).toContain("I approve this proof for printing");
    expect(result.printText).toContain("Print-shop package");
    expect(result.printText).toContain("You pay the print shop directly");
    expect(result.printCtaDock).toBe(false);
    expect(result.proofProgress).toContain("Proof approved");
    expect(result.checkoutButtonEnabledAfterApproval).toBe(true);
    expect(result.printText).not.toContain("Manual fallback");
    expect(result.printText).not.toContain("CVS");
    expect(result.printText).not.toContain("FedEx Office");
    expect(result.printText).not.toContain("Staples");
    expect(result.downloadButtons.join(" ")).toContain("Save print package");
    expect(result.downloadButtons.join(" ")).toContain("Save upload panels");
    expect(result.downloadButtons.join(" ")).toContain("Copy steps");
    expect(result.checkoutInputs).toBe(0);
    expect(result.storeSteps).toBe(0);
    expect(result.adminRows).toBe(0);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("turns an invite into a card without exposing admin surfaces", async () => {
    const sessionId = await createPage(1280, 900, "?view=opportunities");
    const result = await evaluate(
      sessionId,
      `(async () => {
        const raf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const setValue = (node, value) => {
          const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value");
          descriptor.set.call(node, value);
          node.dispatchEvent(new Event("input", { bubbles: true }));
        };
        const clickByText = async (label) => {
          const target = [...document.querySelectorAll("button")].find((node) => node.textContent?.includes(label));
          if (!target) throw new Error("Missing button: " + label);
          target.click();
          await raf();
        };

        const textarea = document.querySelector("textarea");
        if (!textarea) throw new Error("Missing invite textarea");
        setValue(textarea, [
          "BEGIN:VCALENDAR",
          "SUMMARY:Sara and Ahmed anniversary dinner",
          "DTSTART;VALUE=DATE:20260712",
          "LOCATION:Brooklyn, NY",
          "DESCRIPTION:Ten year anniversary. Sara loves botanical cards.",
          "END:VCALENDAR"
        ].join("\\n"));
        await raf();
        const eventText = document.body.textContent;
        const googleCalendar = [...document.querySelectorAll("button")].find((node) => node.textContent?.includes("Google Calendar"));
        await clickByText("Make this card");
        return {
          eventText,
          googleCalendarDisabled: googleCalendar?.disabled,
          studioText: document.body.textContent,
          heading: document.querySelector("h1")?.textContent,
          adminRows: document.querySelectorAll(".adminHeroCard, .adapterRow").length
        };
      })()`
    );

    expect(result.eventText).toContain("Anniversary card for Sara and Ahmed");
    expect(result.eventText).toContain("Reads event titles and dates only");
    expect(result.googleCalendarDisabled).toBe(false);
    expect(result.eventText).toContain("Brooklyn, NY");
    expect(result.heading).toBe("Your card, their story");
    expect(result.studioText).toContain("Sara and Ahmed");
    expect(result.adminRows).toBe(0);
  }, 30000);

  it("surfaces Google Calendar callback imports as reviewable evidence", async () => {
    const sessionId = await createPage(1280, 900);
    const loaded = waitEvent("Page.loadEventFired", sessionId, 10000).catch(() => undefined);
    await send("Page.navigate", { url: new URL("?calendarConnection=connected&calendarImported=4", baseUrl).toString() }, sessionId);
    await loaded;
    const result = await evaluate(
      sessionId,
      `(async () => {
        const raf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await raf();
          if (document.body.textContent?.includes("imported from Google Calendar")) break;
        }
        return {
          h1: document.querySelector("h1")?.textContent,
          text: document.body.textContent,
          evidence: [...document.querySelectorAll(".oppEvidence li")].map((node) => node.textContent),
          buttons: [...document.querySelectorAll("button")].map((node) => node.textContent?.trim()).filter(Boolean),
          search: window.location.search
        };
      })()`
    );

    expect(result.h1).toBe("Never miss a moment");
    // Success is announced as a status message; the paste box is never overwritten
    // with system text, and no dev vocabulary ("read-only event metadata") leaks.
    expect(result.text).toContain("4 events imported from Google Calendar — review them below.");
    expect(result.text).not.toContain("read-only event metadata");
    expect(result.search).toBe("?view=opportunities");
  }, 30000);

  it("keeps the customer shell labeled and mobile-width safe", async () => {
    const sessionId = await createPage(390, 900);
    const result = await evaluate(
      sessionId,
      `(() => {
        const accessibleName = (node) =>
          node.getAttribute("aria-label") ||
          node.getAttribute("title") ||
          node.getAttribute("placeholder") ||
          node.textContent?.trim() ||
          node.getAttribute("value") ||
          "";
        const rect = (selector) => {
          const node = document.querySelector(selector);
          if (!node) return undefined;
          const bounds = node.getBoundingClientRect();
          return {
            bottom: Math.round(bounds.bottom),
            height: Math.round(bounds.height),
            y: Math.round(bounds.y)
          };
        };
        const controls = [...document.querySelectorAll("a[href], button, input, textarea, select")]
          .filter((node) => !node.disabled && node.getAttribute("aria-hidden") !== "true")
          .map((node) => ({ tag: node.tagName.toLowerCase(), name: accessibleName(node) }));
        return {
          h1: document.querySelector("h1")?.textContent,
          skipHref: document.querySelector(".skipLink")?.getAttribute("href"),
          skipTargetExists: !!document.querySelector("#main-content"),
          customerNavHidden: !document.querySelector('[aria-label="CustomCard navigation"]'),
          bottomNavText: document.querySelector(".bottomnav")?.textContent,
          heroActions: rect(".landingHeroActions"),
          bottomNav: rect(".bottomnav"),
          pathChooser: rect(".pathchooser"),
          missingNames: controls.filter((control) => !control.name.trim()),
          bodyScrollWidth: document.body.scrollWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.h1).toContain("Make the card");
    expect(result.skipHref).toBe("#main-content");
    expect(result.skipTargetExists).toBe(true);
    expect(result.customerNavHidden).toBe(true);
    expect(result.bottomNavText).toContain("Create");
    expect(result.bottomNavText).toContain("My cards");
    expect(result.heroActions.bottom).toBeLessThan(result.bottomNav.y);
    expect(result.pathChooser.y).toBeLessThan(result.bottomNav.y);
    expect(result.missingNames).toEqual([]);
    expect(result.bodyScrollWidth).toBe(result.clientWidth);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("moves legal readiness under admin and exposes policy docs in the footer", async () => {
    const sessionId = await createPage(390, 900, "?view=legal");
    const result = await evaluate(
      sessionId,
      `(() => ({
        h1: document.querySelector("h1")?.textContent,
        text: document.body.textContent,
        footerText: document.querySelector(".appFooter")?.textContent,
        legalCards: document.querySelectorAll(".requirementCard").length,
        freeTools: document.querySelectorAll(".freeToolCard").length,
        policyLinks: document.querySelectorAll(".legalLinkCard").length,
        footerLinks: [...document.querySelectorAll(".appFooter a")].map((node) => ({
          text: node.textContent,
          href: node.getAttribute("href")
        })),
        ctaDock: !!document.querySelector(".ctadock"),
        activeNav: [...document.querySelectorAll(".navlink")]
          .filter((node) => node.getAttribute("data-active") === "true")
          .map((node) => node.textContent),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }))()`
    );

    expect(result.h1).toBe("Legal docs");
    expect(result.text).toContain("Private operations");
    expect(result.text).toMatch(/Sign in required|Checking account access|Admin access required/);
    expect(result.footerText).not.toMatch(/generated/i);
    expect(result.footerText).not.toContain("Drafted for CustomCard");
    expect(result.legalCards).toBe(0);
    expect(result.freeTools).toBe(0);
    expect(result.policyLinks).toBe(0);
    expect(result.footerLinks).toEqual([
      { text: "Terms", href: "/legal/docs.html#terms" },
      { text: "Privacy", href: "/legal/docs.html#privacy" },
      { text: "Cookies", href: "/legal/docs.html#cookies" },
      { text: "Refunds", href: "/legal/docs.html#refunds" },
      { text: "AI disclosure", href: "/legal/docs.html#ai-disclosure" },
      { text: "Privacy choices", href: "/legal/docs.html#privacy-choices" }
    ]);
    expect(result.ctaDock).toBe(false);
    expect(result.activeNav).toEqual([]);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("gates the admin panel behind authenticated admin access", async () => {
    const sessionId = await createPage(1280, 900, "?view=admin");
    const result = await evaluate(
      sessionId,
      `(() => ({
        h1: document.querySelector("h1")?.textContent,
        text: document.body.textContent,
        adminCards: document.querySelectorAll(".adminHeroCard").length,
        adapterRows: document.querySelectorAll(".adapterRow").length,
        signInButtons: [...document.querySelectorAll("button")].filter((node) => node.textContent?.includes("Sign in")).length,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }))()`
    );

    expect(result.h1).toBe("Admin panel");
    expect(result.text).toContain("Private operations");
    expect(result.text).toMatch(/Sign in required|Checking account access|Admin access required/);
    expect(result.text).toMatch(/Checking your account|This area is for CustomCard staff/);
    expect(result.text).not.toContain("Integration owner workflow");
    expect(result.text).not.toContain("Required env");
    expect(result.adminCards).toBe(0);
    expect(result.adapterRows).toBe(0);
    if (result.text.includes("Checking account access")) {
      expect(result.signInButtons).toBe(0);
    } else {
      expect(result.signInButtons).toBeGreaterThanOrEqual(1);
    }
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("does not expose a standalone adapter readiness route", async () => {
    const sessionId = await createPage(1280, 900, "?view=adapters");
    const result = await evaluate(
      sessionId,
      `(() => ({
        h1: document.querySelector("h1")?.textContent,
        text: document.body.textContent,
        adapterRows: document.querySelectorAll(".adapterRow").length,
        adminCards: document.querySelectorAll(".adminHeroCard").length,
        navAdminLinks: [...document.querySelectorAll(".navlink-admin")].map((node) => node.textContent),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }))()`
    );

    expect(result.h1).not.toBe("Adapters");
    expect(result.text).toContain("Make the card you meant to send.");
    expect(result.text).not.toContain("Private operations");
    expect(result.text).not.toMatch(/Sign in required|Checking account access|Admin access required/);
    expect(result.text).not.toContain("Local workspace auth");
    expect(result.text).not.toContain("Dry run: blocked by gates");
    expect(result.adapterRows).toBe(0);
    expect(result.adminCards).toBe(0);
    expect(result.navAdminLinks).toEqual([]);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  async function createPage(width: number, height: number, path = ""): Promise<string> {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send(
      "Emulation.setDeviceMetricsOverride",
      { width, height, deviceScaleFactor: 1, mobile: width < 600 },
      sessionId
    );
    const loaded = waitEvent("Page.loadEventFired", sessionId, 10000).catch(() => undefined);
    await send("Page.navigate", { url: new URL(path, baseUrl).toString() }, sessionId);
    await loaded;
    await evaluate(sessionId, "new Promise((resolve) => requestAnimationFrame(() => resolve(true)))");
    await evaluate(sessionId, "localStorage.clear(); true");
    const reloaded = waitEvent("Page.loadEventFired", sessionId, 10000).catch(() => undefined);
    await send("Page.reload", {}, sessionId);
    await reloaded;
    await evaluate(sessionId, "new Promise((resolve) => requestAnimationFrame(() => resolve(true)))");
    return sessionId;
  }

  async function evaluate(sessionId: string, expression: string): Promise<any> {
    const result = await send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId
    );
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  function send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Chrome debugging WebSocket is not open"));
    }
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function waitEvent(method: string, sessionId?: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const waiter: EventWaiter = {
        method,
        sessionId,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        }
      };
      const timer = setTimeout(() => {
        const index = eventWaiters.indexOf(waiter);
        if (index !== -1) eventWaiters.splice(index, 1);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      eventWaiters.push(waiter);
    });
  }
});

function formatRuntimeArgs(args: any[] = []): string {
  return args
    .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "")
    .filter(Boolean)
    .join(" ");
}

async function waitForDebuggingVersion(
  port: number,
  chrome?: ChildProcess,
  getChromeLog: () => string = () => ""
): Promise<{ webSocketDebuggerUrl: string }> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json() as Promise<{ webSocketDebuggerUrl: string }>;
    } catch {
      // Chrome is still starting.
    }
    if (chrome && (chrome.exitCode !== null || chrome.signalCode !== null)) {
      throw new Error(`Chrome exited before debugging port opened.${formatChromeLog(getChromeLog())}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chrome debugging port did not open.${formatChromeLog(getChromeLog())}`);
}

function resolveChromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    findExecutable("google-chrome"),
    findExecutable("google-chrome-stable"),
    findExecutable("chromium"),
    findExecutable("chromium-browser")
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate)) ?? "__chrome_not_found__";
}

function findExecutable(command: string): string | undefined {
  try {
    return execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return undefined;
  }
}

async function waitForChromeExit(chrome: ChildProcess | undefined): Promise<void> {
  if (!chrome || chrome.exitCode !== null || chrome.signalCode !== null) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      chrome.kill("SIGTERM");
      resolve();
    }, 1500);
    chrome.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function formatChromeLog(log: string): string {
  const trimmed = log.trim();
  return trimmed ? ` Chrome stderr: ${trimmed}` : "";
}
