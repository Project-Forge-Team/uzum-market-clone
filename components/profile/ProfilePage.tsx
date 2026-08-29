"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  Bell,
  Settings,
  LifeBuoy,
  Mail,
  Phone,
  CalendarDays,
  ChevronRight,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";

import { fetchMe, type UserProfile } from "@/lib/api";
import { authService } from "@/lib/auth-service";
import LogoutButton from "@/components/ui/LogoutButton";

function initials(user: UserProfile) {
  const first = user.first_name?.trim()?.[0] || "";
  const last = user.last_name?.trim()?.[0] || "";
  return (first + last || user.email?.[0] || "U").toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const menuItems = [
  { icon: PackageOpen, label: "Мои заказы", desc: "История и статусы заказов", href: "#orders" },
  { icon: Heart, label: "Избранное", desc: "Сохранённые товары", href: "#favorites" },
  { icon: ShoppingBag, label: "Корзина", desc: "Товары к покупке", href: "/" },
  { icon: MapPin, label: "Адреса доставки", desc: "Адреса и пункты выдачи", href: "#addresses" },
  { icon: CreditCard, label: "Способы оплаты", desc: "Карты и рассрочка", href: "#payment" },
  { icon: Bell, label: "Уведомления", desc: "Настройка push и SMS", href: "#notifications" },
  { icon: Settings, label: "Настройки", desc: "Язык, безопасность", href: "#settings" },
  { icon: LifeBuoy, label: "Поддержка", desc: "Помощь по заказам", href: "#support" },
];

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // На этапе SSR ещё нет браузерных cookies — профиль грузим на клиенте.
    let active = true;

    async function loadProfile() {
      try {
        const me = await fetchMe();
        if (!active) return;

        if (!me) {
          setError("Сессия не найдена или истекла.");
          setLoading(false);
          // Middleware уже мог пустить сюда только по cookie; на всякий случай
          // показываем ссылку на вход вместо автоматического редиректа.
          return;
        }

        setUser(me);
        const displayName = me.first_name || me.email?.split("@")[0] || "Профиль";
        authService.saveUserName(displayName);
        setError(null);
      } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
        if (!active) return;
        setError("Не удалось загрузить профиль. Попробуйте ещё раз.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-24 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <User className="mx-auto text-gray-400 mb-3" size={40} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Вы не авторизованы
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {error || "Чтобы увидеть личный кабинет, войдите в аккаунт."}
          </p>
          <Link
            href="/login?redirect=/profile"
            className="inline-flex items-center justify-center bg-[#7000FF] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#5a00cc] transition-colors"
          >
            Войти в аккаунт
          </Link>
        </div>
      </div>
    );
  }

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.email;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1240px] mx-auto px-4 py-6 md:py-8">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Личный кабинет
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Управляйте заказами, избранным и данными аккаунта
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Карточка пользователя */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#F0F0FF] border border-[#E2E0FF] flex items-center justify-center shrink-0">
              <span className="text-xl md:text-2xl font-extrabold text-[#7000FF]">
                {initials(user)}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {fullName}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={15} className="text-gray-400" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={15} className="text-gray-400" />
                    {user.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} className="text-gray-400" />
                  {formatDate(user.date_joined)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-sm font-medium rounded-xl px-4 py-3">
              <ShieldCheck size={18} />
              <span>Аккаунт подтверждён</span>
            </div>
          </div>
        </div>

        {/* Меню-плитки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#7000FF]/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[#F0F0FF] text-[#7000FF] flex items-center justify-center group-hover:bg-[#7000FF] group-hover:text-white transition-colors">
                    <Icon size={22} />
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 group-hover:text-[#7000FF] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{item.label}</h3>
                <p className="mt-1 text-sm text-gray-500 leading-snug">
                  {item.desc}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Данные профиля */}
        <section className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Персональные данные</h2>
            <span className="text-xs text-gray-400">
              Данные защищены и доступны только вам
            </span>
          </div>

          <dl className="divide-y divide-gray-100 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-6 py-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900 font-medium sm:col-span-2">
                {user.email}
              </dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-6 py-4">
              <dt className="text-gray-500">Имя</dt>
              <dd className="text-gray-900 font-medium sm:col-span-2">
                {user.first_name || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-6 py-4">
              <dt className="text-gray-500">Фамилия</dt>
              <dd className="text-gray-900 font-medium sm:col-span-2">
                {user.last_name || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-6 py-4">
              <dt className="text-gray-500">Телефон</dt>
              <dd className="text-gray-900 font-medium sm:col-span-2">
                {user.phone || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-6 py-4">
              <dt className="text-gray-500">Регистрация</dt>
              <dd className="text-gray-900 font-medium sm:col-span-2">
                {formatDate(user.date_joined)}
              </dd>
            </div>
          </dl>

          <div className="px-6 py-4 bg-gray-50/60 text-xs text-gray-400">
            Редактирование профиля появится вместе с write-эндпоинтом бэкенда
            (сейчас публичный API возвращает только чтение).
          </div>
        </section>
      </div>
    </main>
  );
}
