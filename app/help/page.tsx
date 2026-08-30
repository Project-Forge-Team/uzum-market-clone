import Link from "next/link";
import {
  Banknote,
  CircleHelp,
  MapPin,
  Package,
  RefreshCcw,
  Store,
  Truck,
} from "lucide-react";
import FaqAccordion, { type FaqItem } from "@/components/help/FaqAccordion";

export const metadata = {
  title: "Помощь и вопросы",
  description:
    "Доставка, оплата, возврат, пункты выдачи и правила для магазинов.",
};

const FAQ: FaqItem[] = [
  {
    q: "Почему в корзине цены иногда меняются?",
    a: "Корзина и избранное хранятся в браузере, а при открытии страницы цены и остатки сверяются с каталогом. Если продавец изменил цену или снял товар, вы увидите это сразу.",
  },
  {
    q: "Можно ли оставить отзыв без заказа?",
    a: "Любой аккаунт может оставить отзыв. Но у отзыва, оставленного покупателем с подтверждённым заказом, появляется значок «заказ подтверждён».",
  },
  {
    q: "Как продать свой товар?",
    a: "Зарегистрируйтесь, зайдите в «Кабинет продавца» и нажмите «Добавить товар». Нужны название от 8 символов, описание от 20 символов, цена, остаток и минимум одно фото. Товар сразу появляется в каталоге и поиске.",
  },
  {
    q: "Что будет, если удалить товар с отзывами?",
    a: "Вместе с карточкой удаляются и отзывы о ней — так делает и настоящий маркетплейс. Если хотите сделать перерыв, лучше «Снять с продажи»: карточка останется, но исчезнет из каталога.",
  },
  {
    q: "Почему заказ не приходит на почту?",
    a: "Email и СМС уведомления не подключены. Заказ сохраняется в базе данных, списывает остатки и отображается в «Мои заказы» у покупателя и в заказах магазина у продавца.",
  },
  {
    q: "Где хранятся данные?",
    a: "Данные хранятся локально в браузере и на сервере. Кнопка «Сбросить данные» в настройках профиля возвращает исходный каталог.",
  },
];

