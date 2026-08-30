/**
 * Инфраструктура npm test: поднять приложение в изоляции, прогнать по нему
 * проверки, гарантированно убить процесс.
 *
 * Тесты НЕ должны тереть .data/db.json разработчика: приложение стартует с
 * UZUM_DB_DIR и NEXT_DIST_DIR во временной папке, на свободном порту, а в
 * finally — SIGTERM всей группе процессов и rm -rf. Копировать репозиторий
 * нельзя: Turbopack отказывается работать с node_modules по симлинку.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Каталог сборки для тестов. Next резолвит distDir только от корня проекта. */
export const TEST_DIST_DIR = ".next-test";

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(" ")} завершился с кодом ${code}`)),
    );
  });
}

/** Свободный TCP-порт (best effort: между проверкой и запуском может вклиниться сосед). */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Ждёт, пока URL начнёт отвечать 2xx. */
async function waitHttp(url, deadline) {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.ok) return true;
    } catch {
      /* ещё не слушает — ждём */
    }
    await sleep(500);
  }
  return false;
}

/**
 * Поднимает локальный бэкенд (tests/local-backend/server.mts) — тот же
 * контракт, что и прод-бэкенд, но офлайн. База — во временной папке.
 */
export async function startBackend({ repoRoot, dataDir, port }) {
  const log = [];
  const child = spawn(
    "npx",
    ["tsx", path.join(repoRoot, "tests", "local-backend", "server.mts")],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        UZUM_BACKEND_PORT: String(port),
        UZUM_DB_DIR: dataDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  child.stdout.on("data", (b) => log.push(b.toString()));
  child.stderr.on("data", (b) => log.push(b.toString()));

  const ready = await waitHttp(
    `http://127.0.0.1:${port}/api/health`,
    Date.now() + 60_000,
  );

  return {
    base: `http://127.0.0.1:${port}`,
    ready,
    tail: () => log.join("").slice(-4000),
    stop: async () => {
      if (child.exitCode === null) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
        for (let i = 0; i < 30 && child.exitCode === null; i += 1) await sleep(100);
        if (child.exitCode === null) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        }
      }
    },
  };
}

/**
 * Запускает next dev в отдельной «песочнице»: демо-база (UZUM_DB_DIR) и каталог
 * сборки (NEXT_DIST_DIR) уезжают во временную папку, поэтому тесты не трогают
 * ни .data разработчика, ни рабочий .next. Порт — первый свободный.
 * `extraEnv` — дополнительные переменные для приложения (например,
 * BACKEND_URL на поднятый рядом локальный бэкенд).
 * @returns Promise<{ base: string, ready: boolean, tail: () => string, stop: () => Promise<void> }>
 */
export async function startApp({ repoRoot, waitForMs = 180_000, extraEnv = {} } = {}) {
  const sandbox = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "uzum-npm-test-"));
  const cwd = repoRoot;
  const port = await freePort();
  const log = [];
  const child = spawn("npx", ["next", "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      UZUM_DB_DIR: path.join(sandbox, "data"),
      // Отдельный каталог сборки обязателен: два `next dev` в одном проекте
      // воюют за .next/lock. Имя фиксированное (не уникальное!) — Next при
      // каждом запуске дописывает `<distDir>/types/**` в tsconfig.include, и
      // с постоянным именем этот diff уже закоммичен, а не появляется заново.
      NEXT_DIST_DIR: TEST_DIST_DIR,
      UZUM_TEST_PORT: String(port),
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  const onData = (b) => {
    const text = b.toString();
    log.push(text);
    if (log.length > 400) log.shift();
    if (process.env.TEST_DEBUG) process.stdout.write(`[app] ${text}`);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + waitForMs;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      /* ещё не слушает — ждём */
    }
    await sleep(1000);
  }

  return {
    base,
    cwd,
    ready,
    tail: () => log.join("").slice(-4000),
    stop: async () => {
      if (child.exitCode === null) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
        for (let i = 0; i < 30 && child.exitCode === null; i += 1) await sleep(100);
        if (child.exitCode === null) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        }
      }
      fs.rmSync(sandbox, { recursive: true, force: true, maxRetries: 5 });
      fs.rmSync(path.join(cwd, TEST_DIST_DIR), {
        recursive: true,
        force: true,
        maxRetries: 5,
      });
    },
  };
}

/** Выполняет шаги строго по очереди. Падающий шаг не отменяет остальные. */
export async function runSteps(steps) {
  const failures = [];
  for (const step of steps) {
    try {
      await step.run(assert);
      console.log(`~ ok ${step.name}`);
    } catch (err) {
      const detail = String(err?.message ?? err).replace(/\s+/g, " ").trim();
      failures.push({ name: step.name, detail });
      console.log(`~ FAIL ${step.name} — ${detail}`);
    }
  }
  console.log(`=== ${steps.length - failures.length} passed / ${failures.length} failed ===`);
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.detail}`);
  return { passed: steps.length - failures.length, failed: failures.length, failures };
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? "assert failed");
}

assert.ok = assert;
assert.equal = (actual, expected, msg) => {
  if (actual !== expected) {
    throw new Error(`${msg ?? "не то значение"}: ожидалось ${JSON.stringify(expected)}, получено ${JSON.stringify(actual)}`);
  }
};
assert.match = (text, re, msg) => {
  if (!re.test(text)) throw new Error(`${msg ?? "нет совпадения"}: ${re} не найдено в ${String(text).slice(0, 180)}`);
};
