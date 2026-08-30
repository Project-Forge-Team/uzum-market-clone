/**
 * Единая точка знания о том, где живёт бэкенд, и как к нему обращаться.
 *
 * Здесь только транспорт (URL, заголовки, куки, трейлинг-слэш). Прикладные
 * запросы страниц собраны в lib/server/data.ts, браузерные — в lib/api.ts.
 *
 * Правила, выведенные из живого API (см. /api/schema/):
 *  - Django включён APPEND_SLASH: почти все пути требуют завершающий «/»,
 *    иначе прилетает 301 (а на POST редирект деградирует в GET).
 *  - Исключения, где слэша быть НЕ должно: `/api/health` и `/api/uploads/<файл>`
 *    (`/api/health/` реально отвечает 404).
 *  - Авторизация — только кука `uzum_sessionid`, никаких Bearer-токенов.
 */

/** Origin бэкенда без завершающего слэша и без суффикса `/api`. */
export const BACKEND_ORIGIN = (
  process.env.BACKEND_URL ?? "https://backend-uzum-market.onrender.com"
)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

/** База всех REST-путей: `<origin>/api`. */
export const BACKEND_API = `${BACKEND_ORIGIN}/api`;

/** Куки, которые имеет смысл прокидывать на бэкенд (сессия + CSRF). */
export const SESSION_COOKIE = "uzum_sessionid";
export const CSRF_COOKIE = "uzum_csrf";

/**
 * Render free tier уходит в сон и просыпается ~50 секунд — без запаса
 * по таймауту первый запрос после простоя всегда падал бы.
 */
export const BACKEND_TIMEOUT_MS = 55_000;

/** Пути под `/api`, которые бэкенд отдаёт БЕЗ завершающего слэша. */
const NO_TRAILING_SLASH = new Set(["health"]);

/**
 * Приводит путь к виду, который ждёт Django.
 * @param path путь относительно `/api`, например `auth/login` или `/products/1`
 */
export function normalizeApiPath(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (clean === "") return "";
  const lastSegment = clean.slice(clean.lastIndexOf("/") + 1);
  // Файлы (`/api/uploads/ab12.png`) и health слэшем не заканчиваются.
  if (NO_TRAILING_SLASH.has(clean) || lastSegment.includes(".")) return clean;
  return `${clean}/`;
}

/** Собирает абсолютный URL к бэкенду с нормализованным путём. */
export function backendUrl(path: string, search = ""): string {
  const normalized = normalizeApiPath(path);
  const qs = search && !search.startsWith("?") ? `?${search}` : search;
  return `${BACKEND_API}/${normalized}${qs}`;
}

/** Картинки товаров лежат на домене бэкенда (`/products/gen/*.svg`). */
export function backendAssetUrl(path: string): string {
  return `${BACKEND_ORIGIN}/${path.replace(/^\/+/, "")}`;
}
