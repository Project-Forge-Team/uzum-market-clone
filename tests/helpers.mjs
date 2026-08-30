/**
 * Инфраструктура npm test: поднять мок-бэкенд и приложение в изоляции,
 * прогнать по ним проверки, гарантированно убить процессы.
 *
 * С переездом на внешний API у фронта больше нет своей базы: данные ему даёт
 * бэкенд. Чтобы `npm test` оставался автономным (CI без доступа к Render и без
 * права трогать чужой прод), рядом поднимается tests/mock-backend — он
 * повторяет контракт из docs/BACKEND_SPEC.md. Приложение получает его адрес
 * через BACKEND_URL.
 *
 * Тесты не трогают рабочую копию: база мока и каталог сборки уезжают во
 * временную папку (UZUM_DB_DIR / NEXT_DIST_DIR), порты берутся свободные, а в
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

/**
 * Поднимает tests/mock-backend на свободном порту. База мока живёт в песочнице
 * (UZUM_DB_DIR), поэтому прогон не наследует данные предыдущего.
 */
async function startMockBackend({ repoRoot, sandbox }) {
  const port = await freePort();
  const log = [];
  const child = spawn("node", [path.join(repoRoot, "tests", "mock-backend", "server.mjs")], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      BACKEND_URL: "",
      UZUM_DB_DIR: path.join(sandbox, "backend"),
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  const onData = (b) => {
    const text = b.toString();
    log.push(text);
    if (log.length > 200) log.shift();
    if (process.env.TEST_DEBUG) process.stdout.write(`[backend] ${text}`);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) break;
    } catch {
      /* ещё не слушает */
    }
    await sleep(300);
  }

  return {
    url,
    tail: () => log.join("").slice(-2000),
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
 * @returns Promise<{ base: string, ready: boolean, tail: () => string, stop: () => Promise<void> }>
 */
export async function startApp({ repoRoot, waitForMs = 180_000 } = {}) {
  const sandbox = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "uzum-npm-test-"));
  const cwd = repoRoot;

  // Бэкенд: свой мок на свободном порту, если извне не задан BACKEND_URL.
  // Так же можно прогнать набор против настоящего API:
  //   BACKEND_URL=https://backend-uzum-market.onrender.com npm test
  const externalBackend = process.env.BACKEND_URL?.trim();
  const backend = externalBackend
    ? { url: externalBackend, stop: async () => {}, tail: () => "" }
    : await startMockBackend({ repoRoot, sandbox });

  const port = await freePort();
  const log = [];
  const child = spawn("npx", ["next", "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      BACKEND_URL: backend.url,
      UZUM_DB_DIR: path.join(sandbox, "data"),
      // Отдельный каталог сборки обязателен: два `next dev` в одном проекте
      // воюют за .next/lock. Имя фиксированное (не уникальное!) — Next при
      // каждом запуске дописывает `<distDir>/types/**` в tsconfig.include, и
      // с постоянным именем этот diff уже закоммичен, а не появляется заново.
      NEXT_DIST_DIR: TEST_DIST_DIR,
      UZUM_TEST_PORT: String(port),
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
    backendUrl: backend.url,
    tail: () => `${log.join("").slice(-4000)}${backend.tail() ? `\n[backend] ${backend.tail()}` : ""}`,
    stop: async () => {
      await backend.stop();
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
