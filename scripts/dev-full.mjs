import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");
const NEXT_DEV_URL = "http://localhost:3000";
const URL_REGEX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

const isWindows = process.platform === "win32";
const npmCmd = "npm";
const cloudflaredCmd = "cloudflared";
const nodeCmd = process.execPath;

let cloudflaredProcess;
let devProcess;

const prefixLog = (prefix, stream, text) => {
  const color = stream === "stderr" ? "\u001b[31m" : "\u001b[36m";
  process.stdout.write(`${color}[${prefix}]\u001b[0m ${text}`);
};

const updateEnvWebhookBaseUrl = (baseUrl) => {
  const original = readFileSync(ENV_PATH, "utf8");
  const lines = original.split(/\r?\n/);
  const key = "SHOPIFY_WEBHOOK_BASE_URL";
  const nextLine = `${key}="${baseUrl}"`;

  let updated = false;
  const mapped = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      updated = true;
      return nextLine;
    }
    return line;
  });

  if (!updated) {
    if (mapped.length > 0 && mapped[mapped.length - 1] !== "") {
      mapped.push("");
    }
    mapped.push(nextLine);
  }

  writeFileSync(ENV_PATH, mapped.join("\n"), "utf8");
};

const runWebhookRegister = (baseUrl) =>
  new Promise((resolvePromise, rejectPromise) => {
    const register = spawn(
      nodeCmd,
      ["--env-file=.env", "scripts/register-webhooks.mjs", baseUrl],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      },
    );

    register.stdout.on("data", (chunk) =>
      prefixLog("webhook:register", "stdout", chunk.toString()),
    );
    register.stderr.on("data", (chunk) =>
      prefixLog("webhook:register", "stderr", chunk.toString()),
    );

    register.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }
      rejectPromise(new Error(`webhook:register failed with exit code ${code ?? 1}`));
    });
  });

const startNextDev = (baseUrl) => {
  devProcess = spawn(npmCmd, ["run", "dev"], {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    shell: isWindows,
    env: {
      ...process.env,
      SHOPIFY_WEBHOOK_BASE_URL: baseUrl,
    },
  });

  devProcess.stdout.on("data", (chunk) => prefixLog("next-dev", "stdout", chunk.toString()));
  devProcess.stderr.on("data", (chunk) => prefixLog("next-dev", "stderr", chunk.toString()));

  devProcess.on("exit", (code) => {
    if (cloudflaredProcess && !cloudflaredProcess.killed) {
      cloudflaredProcess.kill();
    }
    process.exit(code ?? 0);
  });
};

const waitForTunnelUrl = () =>
  new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      rejectPromise(new Error("Timed out waiting for Cloudflare tunnel URL"));
    }, 90_000);

    cloudflaredProcess = spawn(
      cloudflaredCmd,
      ["tunnel", "--url", NEXT_DEV_URL, "--no-autoupdate"],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      },
    );

    const onData = (chunk, stream) => {
      const text = chunk.toString();
      prefixLog("cloudflared", stream, text);

      const match = text.match(URL_REGEX);
      if (match?.[0]) {
        clearTimeout(timeout);
        resolvePromise(match[0].toLowerCase());
      }
    };

    cloudflaredProcess.stdout.on("data", (chunk) => onData(chunk, "stdout"));
    cloudflaredProcess.stderr.on("data", (chunk) => onData(chunk, "stderr"));
    cloudflaredProcess.on("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(
        new Error(
          `Could not start cloudflared. Install it and retry. Original error: ${error.message}`,
        ),
      );
    });

    cloudflaredProcess.on("exit", (code) => {
      clearTimeout(timeout);
      if (!devProcess) {
        rejectPromise(new Error(`cloudflared exited early with code ${code ?? 1}`));
      }
    });
  });

const verifyCloudflaredInstalled = () =>
  new Promise((resolvePromise, rejectPromise) => {
    const check = spawn(cloudflaredCmd, ["--version"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    check.on("error", (error) => {
      rejectPromise(
        new Error(
          `cloudflared is not available. Install it first. Original error: ${error.message}`,
        ),
      );
    });

    check.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }
      rejectPromise(
        new Error(`cloudflared --version failed with exit code ${code ?? 1}`),
      );
    });
  });

const shutdown = () => {
  if (devProcess && !devProcess.killed) {
    devProcess.kill();
  }
  if (cloudflaredProcess && !cloudflaredProcess.killed) {
    cloudflaredProcess.kill();
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await verifyCloudflaredInstalled();
  const tunnelUrl = await waitForTunnelUrl();
  console.log(`\n[dev:full] Tunnel URL detected: ${tunnelUrl}\n`);

  updateEnvWebhookBaseUrl(tunnelUrl);
  console.log("[dev:full] Updated .env with SHOPIFY_WEBHOOK_BASE_URL.");

  await runWebhookRegister(tunnelUrl);
  console.log("[dev:full] Webhooks reconciled. Starting Next.js dev server...\n");

  startNextDev(tunnelUrl);
} catch (error) {
  console.error("[dev:full] Failed to start full development workflow.");
  console.error(error instanceof Error ? error.message : error);
  shutdown();
  process.exit(1);
}
