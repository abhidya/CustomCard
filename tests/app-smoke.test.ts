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
        const panelCount = document.querySelectorAll(".pagetab img").length;
        await clickByText("Continue to print");

        return {
          homeText,
          studioHeading,
          panelCount,
          printHeading: document.querySelector("h1")?.textContent,
          printText: document.body.textContent,
          downloadButtons: [...document.querySelectorAll("button")].map((node) => node.textContent),
          checkoutInputs: [...document.querySelectorAll(".checkoutgrid input")].length,
          storeSteps: document.querySelectorAll(".storestep").length,
          adminRows: document.querySelectorAll(".adminHeroCard, .adapterRow").length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.homeText).toContain("Make someone");
    expect(result.homeText).toContain("Pick the occasion");
    expect(result.homeText).not.toContain("Admin panel");
    expect(result.homeText).not.toContain("Adapter readiness");
    expect(result.studioHeading).toBe("Your card, their story");
    expect(result.panelCount).toBe(4);
    expect(result.printHeading).toBe("Checkout at Walgreens");
    expect(result.printText).toContain("Walgreens partner checkout");
    expect(result.printText).toContain("Save your card files");
    expect(result.printText).toContain("Walgreens checkout");
    expect(result.printText).toContain("Continue to Walgreens");
    expect(result.printText).toContain("Walgreens handles payment");
    expect(result.printText).not.toContain("Manual fallback");
    expect(result.printText).not.toContain("CVS");
    expect(result.printText).not.toContain("FedEx Office");
    expect(result.printText).not.toContain("Walmart");
    expect(result.printText).not.toContain("Staples");
    expect(result.downloadButtons.join(" ")).toContain("Save print package");
    expect(result.checkoutInputs).toBe(4);
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
        await clickByText("Start this card");
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
    expect(result.eventText).toContain("We check server readiness first");
    expect(result.googleCalendarDisabled).toBe(false);
    expect(result.eventText).toContain("Brooklyn, NY");
    expect(result.heading).toBe("Your card, their story");
    expect(result.studioText).toContain("Sara and Ahmed");
    expect(result.adminRows).toBe(0);
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
        const controls = [...document.querySelectorAll("a[href], button, input, textarea, select")]
          .filter((node) => !node.disabled && node.getAttribute("aria-hidden") !== "true")
          .map((node) => ({ tag: node.tagName.toLowerCase(), name: accessibleName(node) }));
        return {
          h1: document.querySelector("h1")?.textContent,
          skipHref: document.querySelector(".skipLink")?.getAttribute("href"),
          skipTargetExists: !!document.querySelector("#main-content"),
          navLabeled: !!document.querySelector('[aria-label="CustomCard navigation"]'),
          missingNames: controls.filter((control) => !control.name.trim()),
          bodyScrollWidth: document.body.scrollWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.h1).toContain("Make someone");
    expect(result.skipHref).toBe("#main-content");
    expect(result.skipTargetExists).toBe(true);
    expect(result.navLabeled).toBe(true);
    expect(result.missingNames).toEqual([]);
    expect(result.bodyScrollWidth).toBe(result.clientWidth);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("shows the free EU and US legal requirements without checkout chrome", async () => {
    const sessionId = await createPage(390, 900, "?view=legal");
    const result = await evaluate(
      sessionId,
      `(() => ({
        h1: document.querySelector("h1")?.textContent,
        text: document.body.textContent,
        legalCards: document.querySelectorAll(".requirementCard").length,
        freeTools: document.querySelectorAll(".freeToolCard").length,
        policyLinks: document.querySelectorAll(".legalLinkCard").length,
        ctaDock: !!document.querySelector(".ctadock"),
        activeNav: [...document.querySelectorAll(".navlink")]
          .filter((node) => node.getAttribute("data-active") === "true")
          .map((node) => node.textContent),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }))()`
    );

    expect(result.h1).toBe("EU and US requirements");
    expect(result.text).toContain("Free generators and consent tools");
    expect(result.text).toContain("GDPR privacy notice");
    expect(result.text).toContain("FTC privacy and security");
    expect(result.text).toContain("Termly Basic");
    expect(result.legalCards).toBe(12);
    expect(result.freeTools).toBeGreaterThanOrEqual(6);
    expect(result.policyLinks).toBe(6);
    expect(result.ctaDock).toBe(false);
    expect(result.activeNav).toEqual(["Legal"]);
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
    expect(result.text).toContain("Sign in with a CustomCard admin account");
    expect(result.text).not.toContain("Integration owner workflow");
    expect(result.text).not.toContain("Required env");
    expect(result.adminCards).toBe(0);
    expect(result.adapterRows).toBe(0);
    expect(result.signInButtons).toBeGreaterThanOrEqual(1);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("gates adapter readiness behind authenticated admin access", async () => {
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

    expect(result.h1).toBe("Adapters");
    expect(result.text).toContain("Private operations");
    expect(result.text).toMatch(/Sign in required|Checking account access|Admin access required/);
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
