"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";
import { DEMO_ACCOUNTS } from "@/lib/demo";

/** Подсказка с готовыми аккаунтами: клик — и поля формы заполнены. */
export default function DemoAccounts({
  onPick,
}: {
  onPick: (email: string, password: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-surface/70 p-3.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <FlaskConical size={16} className="shrink-0 text-brand" />
        <span className="flex-1 text-[13px] font-semibold text-ink">
          Демо-аккаунты: нажмите, чтобы заполнить форму
        </span>
        <ChevronDown
          size={15}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="mt-3 space-y-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => {
                  onPick(account.email, account.password);
                  setOpen(false);
                }}
                className="w-full rounded-xl bg-white px-3 py-2.5 text-left transition-colors hover:ring-1 hover:ring-brand-border"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-ink">{account.role}</span>
                  <span className="font-mono text-[11.5px] text-brand">{account.email}</span>
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">{account.hint}</span>
                <span className="mt-1 block font-mono text-[11px] text-gray-400">
                  пароль: {account.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
