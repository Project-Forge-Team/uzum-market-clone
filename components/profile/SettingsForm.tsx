"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, RotateCcw, Save, ShieldAlert } from "lucide-react";
import LogoutButton from "@/components/ui/LogoutButton";
import { changePassword, resetDemoData, updateMe } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useCart } from "@/lib/cart";
import type { UserProfile } from "@/types/product";

/** Настройки аккаунта: контакты, пароль и «опасная зона» для демо-данных. */
export default function SettingsForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { setUser } = useSession();
  const { showToast } = useCart();

  const [form, setForm] = useState({
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? "",
    email: user.email,
  });
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", repeat: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input =
    "mt-1 h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none transition-colors focus:border-brand";

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMe(form);
      setUser(updated);
      showToast("Профиль обновлён");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setError(null);
    if (passwordForm.next !== passwordForm.repeat) {
      setError("Новый пароль и подтверждение не совпадают");
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", repeat: "" });
      showToast("Пароль изменён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить пароль");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-bold text-ink">Персональные данные</h2>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">Имя</span>
            <input
              className={input}
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">Фамилия</span>
            <input
              className={input}
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">Email для входа</span>
            <input
              className={input}
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">Телефон</span>
            <input
              className={input}
              value={form.phone}
              placeholder="+998 90 123 45 67"
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
          Сохранить
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <KeyRound size={16} className="text-brand" /> Смена пароля
        </h2>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
          <input
            className="h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-brand"
            type="password"
            placeholder="Текущий пароль"
            value={passwordForm.current}
            onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
          />
          <input
            className="h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-brand"
            type="password"
            placeholder="Новый, от 8 символов"
            value={passwordForm.next}
            onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
          />
          <input
            className="h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-brand"
            type="password"
            placeholder="Повторите новый"
            value={passwordForm.repeat}
            onChange={(event) => setPasswordForm({ ...passwordForm, repeat: event.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={savePassword}
          disabled={passwordBusy || passwordForm.next.length < 8}
          className="mt-3 rounded-xl bg-ink px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand disabled:opacity-50"
        >
          {passwordBusy ? "Меняем…" : "Обновить пароль"}
        </button>
        <p className="mt-2 text-[12px] text-muted">
          Пароль хранится как scrypt-хэш с солью — в открытом виде нигде.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <ShieldAlert size={16} className="text-[#B45318]" /> Безопасность и демо
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <LogoutButton />
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Вернуть демо-каталог к исходному состоянию?")) return;
              await resetDemoData();
              window.location.reload();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-line transition-colors hover:bg-surface"
          >
            <RotateCcw size={14} /> Сбросить демо-данные
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          В демо-режиме все аккаунты и товары живут в файле .data/db.json. Сброс
          вернёт исходный каталог, удалит ваши товары и отзывы.
        </p>
      </section>
    </div>
  );
}