const PICKUP_POINTS = [
  {
    code: "UZ-001",
    city: "Ташкент",
    address: "ул. Амира Темура, 15",
    hours: "09:00–21:00",
    stock: "есть",
  },
  {
    code: "UZ-014",
    city: "Ташкент",
    address: "м. Мустакуллик, ТЦ City Mall, 3 этаж",
    hours: "10:00–22:00",
    stock: "есть",
  },
  {
    code: "UZ-027",
    city: "Самарканд",
    address: "ул. Гагарина, 74",
    hours: "09:00–20:00",
    stock: "под заказ",
  },
  {
    code: "UZ-041",
    city: "Фергана",
    address: "ул. Алфетдин, 12",
    hours: "09:00–19:00",
    stock: "есть",
  },
  {
    code: "UZ-055",
    city: "Нукус",
    address: "пр-т Азатлык, 5",
    hours: "10:00–20:00",
    stock: "под заказ",
  },
];

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
        <Icon size={17} className="text-brand" /> {title}
      </h2>
      <div className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-8">
      <header className="mb-8 max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand">
          <CircleHelp size={13} /> Поддержка
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink md:text-4xl">
          Как пользоваться маркетплейсом
        </h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">
          Доставка, оплата, возврат, пункты выдачи и правила для магазинов.
          Ответов не нашли — напишите в поддержку.
        </p>
      </header>

      <div
        id="delivery"
        className="grid scroll-mt-24 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <InfoCard icon={Truck} title="Доставка">
          <p>Курьер по Ташкенту — на следующий день, по стране 2–5 дней.</p>
          <p>
            Бесплатно от 500 000 сум, иначе 25 000 сум. Порог и стоимость
            считаются на сервере, а не «на глаз».
          </p>
          <p>Самовывоз из пункта выдачи — бесплатно, хранится 3 дня.</p>
        </InfoCard>
        <InfoCard icon={Banknote} title="Оплата">
          <p>
            Картой при получении (Uzcard, Humo, Payme), наличными курьеру или в
            рассрочку 0% на 12 месяцев.
          </p>
          <p className="rounded-lg bg-[#FFF4E5] px-3 py-2 text-[12.5px] font-medium text-[#9A5B00]">
            Платёж при получении: деньги передаются курьеру или в пункте выдачи.
          </p>
        </InfoCard>
        <InfoCard icon={RefreshCcw} title="Возврат">
          <p>14 дней, если товар не использовался и сохранена упаковка.</p>
          <p>
            Брак и пересорт — за счёт магазина: покупатель описывает проблему в
            заказе, продавец подтверждает.
          </p>
          <p>
            Статус заказа меняется на «отменён», остатки возвращаются на склад
            магазина.
          </p>
        </InfoCard>
        <InfoCard icon={Package} title="Гарантия и чек">
          <p>
            Гарантию даёт магазин: от 12 месяцев на технику, 30 дней на одежду и
            обувь.
          </p>
          <p>
            Электронный чек — в карточке заказа, вместе с историей статусов.
          </p>
        </InfoCard>
      </div>

      <section id="pickup" className="mt-8 scroll-mt-24">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
          <MapPin size={18} className="text-brand" /> Пункты выдачи
        </h2>
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="bg-surface/70 text-[12px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Город</th>
                <th className="px-4 py-3">Адрес</th>
                <th className="px-4 py-3">Часы работы</th>
                <th className="px-4 py-3">Наличие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PICKUP_POINTS.map((point) => (
                <tr
                  key={point.code}
                  className="transition-colors hover:bg-brand-soft/40"
                >
                  <td className="px-4 py-3 font-bold text-ink">{point.code}</td>
                  <td className="px-4 py-3">{point.city}</td>
                  <td className="px-4 py-3">{point.address}</td>
                  <td className="px-4 py-3 text-muted">{point.hours}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${
                        point.stock === "есть"
                          ? "bg-[#EAF7EE] text-green-700"
                          : "bg-[#FFF4E5] text-[#9A5B00]"
                      }`}
                    >
                      {point.stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="sellers"
        className="mt-8 scroll-mt-24 rounded-2xl bg-ink p-6 text-white md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Store size={19} className="text-accent" /> Правила для магазинов
            </h2>
            <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-white/75">
              <li>
                · Карточка без фото или с ценой «для проверки» снимается с
                публикации.
              </li>
              <li>
                · Остаток должен совпадать со складом: заказ из «нуля»
                отменяется автоматически.
              </li>
              <li>
                · Ответ на отзыв — в течение 24 часов; отзывы не удаляются за
                низкую оценку.
              </li>
              <li>
                · Скидка «до» не может быть ниже цены продажи — иначе бейдж не
                показывается.
              </li>
            </ul>
          </div>
          <Link
            href="/sell"
            className="rounded-xl bg-accent px-5 py-3 text-[13.5px] font-bold text-ink transition-colors hover:bg-white"
          >
            Стать продавцом
          </Link>
        </div>
      </section>

      <section id="faq" className="mt-8 scroll-mt-24">
        <h2 className="mb-4 text-lg font-bold text-ink">Частые вопросы</h2>
        <FaqAccordion items={FAQ} />
      </section>

      <section
        id="terms"
        className="mt-8 scroll-mt-24 rounded-2xl bg-surface/70 p-6 text-[13px] leading-relaxed text-gray-700"
      >
        <h2 className="text-[15px] font-bold text-ink">
          Соглашения и конфиденциальность
        </h2>
        <p className="mt-2.5">
          Сайт не является официальным ресурсом Uzum и не принимает платежи.
          Email, телефон и пароль, которые вы указываете при регистрации,
          хранятся в локальной базе — не используйте настоящие данные карт и
          пароли от других сервисов.
        </p>
        <p className="mt-2">
          Товары, фото и тексты в каталоге — вымышленные, сгенерированы для
          демонстрации интерфейса. Загрузить свои картинки можно через кабинет
          продавца.
        </p>
      </section>
    </div>
  );
}
