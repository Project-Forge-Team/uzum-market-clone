import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChartColumn,
  Check,
  ImagePlus,
  MessageSquareQuote,
  Package,
  Percent,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { marketplaceStats } from "@/lib/server/catalog";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Продавать на Uzum",
  description:
    "Как устроен кабинет продавца в учебном клоне: публикация товаров, цены, отзывы и заказы.",
};

const STEPS = [
  {
    icon: Store,
    title: "Заведите аккаунт",
    text: "Регистрация покупателя уже создаёт магазин — название можно поменять в кабинете.",
  },
  {
    icon: ImagePlus,
    title: "Выложите товар",
    text: "Название, описание, цена и старая цена, 1–8 фото, характеристики и остаток.",
  },
  {
    icon: Truck,
    title: "Продавец получает заказ",
    text: "Покупатель оформляет корзину → заказ появляется у вас со статусами и составом.",
  },
  {
    icon: MessageSquareQuote,
    title: "Отвечайте на отзывы",
    text: "Один развёрнутый ответ на претензию часто важнее скидки — рейтинг магазина растёт.",
  },
];

const RULES = [
  { icon: BadgeCheck, title: "Честная карточка", text: "Реальные фото, точный остаток и срок доставки" },
  { icon: Percent, title: "Скидка без обмана", text: "Старая цена должна быть выше текущей — иначе бейдж не покажется" },
  { icon: ShieldCheck, title: "Возврат 14 дней", text: "Новый товар без следов использования возвращают без вопросов" },
  { icon: Banknote, title: "Оплата при получении", text: "В демо деньги не списываются: статус меняется вручную" },
];

export default function SellPage() {
  const stats = marketplaceStats();

  return (
    <div className="pb-4">
      <section className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-8 px-4 py-12 md:py-16 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-accent">
              <Store size={13} /> Кабинет продавца
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-[44px]">
              Продавайте на Uzum — <span className="text-accent">без комиссии и</span>{" "}
              без страха ошибиться
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
              Это учебный клон маркетплейса: здесь можно пройти весь путь продавца —
              от загрузки фото до ответа на отзыв и смены статуса заказа. Ошибаться
              безопасно, данные локальные.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/cabinet/products/new"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-[14px] font-bold text-ink transition-colors hover:bg-white"
              >
                Выложить товар <ArrowRight size={16} />
              </Link>
              <Link
                href="/login?redirect=/cabinet"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                Войти в кабинет
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "активных товаров", value: formatNumber(stats.products) },
              { label: "магазинов", value: String(stats.sellers) },
              { label: "отзывов покупателей", value: formatNumber(stats.reviews) },
              { label: "комиссия в демо", value: "0%" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-[26px] font-extrabold leading-none">{item.value}</p>
                <p className="mt-2 text-[12.5px] text-white/60">{item.label}</p>
              </div>
            ))}
            <p className="col-span-2 rounded-2xl bg-white/5 p-4 text-[12.5px] leading-relaxed text-white/60">
              В реальном Uzum продавцу нужны ИНН, договор и склад. В клоне всё это
              опущено: важно понять механику — карточка, заказ, статус, отзыв.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 py-12">
        <h2 className="text-xl font-bold text-ink md:text-2xl">Как это работает</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className="relative rounded-2xl bg-white p-5 ring-1 ring-line transition-shadow hover:shadow-[0_16px_40px_-28px_rgba(31,31,31,0.6)]"
            >
              <span className="absolute right-4 top-4 text-[34px] font-extrabold leading-none text-surface">
                {index + 1}
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <step.icon size={19} />
              </span>
              <h3 className="mt-3.5 text-[15px] font-bold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-12">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-line">
            <h2 className="text-lg font-bold text-ink">Что должно быть в карточке</h2>
            <ul className="mt-4 space-y-3">
              {[
                "Название: тип + модель + ключевой параметр («Наушники Tunn Pro с ANC»)",
                "Описание: для кого товар, что в комплекте, условия гарантии",
                "3–4 фото: общий план, детали, комплектация, упаковка",
                "Цена и старая цена: скидка −10…−30% работает лучше, чем −3%",
                "4–6 характеристик: размер, материал, питание, гарантия",
                "Реальный остаток и срок доставки: «нет в наличии» лучше, чем обещание без товара",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-gray-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/cabinet/products/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark"
            >
              <Package size={16} /> Создать первую карточку
            </Link>
          </div>

          <aside className="space-y-3">
            {RULES.map((rule) => (
              <div key={rule.title} className="rounded-2xl bg-surface/70 p-4">
                <p className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <rule.icon size={16} className="text-brand" /> {rule.title}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{rule.text}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-brand-soft p-4">
              <p className="flex items-center gap-2 text-[14px] font-bold text-brand">
                <ChartColumn size={16} /> Метрики в кабинете
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-700">
                Просмотры карточек, средний рейтинг, число заказов и «выручка» считаются
                по локальной базе — это реальные данные ваших товаров.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
