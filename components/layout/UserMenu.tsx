"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Heart,
  LogOut,
  Package,
  Settings,
  Store,
  User,
} from "lucide-react";
import { logoutUser } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { UserProfile } from "@/types/product";

/** Меню пользователя в шапке: профиль, заказы, кабинет продавца, выход. */
export default function UserMenu({
  user,
  displayName,
}: {
  user: UserProfile;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { setUser } = useSession();

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const logout = async () => {
    setBusy(true);
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setOpen(false);
      setBusy(false);
      router.refresh();
      router.push("/");
    }
  };

  const initials =
    ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() ||
    user.email.slice(0, 1).toUpperCase();

  const items = [
    { href: "/profile", label: "Личный кабинет", icon: User },
    { href: "/profile/orders", label: "Мои заказы", icon: Package },
    { href: "/favorites", label: "Избранное", icon: Heart },
    { href: "/cabinet", label: "Кабинет продавца", icon: Store },
    { href: "/profile/settings", label: "Настройки", icon: Settings },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 transition-colors hover:text-brand"
        aria-expanded={open}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-[12px] font-bold uppercase text-brand">
          {initials}
        </span>
        <span className="hidden max-w-[110px] truncate text-[14px] font-medium lg:inline">
          {displayName}
        </span>
        <ChevronDown size={14} className="hidden text-muted lg:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl bg-white p-2 shadow-xl ring-1 ring-line">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] text-gray-700 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut size={16} />
            {busy ? "Выходим…" : "Выйти"}
          </button>
        </div>
      )}
    </div>
  );
}
