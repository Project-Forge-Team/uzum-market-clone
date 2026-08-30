"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, RotateCcw, X } from "lucide-react";
import { resetDemoData } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useStoredValue } from "@/lib/use-stored-value";

const KEY = "uzum:demo-notice-dismissed";

/**
 * Честная плашка о том, что это учебный проект: свои данные, свой API.
 * Плюс кнопка отката демо-базы — удобно, когда наэкспериментировались.
 */
export default function DemoNotice() {
  const [dismissed, setDismissed] = useStoredValue(KEY, "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();

  if (dismissed === "1") return null;

  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[12.5px]">
        <Info size={15} className="shrink-0 text-accent" />
        <span className="font-medium">
          Учебный клон Uzum Market: товары, отзывы и заказы живут в локальной демо-базе,
          оплата отключена.
        </span>
        <Link href="/sell" className="font-semibold text-accent hover:underline">
          Как продавать →
        </Link>
        <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {error && (
            <span className="text-[12px] font-semibold text-accent">{error}</span>
          )}
          {/* Сброс доступен вошедшему аккаунту — ровно как самому API. */}
          {user && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await resetDemoData();
                  window.location.reload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Не удалось сбросить");
                } finally {
                  setBusy(false);
                }
              }}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 font-medium transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <RotateCcw size={13} /> {busy ? "Сброс…" : "Сбросить демо-данные"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed("1")}
            className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Скрыть уведомление"
          >
            <X size={14} />
          </button>
        </span>
      </div>
    </div>
  );
}
