"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  CreditCard,
  LoaderCircle,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { createOrder, previewTotals } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import {
  COURIER_COST,
  FREE_DELIVERY_FROM,
  useCartTotals,
} from "@/lib/use-live-cart";
import { formatNumber } from "@/lib/format";
import type { UserProfile } from "@/types/product";

const PICKUP_POINTS = [
  "UZ-001 · Ташкент, ул. Амира Темура, 15",
  "UZ-014 · Ташкент, м. Мустакуллик, 3-й этаж",
  "UZ-027 · Самарканд, ул. Гагарина, 74",
  "UZ-041 · Фергана, ул. Алфетдин, 12",
];

const PAYMENTS = [
  {
    value: "card",
    label: "Картой при получении",
    icon: CreditCard,
    hint: "Uzcard · Humo · Payme",
  },
  {
    value: "cash",
    label: "Наличными курьеру",
    icon: Banknote,
    hint: "Только для курьерской доставки",
  },
  {
    value: "installment",
    label: "Рассрочка 0%",
    icon: ShieldCheck,
    hint: "12 месяцев, без переплаты",
  },
] as const;

/**
 * Оформление заказа. Данных о картах не собираем: заказ создаётся в локальной
 * «БД», списываются остатки, а покупатель получает номер и статус.
 */
