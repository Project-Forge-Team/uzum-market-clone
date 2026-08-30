/**
 * Мелкие хелперы мок-бэкенда: ошибки и разбор параметров.
 * (Раньше жили в lib/server/http.ts фронтенда — теперь это часть теста.)
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

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value.replace(/\s/g, "")) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

import type { ProductQuery } from "./catalog.ts";
import type { ProductRow } from "./db.ts";

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
