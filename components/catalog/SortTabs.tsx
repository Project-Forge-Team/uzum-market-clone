import Link from "next/link";
import { ArrowUpDown } from "lucide-react";

const OPTIONS = [
  { value: "", label: "По популярности" },
  { value: "new", label: "Сначала новые" },
  { value: "price", label: "Дешевле" },
  { value: "-price", label: "Дороже" },
  { value: "rating", label: "По рейтингу" },
  { value: "discount", label: "По скидке" },
];

/** Сортировка ссылками: серверный рендер, без клиентского состояния. */
export default function SortTabs({
  basePath,
  buildQuery,
  current,
}: {
  basePath: string;
  buildQuery: (ordering: string) => string;
  current: string;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      <span className="hidden items-center gap-1.5 text-[13px] font-medium text-muted sm:flex">
        <ArrowUpDown size={14} /> Сортировка:
      </span>
      {OPTIONS.map((option) => {
        const active = (current ?? "") === option.value;
        const qs = buildQuery(option.value);
        return (
          <Link
            key={option.label}
            href={`${basePath}${qs ? `?${qs}` : ""}`}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active
                ? "bg-ink text-white"
                : "bg-white text-gray-600 ring-1 ring-line hover:text-brand hover:ring-brand-border"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
