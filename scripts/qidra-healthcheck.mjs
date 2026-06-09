const baseUrl = (process.env.QIDRA_HEALTHCHECK_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
const runCronCheck = process.env.QIDRA_HEALTHCHECK_RUN_CRON === "true";
const cronSecret = process.env.CRON_SECRET || process.env.QIDRA_WALLET_SYNC_SECRET;

if (!baseUrl) {
  console.error("Set QIDRA_HEALTHCHECK_URL or NEXTAUTH_URL to the deployed HTTPS origin.");
  process.exit(1);
}

const failures = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

async function fetchPath(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      "User-Agent": "qidra-healthcheck/1.0",
      ...(init?.headers || {})
    }
  });
  return response;
}

async function checkPage(path) {
  const response = await fetchPath(path);
  assert(response.status >= 200 && response.status < 500, `${path}: expected non-5xx status, got ${response.status}`);
  return response;
}

try {
  const root = await checkPage("/");
  await checkPage("/auth/sign-in");
  await checkPage("/projects");

  const csp = root.headers.get("content-security-policy") || "";
  const hsts = root.headers.get("strict-transport-security") || "";
  const frameOptions = root.headers.get("x-frame-options") || "";
  const contentTypeOptions = root.headers.get("x-content-type-options") || "";
  const referrerPolicy = root.headers.get("referrer-policy") || "";

  assert(csp.includes("default-src 'self'"), "Missing or weak Content-Security-Policy default-src");
  assert(csp.includes("frame-ancestors 'none'"), "Content-Security-Policy must deny frame ancestors");
  assert(frameOptions.toUpperCase() === "DENY", "X-Frame-Options must be DENY");
  assert(contentTypeOptions.toLowerCase() === "nosniff", "X-Content-Type-Options must be nosniff");
  assert(referrerPolicy === "strict-origin-when-cross-origin", "Referrer-Policy must be strict-origin-when-cross-origin");
  warn(hsts.includes("max-age="), "Strict-Transport-Security is missing; check HTTPS/proxy headers before public launch");

  const foreignOrigin = await fetchPath("/api/wallet/deposits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example"
    },
    body: JSON.stringify({})
  });
  assert([403, 401].includes(foreignOrigin.status), `/api/wallet/deposits foreign Origin guard returned ${foreignOrigin.status}, expected 403 or auth rejection`);

  if (runCronCheck) {
    assert(Boolean(cronSecret), "CRON_SECRET or QIDRA_WALLET_SYNC_SECRET is required when QIDRA_HEALTHCHECK_RUN_CRON=true");
    if (cronSecret) {
      const cron = await fetchPath("/api/cron/wallet-deposits?limitPerWallet=1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`
        }
      });
      assert([200, 503].includes(cron.status), `wallet sync cron returned ${cron.status}, expected 200 or 503 when TronGrid is not configured`);
    }
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

for (const warning of warnings) {
  console.warn(`WARNING: ${warning}`);
}

if (failures.length) {
  console.error("Qidra healthcheck failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Qidra healthcheck passed.");
