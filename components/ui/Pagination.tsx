import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Пагинация ссылками: серверный рендер + рабочая кнопка «назад/вперёд». */
export default function Pagination({
  page,
  totalPages,
  template,
}: {
  page: number;
  totalPages: number;
  /** Шаблон ссылки: /catalog/elektronika?page={page} */
  template: string;
}) {
  const buildLink = (target: number) =>
    target === 1
      ? template.replace("?page={page}", "").replace(/[?&]$/, "")
      : template.replace("{page}", String(target));
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  for (let i = from; i <= to; i += 1) pages.push(i);

  const cell = (isActive: boolean) =>
    `grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-brand text-white"
        : "bg-white text-gray-600 ring-1 ring-line hover:text-brand hover:ring-brand-border"
    }`;

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Страницы">
      {page > 1 && (
        <Link href={buildLink(page - 1)} className={cell(false)} aria-label="Предыдущая страница">
          <ChevronLeft size={16} />
        </Link>
      )}
      {from > 1 && (
        <>
          <Link href={buildLink(1)} className={cell(false)}>1</Link>
          {from > 2 && <span className="px-1 text-muted">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Link key={p} href={buildLink(p)} className={cell(p === page)} aria-current={p === page ? "page" : undefined}>
          {p}
        </Link>
      ))}
      {to < totalPages && (
        <>
          {to < totalPages - 1 && <span className="px-1 text-muted">…</span>}
          <Link href={buildLink(totalPages)} className={cell(false)}>{totalPages}</Link>
        </>
      )}
      {page < totalPages && (
        <Link href={buildLink(page + 1)} className={cell(false)} aria-label="Следующая страница">
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  );
}
