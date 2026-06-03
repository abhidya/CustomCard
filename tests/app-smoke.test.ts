import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
    if (!address || typeof address === "string") {
      throw new Error("Unable to determine Vite server address");
    }
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

      for (let index = eventWaiters.length - 1; index >= 0; index -= 1) {
        const waiter = eventWaiters[index];
        if (waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
          eventWaiters.splice(index, 1);
          waiter.resolve(message);
        }
      }
    };
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Chrome debugging WebSocket failed"));
    });
  }, 45000);

  afterAll(async () => {
    if (ws) {
      await send("Browser.close").catch(() => undefined);
    }
    ws?.close();
    await waitForChromeExit(chrome);
    await server?.close();
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
    }
  });

  it("runs local auth, free import, card studio, and manual handoff", async () => {
    const sessionId = await createPage(1280, 900);
    const result = await evaluate(
      sessionId,
      `(async () => {
        const clickByText = async (label) => {
          const button = [...document.querySelectorAll("button")].find((node) =>
            node.textContent.includes(label)
          );
          if (!button) throw new Error("Missing button: " + label);
          button.click();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        };

        await clickByText("Start local workspace");
        await clickByText("Opportunities");
        await clickByText("Scan free import");
        const opportunityText = document.body.textContent;
        await clickByText("Generate card");
        const studioText = document.body.textContent;
        const panelCount = document.querySelectorAll(".panelPreview").length;
        const validationRows = [...document.querySelectorAll(".validationPanel span")].map((node) => node.textContent);
        await clickByText("Prepare handoff");
        return {
          h1: document.querySelector("h1")?.textContent,
          opportunityText,
          studioText,
          panelCount,
          validationRows,
          handoffText: document.body.textContent,
          downloadTiles: document.querySelectorAll(".downloadTile").length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.h1).toBe("CustomCard");
    expect(result.opportunityText).toContain("Signed in locally");
    expect(result.opportunityText).toContain("Anniversary card for Sara and Ahmed");
    expect(result.studioText).toContain("Card draft");
    expect(result.panelCount).toBe(4);
    expect(result.validationRows.join(" ")).toContain("5x7 print size");
    expect(result.validationRows.join(" ")).toContain("Paid APIs");
    expect(result.handoffText).toContain("Manual handoff");
    expect(result.handoffText).toContain("Download SVG set");
    expect(result.handoffText).toContain("Download print package");
    expect(result.handoffText).toContain("local print package");
    expect(result.handoffText).toContain("Preflight passed");
    expect(result.handoffText).toContain("Real orders disabled");
    expect(result.handoffText).toContain("No live vendor quote or order API is connected.");
    expect(result.handoffText).toContain("review-only public pricing");
    expect(result.handoffText).toContain("Sources");
    expect(result.handoffText).toContain("Max age");
    expect(result.handoffText).toContain("not live quotes");
    expect(result.downloadTiles).toBe(4);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("keeps the mobile first viewport from overflowing horizontally", async () => {
    const sessionId = await createPage(390, 900);
    const layout = await evaluate(
      sessionId,
      `(() => ({
        h1: document.querySelector("h1")?.textContent,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth
      }))()`
    );

    expect(layout.h1).toBe("CustomCard");
    expect(layout.bodyScrollWidth).toBe(layout.clientWidth);
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(layout.bodyScrollWidth).toBe(layout.clientWidth);
  }, 30000);

  it("exposes customer and admin panels without overflow", async () => {
    const sessionId = await createPage(1280, 900);
    const result = await evaluate(
      sessionId,
      `(async () => {
        const clickByText = async (label) => {
          const button = [...document.querySelectorAll("button")].find((node) =>
            node.textContent.includes(label)
          );
          if (!button) throw new Error("Missing button: " + label);
          button.click();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        };

        const customerText = document.body.textContent;
        const quickActions = document.querySelectorAll(".quickAction").length;
        const chatBubbles = document.querySelectorAll(".chatBubble").length;
        await clickByText("Admin panel");
        return {
          customerText,
          quickActions,
          chatBubbles,
          adminText: document.body.textContent,
          metricCount: document.querySelectorAll(".adminSummaryGrid .metric").length,
          gatedRows: document.querySelectorAll(".adapterMini.credential-gated").length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.customerText).toContain("Customer panel");
    expect(result.customerText).toContain("Text interface");
    expect(result.customerText).toContain("Render choices");
    expect(result.customerText).toContain("Manual vendor handoff");
    expect(result.customerText).toContain("Language readiness");
    expect(result.customerText).toContain("Production safety");
    expect(result.customerText).toContain("Ar EG");
    expect(result.quickActions).toBeGreaterThanOrEqual(5);
    expect(result.chatBubbles).toBeGreaterThanOrEqual(4);
    expect(result.adminText).toContain("Admin panel");
    expect(result.adminText).toContain("Required env");
    expect(result.adminText).toContain("No-network readiness");
    expect(result.adminText).toContain("Provider governance");
    expect(result.adminText).toContain("Locale readiness");
    expect(result.adminText).toContain("Launch gates");
    expect(result.adminText).toContain("AI provider readiness");
    expect(result.adminText).toContain("Live AI off");
    expect(result.adminText).toContain("Prompt audits");
    expect(result.adminText).toContain("External audit readiness");
    expect(result.adminText).toContain("End-to-end coverage");
    expect(result.adminText).toContain("CRM and workflow integrations");
    expect(result.adminText).toContain("Capacity profiles");
    expect(result.adminText).toContain("Cheap droplet");
    expect(result.adminText).toContain("SaaS scale");
    expect(result.adminText).toContain("Queue-backed profiles");
    expect(result.adminText).toContain("Live calls");
    expect(result.adminText).toContain("Production user auth");
    expect(result.adminText).toContain("Live payment charges and refunds");
    expect(result.adminText).toContain("Vercel deployment and DB access");
    expect(result.adminText).toContain("Physical print certification");
    expect(result.adminText).toContain("External security assessment");
    expect(result.adminText).toContain("Public claims");
    expect(result.adminText).toContain("Customer workspace to manual handoff");
    expect(result.adminText).toContain("Postgres HTTP integration workflow");
    expect(result.adminText).toContain("Live proofs");
    expect(result.adminText).toContain("RTL review");
    expect(result.adminText).toContain("Budget capped");
    expect(result.adminText).toContain("Credential gaps");
    expect(result.adminText).toContain("OPENAI_API_KEY");
    expect(result.adminText).toContain("MISTRAL_API_KEY");
    expect(result.adminText).toContain("LEONARDO_API_KEY");
    expect(result.adminText).toContain("SALESFORCE_INSTANCE_URL");
    expect(result.adminText).toContain("HUBSPOT_PRIVATE_APP_TOKEN");
    expect(result.adminText).toContain("ZAPIER_WEBHOOK_URL");
    expect(result.adminText).toContain("Walgreens live order");
    expect(result.metricCount).toBeGreaterThanOrEqual(10);
    expect(result.gatedRows).toBeGreaterThanOrEqual(8);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  it("exposes ready free adapters and gated production integrations", async () => {
    const sessionId = await createPage(1280, 900);
    const result = await evaluate(
      sessionId,
      `(async () => {
        const adaptersButton = [...document.querySelectorAll("button")].find((node) =>
          node.textContent.includes("Adapters")
        );
        adaptersButton.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return {
          heading: document.querySelector("h2")?.textContent,
          text: document.body.textContent,
          readyRows: [...document.querySelectorAll(".adapterRow.ready-local")].length,
          gatedRows: [...document.querySelectorAll(".adapterRow.credential-gated")].length,
          contractRows: [...document.querySelectorAll(".adapterRow.contract-only")].length,
          blockedRows: [...document.querySelectorAll(".adapterRow.blocked")].length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.heading).toContain("Adapter readiness");
    expect(result.text).toContain("Local demo auth");
    expect(result.text).toContain("ICS / invite paste");
    expect(result.text).toContain("OpenAI Responses chat");
    expect(result.text).toContain("OpenAI Images");
    expect(result.text).toContain("Gmail metadata adapter");
    expect(result.text).toContain("Microsoft Graph calendar");
    expect(result.text).toContain("Salesforce CRM lifecycle sync");
    expect(result.text).toContain("HubSpot CRM lifecycle sync");
    expect(result.text).toContain("Zapier webhook workflow");
    expect(result.text).toContain("Google Sheets lifecycle sync");
    expect(result.text).toContain("Search adapters");
    expect(result.text).toContain("All capabilities");
    expect(result.text).toContain("Walgreens live order");
    expect(result.text).toContain("Public printer pricing research");
    expect(result.text).toContain("Local print package export");
    expect(result.text).toContain("Dry run: local fallback ready");
    expect(result.text).toContain("Dry run: blocked by gates");
    expect(result.text).toContain("missing OPENAI_API_KEY");
    expect(result.readyRows).toBeGreaterThanOrEqual(18);
    expect(result.gatedRows).toBeGreaterThanOrEqual(69);
    expect(result.contractRows).toBeGreaterThanOrEqual(6);
    expect(result.blockedRows).toBe(6);
    expect(result.scrollWidth).toBe(result.clientWidth);
  }, 30000);

  async function createPage(width: number, height: number): Promise<string> {
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
    await send("Page.navigate", { url: baseUrl }, sessionId);
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
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text);
    }
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
        if (index !== -1) {
          eventWaiters.splice(index, 1);
        }
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      eventWaiters.push(waiter);
    });
  }
});

async function waitForDebuggingVersion(
  port: number,
  chrome?: ChildProcess,
  getChromeLog: () => string = () => ""
): Promise<{ webSocketDebuggerUrl: string }> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return response.json() as Promise<{ webSocketDebuggerUrl: string }>;
      }
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
