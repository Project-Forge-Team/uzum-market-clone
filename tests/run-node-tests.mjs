/**
 * Тесты, которые должен запускать `npm test` — без внешних сервисов и без
 * правок в репозитории. Приложение поднимается в изолированной копии
 * (tests/helpers.mjs) вместе с локальным бэкендом (tests/local-backend,
 * тот же контракт, что и прод на Render), по приложению прогоняется
 * сквозной сценарий tests/e2e.py, всё убивается в finally.
 */
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { freePort, startApp, startBackend } from "./helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runSuite(base) {
  return new Promise((resolve) => {
    import("node:child_process").then(({ spawn }) => {
      const child = spawn("python3", [path.join(repoRoot, "tests", "e2e.py")], {
        cwd: repoRoot,
        env: { ...process.env, UZUM_BASE_URL: base, PYTHONIOENCODING: "utf-8" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      const lines = [];
      let passed = 0;
      let failed = 0;
      const onChunk = (b) => {
        const text = b.toString();
        const parts = text.split(/(?<=\n)/);
        for (const raw of parts) {
          const line = raw.trim();
          if (!line) continue;
          lines.push(line);
          if (line.startsWith("~ ok ")) passed += 1;
          else if (line.startsWith("~ FAIL ")) failed += 1;
          console.log(line);
        }
      };
      child.stdout.on("data", onChunk);
      // stderr печатаем тоже: трейсбек упавшего e2e.py должен быть виден в логе
      child.stderr.on("data", (b) => {
        const text = b.toString();
        lines.push(text);
        process.stderr.write(text);
      });
      child.on("error", (err) =>
        resolve({ spawnError: err, passed, failed, output: lines.join("\n") }),
      );
      child.on("close", (code) => resolve({ code, passed, failed, output: lines.join("\n") }));
    });
  });
}

const sandbox = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "uzum-npm-test-"));
let backend;
let app;
try {
  const backendPort = await freePort();
  backend = await startBackend({
    repoRoot,
    dataDir: path.join(sandbox, "backend-data"),
    port: backendPort,
  });
  if (!backend.ready) {
    console.error(
      `локальный бэкенд не ответил на GET /api/health — лог:\n${backend.tail() ?? "(пусто)"}`,
    );
    await backend.stop();
    process.exit(1);
  }

  app = await startApp({
    repoRoot,
    extraEnv: { BACKEND_URL: backend.base },
  });
  if (!app.ready) {
    console.error(
      `приложение не ответило на GET /api/health — лог:\n${app.tail() ?? "(пусто)"}`,
    );
    await app.stop();
    await backend.stop();
    process.exit(1);
  }

  // Прогрев: next dev компилирует каждый роут по первому запросу. На медленных
  // раннерах (CI, 2 vCPU) первая сборка тяжёлой страницы может превысить
  // таймаут html()-запросов в e2e.py — поэтому заранее собираем все роуты,
  // которые e2e проверит в HTML. Статусы не важны (307/404 тоже компилируют).
  const prewarmPaths = [
    "/",
    "/catalog",
    "/catalog/elektronika",
    "/search",
    "/product/1",
    "/sellers",
    "/sell",
    "/shop/uzum-students",
    "/login",
    "/register",
    "/cart",
    "/checkout",
    "/cabinet",
    "/cabinet/products",
    "/cabinet/orders",
    "/cabinet/reviews",
    "/profile",
    "/profile/orders",
    "/profile/settings",
  ];
  console.log(`прогрев роутов (${prewarmPaths.length} шт, может занять минуту)…`);
  for (const p of prewarmPaths) {
    try {
      await fetch(`${app.base}${p}`, { signal: AbortSignal.timeout(300_000) });
    } catch {
      /* роут мог ответить ошибкой — компиляция от этого уже не отменяется */
    }
  }
  console.log("прогрев завершён");

  const suite = await runSuite(app.base);
  if (suite.spawnError) {
    console.error(
      `не удалось запустить python3 (${suite.spawnError.message}). ` +
        "Нужен Python 3 в PATH — он стоит в образе CI; локально: apt install python3.",
    );
    await app.stop();
    await backend.stop();
    process.exit(2);
  }
  if (suite.passed + suite.failed === 0) {
    console.error(`tests/e2e.py ничего не напечатал (код ${suite.code}):\n${suite.output}`);
    await app.stop();
    await backend.stop();
    process.exit(1);
  }
  // e2e.py завершился не с кодом 0, но ни одной FAIL-строки не было
  // (крах по середине сценария) — тоже провал, показываем хвост вывода.
  if (suite.failed === 0 && suite.code !== 0) {
    console.error(
      `tests/e2e.py упал без FAIL-строк (код ${suite.code}, напечатал ${suite.passed} ok):\n${suite.output.slice(-4000)}`,
    );
    await app.stop();
    await backend.stop();
    process.exit(1);
  }

  console.log(
    `=== npm test: ${suite.passed + 1} passed / ${suite.failed} failed ===` +
      " (+1 — приложение поднялось в своей песочнице, +1 — локальный бэкенд)",
  );
  await app.stop();
  await backend.stop();
  fs.rmSync(sandbox, { recursive: true, force: true, maxRetries: 5 });
  process.exit(suite.failed > 0 ? 1 : 0);
} catch (err) {
  console.error(err);
  if (app) await app.stop();
  if (backend) await backend.stop();
  fs.rmSync(sandbox, { recursive: true, force: true, maxRetries: 5 });
  process.exit(1);
}
