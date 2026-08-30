"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

/** Аккордеон «вопрос-ответ»: открыт один элемент, как в поддержке Uzum. */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <li key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[14.5px] font-semibold text-ink">{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180 text-brand" : ""}`}
              />
            </button>
            {expanded && (
              <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-gray-700">{item.a}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
