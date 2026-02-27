import { setTimeout as wait } from "timers/promises";
import WebSocket from "ws";

type Role = "tracker" | "tracked";

type TestConfig = {
  baseUrl: string;
  updates: number;
  intervalMs: number;
  thresholdMs: number;
  sessionId: string;
  settleMs: number;
  enforce: boolean;
};

type LocationUpdatedPayload = {
  lat: number;
  lng: number;
  zoom: number;
  tilt: number;
  sentAt: number;
  serverAt: number;
};

type Result = {
  received: number;
  expected: number;
  dropRatePercent: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  underThresholdPercent: number;
  thresholdMs: number;
  pass: boolean;
};

function getArg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function getPositionalArg(index: number): string | undefined {
  const values = process.argv.slice(2).filter((value) => !value.startsWith("--"));
  return values[index];
}

function toWsUrl(baseUrl: string): string {
  if (baseUrl.startsWith("https://")) {
    return baseUrl.replace("https://", "wss://") + "/ws";
  }
  if (baseUrl.startsWith("http://")) {
    return baseUrl.replace("http://", "ws://") + "/ws";
  }
  return `ws://${baseUrl.replace(/\/$/, "")}/ws`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function createSession(baseUrl: string, sessionId: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: sessionId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create session: ${response.status} ${body}`);
  }
}

function openClient(wsUrl: string, sessionId: string, role: Role): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`Timeout opening ${role} socket`));
    }, 8000);

    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "join-session",
          payload: { sessionId, role },
        }),
      );
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function run(config: TestConfig): Promise<Result> {
  const wsUrl = toWsUrl(config.baseUrl);
  await createSession(config.baseUrl, config.sessionId);

  const tracked = await openClient(wsUrl, config.sessionId, "tracked");
  const tracker = await openClient(wsUrl, config.sessionId, "tracker");

  const latencies: number[] = [];

  tracked.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as { type: string; payload: unknown };
      if (message.type !== "location-updated") return;

      const payload = message.payload as LocationUpdatedPayload;
      if (typeof payload.sentAt !== "number") return;

      const oneWayLatency = Math.max(0, Date.now() - payload.sentAt);
      latencies.push(oneWayLatency);
    } catch {
      // ignore malformed messages during stress run
    }
  });

  await wait(250);

  for (let index = 0; index < config.updates; index += 1) {
    const now = Date.now();
    const lat = 51.5 + index * 0.0001;
    const lng = -0.09 + index * 0.0001;
    const zoom = 13 + (index % 3) * 0.1;
    const tilt = (index % 12) * 5;

    tracker.send(
      JSON.stringify({
        type: "update-location",
        payload: {
          sessionId: config.sessionId,
          lat,
          lng,
          zoom,
          tilt,
          sentAt: now,
        },
      }),
    );

    await wait(config.intervalMs);
  }

  await wait(config.settleMs);

  tracker.close();
  tracked.close();

  const sorted = [...latencies].sort((a, b) => a - b);
  const received = sorted.length;
  const expected = config.updates;
  const dropRatePercent = expected === 0 ? 0 : ((expected - received) / expected) * 100;
  const minMs = sorted[0] ?? 0;
  const maxMs = sorted[sorted.length - 1] ?? 0;
  const avgMs = sorted.length === 0 ? 0 : sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const p50Ms = percentile(sorted, 50);
  const p95Ms = percentile(sorted, 95);
  const underThresholdCount = sorted.filter((value) => value <= config.thresholdMs).length;
  const underThresholdPercent = sorted.length === 0 ? 0 : (underThresholdCount / sorted.length) * 100;

  const pass =
    received >= Math.floor(expected * 0.95) &&
    p95Ms <= config.thresholdMs &&
    underThresholdPercent >= 95;

  return {
    received,
    expected,
    dropRatePercent,
    minMs,
    avgMs,
    p50Ms,
    p95Ms,
    maxMs,
    underThresholdPercent,
    thresholdMs: config.thresholdMs,
    pass,
  };
}

async function main() {
  const baseUrl = getArg("--baseUrl", "http://localhost:5000").replace(/\/$/, "");
  const updates = Number(getArg("--updates", getPositionalArg(0) ?? "200"));
  const intervalMs = Number(getArg("--interval", getPositionalArg(1) ?? "50"));
  const thresholdMs = Number(getArg("--threshold", getPositionalArg(2) ?? "100"));
  const settleMs = Number(getArg("--settle", "1500"));
  const enforce = getArg("--enforce", process.env.LATENCY_ENFORCE ?? "true") !== "false";
  const sessionId = getArg("--session", `latency-${Date.now()}`);

  const config: TestConfig = {
    baseUrl,
    updates,
    intervalMs,
    thresholdMs,
    settleMs,
    sessionId,
    enforce,
  };

  console.log("Running latency stress test with config:");
  console.log(JSON.stringify(config, null, 2));

  const result = await run(config);

  console.log("\nLatency Stress Test Result");
  console.log(JSON.stringify(result, null, 2));

  if (result.pass) {
    console.log("\nPASS: latency profile is within acceptance thresholds.");
  } else {
    console.log("\nFAIL: latency profile did not meet acceptance thresholds.");
  }

  if (config.enforce && !result.pass) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Latency test failed:", error);
  process.exit(1);
});
