"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  MapPin,
  Store,
  LifeBuoy,
  ClipboardList,
} from "lucide-react";
import { useStoredValue } from "@/lib/use-stored-value";

const CITIES = [
  "Ташкент",
  "Самарканд",
  "Фергана",
  "Бухара",
  "Нукус",
  "Андижан",
  "Наманган",
  "Карши",
];

const CITY_KEY = "uzum:city";

export default function TopBar() {
  const [storedCity, storeCity] = useStoredValue(CITY_KEY, CITIES[0]);
  const city = CITIES.includes(storedCity) ? storedCity : CITIES[0];
  const [open, setOpen] = useState(false);

  const pickCity = (value: string) => {
    storeCity(value);
    setOpen(false);
  };

  return (
    <div className="bg-surface text-[13px] font-medium text-ink sm:text-[14px]">
      <div className="mx-auto flex h-9 w-full max-w-[1240px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 transition-opacity hover:opacity-70"
              aria-expanded={open}
            >
              <MapPin size={15} />
              <span className="underline decoration-dotted underline-offset-4">
                {city}
              </span>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {open && (
              <div className="absolute left-0 top-8 z-50 w-52 overflow-hidden rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-line">
                {CITIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => pickCity(item)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                      item === city
                        ? "bg-brand-soft font-semibold text-brand"
                        : "hover:bg-surface"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/help#pickup"
            className="hidden text-muted transition-colors hover:text-ink sm:inline-block"
          >
            Пункты выдачи
          </Link>
        </div>

        <div className="hidden items-center gap-2 text-[13px] font-semibold text-brand md:flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-dark" />
          Бесплатная доставка от 500 000 сум
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="hidden items-center gap-4 text-muted lg:flex">
            <Link
              href="/sell"
              className="flex items-center gap-1.5 font-medium text-brand transition-colors hover:text-brand-dark"
            >
              <Store size={14} /> Стать продавцом
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-1.5 transition-colors hover:text-ink"
            >
              <LifeBuoy size={14} /> Вопрос-ответ
            </Link>
            <Link
              href="/profile/orders"
              className="flex items-center gap-1.5 transition-colors hover:text-ink"
            >
              <ClipboardList size={14} /> Мои заказы
            </Link>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-brand ring-1 ring-brand-border sm:flex">
            RU
          </span>
        </div>
      </div>
    </div>
  );
}
