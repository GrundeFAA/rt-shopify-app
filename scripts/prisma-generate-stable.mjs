import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const MAX_ATTEMPTS = 8;
const BASE_DELAY_MS = 300;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWindowsEperm(output) {
  return /EPERM: operation not permitted, rename/i.test(output);
}

async function cleanupPrismaEngineFiles() {
  const prismaClientPath = path.join(
    process.cwd(),
    "node_modules",
    ".prisma",
    "client",
  );
  const candidates = [
    "query-engine-windows.exe",
    "query_engine-windows.dll.node",
  ];

  await Promise.all(
    candidates.map(async (filename) => {
      try {
        await rm(path.join(prismaClientPath, filename), { force: true });
      } catch {
        // Best-effort cleanup only.
      }
    }),
  );
}

async function runGenerateOnce() {
  return new Promise((resolve) => {
    const child = spawn("npx", ["prisma", "generate"], {
      shell: true,
      env: {
        ...process.env,
      },
      stdio: ["inherit", "pipe", "pipe"],
    });

    let combinedOutput = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        output: combinedOutput,
      });
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await cleanupPrismaEngineFiles();
    const result = await runGenerateOnce();
    if (result.exitCode === 0) {
      process.exit(0);
    }

    const retryable = isWindowsEperm(result.output);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      process.exit(result.exitCode);
    }

    const delayMs = BASE_DELAY_MS * attempt;
    console.warn(
      `Prisma generate failed with EPERM (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${delayMs}ms...`,
    );
    await delay(delayMs);
  }
}

await main();