export default function CheckoutView({
  initialUser,
}: {
  initialUser: UserProfile | null;
}) {
  const router = useRouter();
  const { clear } = useCart();
  const { user } = useSession();
  const { items, ready } = useCart();
  const { available, subtotal, loading } = useCartTotals();

  const [delivery, setDelivery] = useState<"courier" | "pickup">("courier");
  const [payment, setPayment] =
    useState<(typeof PAYMENTS)[number]["value"]>("card");
  const [address, setAddress] = useState(
    initialUser ? "г. Ташкент, ул. Шахристанская, 42, кв. 15" : "",
  );
  const [pickupPoint, setPickupPoint] = useState(PICKUP_POINTS[0]);
  const [comment, setComment] = useState("");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{
    discount: number;
    delivery_cost: number;
    total: number;
    promo_label: string | null;
  } | null>(null);

  // Считаем суммы на сервере — клиент не должен «догадываться» о промокодах.
  useEffect(() => {
    if (!subtotal) return;
    const timer = window.setTimeout(async () => {
      try {
        const next = await previewTotals({
          subtotal,
          delivery_method: delivery,
          promo_code: promo.trim(),
        });
        setTotals(next);
      } catch {
        setTotals(null);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [subtotal, delivery, promo]);

  const lines = useMemo(
    () =>
      available.map((line) => ({
        product_id: line.id,
        qty: Math.min(line.qty, line.product?.stock ?? line.qty),
      })),
    [available],
  );

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted">
        <LoaderCircle className="animate-spin" size={18} /> Проверяем корзину…
      </div>
    );
  }

  if (!items.length || !available.length) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Нечего оформлять"
          text="В корзине нет доступных к заказу товаров: она пуста или всё сняли с продажи."
          actionHref="/catalog"
          actionLabel="Выбрать товары"
        />
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }
    if (delivery === "courier" && address.trim().length < 8) {
      setError("Укажите адрес доставки — минимум 8 символов.");
      return;
    }
    setBusy(true);
    try {
      const order = await createOrder({
        items: lines,
        address: delivery === "courier" ? address : pickupPoint,
        pickup_point: delivery === "pickup" ? pickupPoint : "",
        delivery_method: delivery,
        payment_method: payment,
        comment,
        promo_code: promo.trim(),
      });
      clear();
      router.push(`/profile/orders/${order.id}?created=1`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось оформить заказ",
      );
      setBusy(false);
    }
  };

  const discount = totals?.discount ?? 0;
  const deliveryCost =
    totals?.delivery_cost ??
    (delivery === "courier" && subtotal < FREE_DELIVERY_FROM
      ? COURIER_COST
      : 0);
  const total = totals?.total ?? subtotal - discount + deliveryCost;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">Оформление заказа</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        Шаги: товары → доставка → оплата
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_352px]">
        <div className="space-y-4">
          <Card step={1} title="Контакты" icon={<UserIcon />}>
            {user ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field
                  label="Имя"
                  value={
                    [user.first_name, user.last_name]
                      .filter(Boolean)
                      .join(" ") || user.email
                  }
                  readOnly
                />
                <Field
                  label="Телефон"
                  value={user.phone || "не указан"}
                  readOnly
                />
                <p className="sm:col-span-2 text-[12.5px] text-muted">
                  Контакты взяты из профиля — поменять можно в{" "}
                  <Link
                    href="/profile/settings"
                    className="font-semibold text-brand hover:underline"
                  >
                    настройках
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-brand-soft p-4">
                <p className="text-[14px] font-semibold text-ink">
                  Заказ оформляют только аккаунты
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  Зарегистрируйтесь — это займёт минуту.
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  Зарегистрируйтесь — это займёт минуту.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/login?redirect=/checkout"
                    className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/register?redirect=/checkout"
                    className="rounded-lg bg-white px-4 py-2 text-[13px] font-bold text-brand ring-1 ring-brand-border"
                  >
                    Зарегистрироваться
                  </Link>
                </div>
              </div>
            )}
          </Card>

          <Card step={2} title="Доставка" icon={<MapPin />}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: "courier",
                    label: "Курьер до двери",
                    hint: `от ${formatNumber(COURIER_COST)} сум, бесплатно от ${formatNumber(FREE_DELIVERY_FROM)}`,
                  },
                  {
                    value: "pickup",
                    label: "Пункт выдачи",
                    hint: "бесплатно, заберите в течение 3 дней",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDelivery(option.value)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    delivery === option.value
                      ? "border-brand bg-brand-soft"
                      : "border-line hover:border-brand-border"
                  }`}
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    {option.value === "courier" ? (
                      <Store size={15} />
                    ) : (
                      <Package size={15} />
                    )}
                    {option.label}
                  </span>
                  <span className="mt-1 block text-[12.5px] text-muted">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>

            {delivery === "courier" ? (
              <label className="mt-3 block">
                <span className="text-[12.5px] font-semibold text-muted">
                  Адрес доставки
                </span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="город, улица, дом, квартира"
                  className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none transition-colors focus:border-brand"
                />
              </label>
            ) : (
              <label className="mt-3 block">
                <span className="text-[12.5px] font-semibold text-muted">
                  Пункт выдачи
                </span>
                <select
                  value={pickupPoint}
                  onChange={(event) => setPickupPoint(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] outline-none focus:border-brand"
                >
                  {PICKUP_POINTS.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-3 block">
              <span className="text-[12.5px] font-semibold text-muted">
                Комментарий курьеру
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Например: позвонить за 20 минут, домофон 15"
                className="mt-1 w-full resize-y rounded-xl border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
              />
            </label>
          </Card>

          <Card step={3} title="Оплата" icon={<CreditCard />}>
            <div className="space-y-2">
              {PAYMENTS.map((option) => {
                const disabled =
                  option.value === "cash" && delivery === "pickup";
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPayment(option.value)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-50 ${
                      payment === option.value
                        ? "border-brand bg-brand-soft"
                        : "border-line hover:border-brand-border"
                    }`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand ring-1 ring-line">
                      <option.icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">
                        {option.label}
                      </span>
                      <span className="block text-[12.5px] text-muted">
                        {disabled ? "недоступно для самовывоза" : option.hint}
                      </span>
                    </span>
                    {payment === option.value && (
                      <Check size={17} className="text-brand" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card
            step={4}
            title="Промокод"
            icon={<span className="text-[15px] font-black">%</span>}
          >
            <div className="flex flex-wrap gap-2">
              <input
                value={promo}
                onChange={(event) => setPromo(event.target.value.toUpperCase())}
                placeholder="STUDENT10"
                className="h-11 min-w-[180px] flex-1 rounded-xl border border-line px-3 text-[14px] uppercase outline-none focus:border-brand"
              />
              <span className="text-[12.5px] leading-snug text-muted sm:self-center">
                Пробные коды: <b>STUDENT10</b> (−10% от 200 000) и{" "}
                <b>UZUM2026</b> (−5%)
              </span>
            </div>
            {totals?.promo_label && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#EAF7EE] px-2.5 py-1.5 text-[12.5px] font-semibold text-green-700">
                <Check size={13} /> {totals.promo_label} применён
              </p>
            )}
          </Card>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <h2 className="text-[15px] font-bold text-ink">Ваш заказ</h2>
            <ul className="mt-3 max-h-[240px] space-y-2.5 overflow-y-auto pr-1">
              {available.map((line) => (
                <li key={line.id} className="flex gap-2.5">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={line.image}
                      alt={line.title}
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {line.title}
                    </span>
                    <span className="block text-[12px] text-muted">
                      {line.qty} × {formatNumber(line.price)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Товары</dt>
                <dd className="font-semibold">{formatNumber(subtotal)} сум</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Скидка по промокоду</dt>
                  <dd className="font-semibold text-green-600">
                    −{formatNumber(discount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Доставка</dt>
                <dd className="font-semibold">
                  {deliveryCost === 0
                    ? "бесплатно"
                    : `${formatNumber(deliveryCost)} сум`}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[14px] font-semibold text-gray-700">
                К оплате
              </span>
              <span className="text-[22px] font-extrabold text-ink">
                {formatNumber(total)}
              </span>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : null}
              {busy
                ? "Оформляем…"
                : user
                  ? "Подтвердить заказ"
                  : "Войти и оформить"}
            </button>
            <p className="mt-2.5 text-[11.5px] leading-snug text-muted">
              Нажимая кнопку, вы соглашаетесь с условиями оформления заказа.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function UserIcon() {
  return <span className="text-[15px] font-black">☺</span>;
}

function Card({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-[13px] font-bold text-white">
          {step}
        </span>
        <span className="text-gray-500">{icon}</span>
        {title}
      </h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-muted">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-surface/50 px-3 text-[14px] text-ink outline-none"
      />
    </label>
  );
}
