import Link from "next/link";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

const BENEFITS = [
  "Товары, отзывы и заказы — в локальной демо-базе",
  "Пароли не хранятся в открытом виде (scrypt + соль)",
  "Сессия — HttpOnly cookie, запросы защищены CSRF",
];

/** Левая колонка с объяснением, что вообще за аккаунт. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-6 px-4 py-8 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-10 lg:py-14">
      <aside className="hidden flex-col justify-between rounded-3xl bg-ink p-7 text-white lg:flex">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-accent">
            <Sparkles size={13} /> учебный маркетплейс
          </p>
          <h1 className="mt-5 text-[30px] font-extrabold leading-tight">
            Один аккаунт — покупатель и продавец одновременно
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">
            Войдите, чтобы оставлять отзывы и оформлять заказы, и сразу получайте
            кабинет продавца: публикация товаров, остатки, ответы покупателям.
          </p>
          <ul className="mt-6 space-y-2.5">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-white/80">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/sell"
          className="mt-8 inline-flex items-center gap-2 self-start rounded-xl bg-white/10 px-4 py-3 text-[13px] font-bold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
        >
          <ShieldCheck size={15} className="text-accent" /> Как это устроено
        </Link>
      </aside>

      <main>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line md:p-8">
          <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-[13.5px] text-muted">{footer}</div>}
      </main>
    </div>
  );
}
