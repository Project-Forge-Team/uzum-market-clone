import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Compass size={30} />
      </span>
      <p className="mt-5 text-[64px] font-extrabold leading-none text-ink">404</p>
      <h1 className="mt-2 text-xl font-bold text-ink">Такой страницы нет</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Возможно, товар продали, ссылку изменили или вы опечатались. Начните с главной
        — там весь каталог.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          <Home size={16} /> На главную
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
        >
          <Search size={16} /> В каталог
        </Link>
      </div>
    </div>
  );
}
