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
  let userDataDir: string | undefined;
  let ws: WebSocket;
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
        `--remote-debugging-port=${debuggingPort}`,
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--disable-extensions",
        "about:blank"
      ],
      { stdio: "ignore" }
    );

    const version = await waitForDebuggingVersion(debuggingPort);
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
  }, 30000);

  afterAll(async () => {
    await send("Browser.close").catch(() => undefined);
    ws?.close();
    await waitForChromeExit(chrome);
    await server?.close();
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
    }
  });

  it("updates extraction facts and blocks weak input from fake print success", async () => {
    const sessionId = await createPage(1280, 900);
    const result = await evaluate(
      sessionId,
      `(async () => {
        const runExtraction = async (text) => {
          const textarea = document.querySelector("textarea");
          const button = [...document.querySelectorAll("button")].find((node) =>
            node.textContent.includes("Run extraction")
          );
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
          setter.call(textarea, text);
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const operationalRun = [...document.querySelectorAll(".inspectorBlock")]
            .map((node) => node.textContent)
            .find((textContent) => textContent.includes("Operational run"));
          return {
            facts: [...document.querySelectorAll(".factCard strong")].map((node) => node.textContent),
            matchedCards: document.querySelectorAll(".storyFrame.matched").length,
            operationalRun
          };
        };
        return {
          rich: await runExtraction(
            "Sara and Ahmed wedding tomorrow. Walgreens pickup. 5x7 1500x2100 300 DPI. GDPR privacy and wrong store recovery."
          ),
          weak: await runExtraction("Please make something nice.")
        };
      })()`
    );

    expect(result.rich.facts).toEqual(
      expect.arrayContaining(["wedding", "Sara and Ahmed", "Walgreens", "5x7, 1500x2100, 300 DPI"])
    );
    expect(result.rich.matchedCards).toBeGreaterThan(0);
    expect(result.rich.operationalRun).toContain("5 facts");
    expect(result.rich.operationalRun).toContain("4 mock assets");
    expect(result.rich.operationalRun).toContain("mock_packet");

    expect(result.weak.facts).toEqual(["No strong product signal detected"]);
    expect(result.weak.matchedCards).toBe(0);
    expect(result.weak.operationalRun).toContain("1 facts");
    expect(result.weak.operationalRun).toContain("0 mock assets");
    expect(result.weak.operationalRun).toContain("blocked");
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

    expect(layout.h1).toBe("CustomCard service console");
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(layout.bodyScrollWidth).toBe(layout.clientWidth);
  }, 30000);

  it("exposes the executable service slice for imports, memory, recovery, and policy gates", async () => {
    const sessionId = await createPage(1280, 900);
    const result = await evaluate(
      sessionId,
      `(async () => {
        const serviceButton = [...document.querySelectorAll("button")].find((node) =>
          node.textContent.includes("Service slice")
        );
        serviceButton.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return {
          heading: document.querySelector("h2")?.textContent,
          text: document.body.textContent,
          readinessRows: document.querySelectorAll(".runtimePanel .qualityRow").length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`
    );

    expect(result.heading).toContain("Provider import, memory, lifecycle, recovery, and readiness");
    expect(result.text).toContain("Provider import");
    expect(result.text).toContain("Memory store");
    expect(result.text).toContain("switch to one-hour pickup");
    expect(result.text).toContain("US vendor_share: blocked");
    expect(result.readinessRows).toBeGreaterThanOrEqual(4);
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
    const loaded = waitEvent("Page.loadEventFired", sessionId, 10000);
    await send("Page.navigate", { url: baseUrl }, sessionId);
    await loaded.catch(() => undefined);
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
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function waitEvent(method: string, sessionId?: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      eventWaiters.push({
        method,
        sessionId,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        }
      });
    });
  }
});

async function waitForDebuggingVersion(port: number): Promise<{ webSocketDebuggerUrl: string }> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return response.json() as Promise<{ webSocketDebuggerUrl: string }>;
      }
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Chrome debugging port did not open");
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
