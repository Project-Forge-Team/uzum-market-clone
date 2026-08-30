/** Форматирование цен, дат и склонений — переиспользуем в витрине и кабинете. */

const NBSP = "\u00A0";

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ru-RU").replace(/[, ]/g, NBSP);
}

export function formatSum(value: number | string | null | undefined): string {
  return `${formatNumber(value)}${NBSP}сум`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")} млн`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")} тыс`;
  return String(value);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function plural(
  count: number,
  forms: [string, string, string], // отзыв / отзыва / отзывов
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function reviewsWord(count: number): string {
  return `${count} ${plural(count, ["отзыв", "отзыва", "отзывов"])}`;
}

export function productsWord(count: number): string {
  return `${formatNumber(count)} ${plural(count, ["товар", "товара", "товаров"])}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours <= 0) return "только что";
    return `${hours} ${plural(hours, ["час", "часа", "часов"])} назад`;
  }
  if (days < 30) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  const months = Math.floor(days / 30);
  return `${months} ${plural(months, ["месяц", "месяца", "месяцев"])} назад`;
}
