import Link from "next/link";

const COLUMNS = [
  {
    title: "Покупателям",
    links: [
      { href: "/help#delivery", label: "Доставка и оплата" },
      { href: "/help#returns", label: "Возврат товара" },
      { href: "/help#faq", label: "Вопросы и ответы" },
      { href: "/help#pickup", label: "Пункты выдачи" },
    ],
  },
  {
    title: "Мой Uzum",
    links: [
      { href: "/profile", label: "Личный кабинет" },
      { href: "/profile/orders", label: "Мои заказы" },
      { href: "/favorites", label: "Избранное" },
      { href: "/cart", label: "Корзина" },
      { href: "/profile/reviews", label: "Мои отзывы" },
    ],
  },
  {
    title: "Продавцам",
    links: [
      { href: "/sell", label: "Продавать на Uzum" },
      { href: "/cabinet", label: "Кабинет продавца" },
      { href: "/cabinet/products/new", label: "Добавить товар" },
      { href: "/sellers", label: "Магазины" },
      { href: "/help#sellers", label: "Правила для магазинов" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white pb-24 pt-10 md:pb-8">
      <div className="mx-auto w-full max-w-[1240px] px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3.5 text-[15px] font-bold text-ink">
                {column.title}
              </h3>
              <ul className="space-y-2.5 text-sm text-muted">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-9 flex flex-col justify-between gap-3 border-t border-line pt-5 text-xs text-gray-400 md:flex-row">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <Link
              href="/help#terms"
              className="transition-colors hover:text-gray-600"
            >
              Пользовательское соглашение
            </Link>
            <Link
              href="/help#terms"
              className="transition-colors hover:text-gray-600"
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="/sell"
              className="transition-colors hover:text-gray-600"
            >
              Партнёрская программа
            </Link>
          </div>
          <p>© 2026 Uzum Market</p>
        </div>
      </div>
    </footer>
  );
}
