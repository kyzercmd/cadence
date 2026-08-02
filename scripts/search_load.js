// bench/search_load.js
// k6 load test — GlobalSearch endpoint, admin role only
//
// Usage:
//   k6 run --env TOKEN=<admin_jwt> bench/search_load.js
//   k6 run --env TOKEN=<jwt> --env BASE_URL=http://localhost:4000 bench/search_load.js
//
// MODE env var controls which scenario runs:
//   MODE=ramp    (default) ramping arrival rate — finds CPU boundary
//   MODE=peak               fixed 100 VUs no sleep — max throughput stress

import http from "k6/http";
import { check } from "k6";
import { Trend, Rate } from "k6/metrics";

const ADMIN_TOKEN = __ENV.TOKEN || "PASTE_ADMIN_JWT_HERE";
const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const MODE = __ENV.MODE || "ramp";

const searchLatency = new Trend("search_latency_ms", true);
const errorRate = new Rate("error_rate");

// ── Ramping arrival rate ──────────────────────────────────────────────────────
// k6 sends exactly N requests/sec regardless of how long each takes.
// Watch docker stats CPU% — note the RPS level where it first hits ~50%.
// That is your CPU boundary.
//
// Ramp plan:  100 → 300 → 600 → 1000 → 1400 RPS, 20s per step
// preAllocatedVUs: pool of VUs ready to fire — must be >= peak concurrency
// maxVUs: hard ceiling if preAllocated isn't enough
const rampScenario = {
  executor: "ramping-arrival-rate",
  startRate: 50, // RPS at t=0
  timeUnit: "1s",
  preAllocatedVUs: 50,
  maxVUs: 200,
  stages: [
    { duration: "20s", target: 100 }, // step 1 — watch CPU
    { duration: "20s", target: 300 }, // step 2
    { duration: "20s", target: 600 }, // step 3
    { duration: "20s", target: 1000 }, // step 4
    { duration: "20s", target: 1400 }, // step 5 — likely hits ceiling here
    { duration: "10s", target: 0 }, // cool down
  ],
};

// ── Peak VU mode (original) ───────────────────────────────────────────────────
const peakScenario = {
  executor: "ramping-vus",
  stages: [
    { duration: "15s", target: 20 },
    { duration: "30s", target: 100 },
    { duration: "15s", target: 500 },
    { duration: "15s", target: 0 },
  ],
};

export const options = {
  scenarios: {
    default: MODE === "peak" ? peakScenario : rampScenario,
  },
  thresholds: {
    search_latency_ms: ["p(95)<500"],
    error_rate: ["rate<0.05"],
  },
};

const QUERIES = [
  "alice",
  "project",
  "design",
  "backend",
  "urgent",
  "deploy",
  "review",
  "api",
];

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };

  const res = http.get(`${BASE_URL}/api/search?q=${q}`, {
    headers,
    tags: { name: "GlobalSearch" },
  });

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "body not empty": (r) => r.body.length > 2,
  });

  searchLatency.add(res.timings.duration);
  errorRate.add(!ok);
}
