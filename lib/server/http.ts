/**
 * Мелкие хелперы HTTP-слоя: единый формат ответа и ошибок.
 * Фреймворк-независимы: отдаём { status, body, headers } — собирает
 * локальный бэкенд (tests/local-backend).
 */

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export interface ApiResponse {
  status: number;
  /** JSON-строка или бинарное тело (загруженные файлы). */
  body: string | Buffer;
  headers: Record<string, string>;
}

export function json<T>(
  data: T,
  init?: { status?: number; headers?: Record<string, string> },
): ApiResponse {
  return {
    status: init?.status ?? 200,
    body: JSON.stringify(data ?? null),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  };
}

export function fail(err: unknown): ApiResponse {
  if (err instanceof ApiError) {
    return json(
      { detail: err.message, ...(err.fields ? { fields: err.fields } : {}) },
      { status: err.status },
    );
  }
  console.error("[uzum api]", err);
  return json(
    { detail: "На сервере что-то сломалось. Попробуйте ещё раз." },
    { status: 500 },
  );
}

/**
 * Читаем JSON тела: пустое тело не роняет обработчик, а поля проверяются
 * в слое мутаций (lib/server/actions.ts) — там же рождаются понятные ошибки.
 * Принимает и Request (Next.js), и любой объект с text() (локальный бэкенд).
 */
export async function readJson<T>(request: { text(): Promise<string> }): Promise<T> {
  try {
    const text = await request.text();
    if (!text.trim()) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(400, "Ожидается корректный JSON в теле запроса");
  }
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value.replace(/\s/g, "")) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toInt(value: string | null | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/* ------------------------------------------------------------------ */
/*  Параметры строки запроса -> ProductQuery                           */
/* ------------------------------------------------------------------ */
import type { ProductQuery } from "./catalog";
import type { ProductRow } from "./db";

function numParam(params: URLSearchParams, name: string): number | undefined {
  const raw = params.get(name);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw.replace(/\s/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function productQueryFromUrl(url: URL): ProductQuery {
  const p = url.searchParams;
  const boolParam = (name: string) => {
    const v = p.get(name);
    return v === null || v === "" ? undefined : v === "1" || v === "true";
  };
  const status = p.get("status") as ProductRow["status"] | null;

  const ids = p.get("ids");
  return {
    q: p.get("q") ?? p.get("search") ?? undefined,
    ids: ids ?? undefined,
    category: p.get("category") ?? undefined,
    seller: p.get("seller") ?? undefined,
    min_price: numParam(p, "min_price"),
    max_price: numParam(p, "max_price"),
    min_rating: numParam(p, "min_rating"),
    discounted: boolParam("discounted"),
    in_stock: boolParam("in_stock"),
    ordering: p.get("ordering") ?? undefined,
    page: numParam(p, "page"),
    page_size: numParam(p, "page_size"),
    status: status && ["active", "draft", "archived"].includes(status) ? status : undefined,
  };
}
