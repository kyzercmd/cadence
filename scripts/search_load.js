// bench/search_load.js
// k6 load test — GlobalSearch endpoint, admin role only
//


import http from "k6/http";
import { check } from "k6";
import { Trend, Rate } from "k6/metrics";

const ADMIN_TOKEN = __ENV.TOKEN || "PASTE_ADMIN_JWT_HERE";
const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

const searchLatency = new Trend("search_latency_ms", true);
const errorRate = new Rate("error_rate");

const peakScenario = {
  executor: "ramping-vus",
  stages: [
    { duration: "15s", target: 20 },
    { duration: "30s", target: 100 },
    { duration: "15s", target: 500 },
    { duration: "15s", target: 0 },
  ],
};

const capacityScenario = {
  executor: "constant-arrival-rate",

  rate: 1900,
  timeUnit: "1s",

  duration: "2m",

  preAllocatedVUs: 50,
  maxVUs: 300,
};

export const options = {
  scenarios: {
    default: MODE === "capacity" ? capacityScenario : peakScenario,
  },
  thresholds: {
    search_latency_ms: ["p(95)<50"],
    error_rate: ["rate<0.01"],
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
