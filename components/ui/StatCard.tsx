import type { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "brand" | "accent" | "neutral";
}) {
  const tones = {
    brand: "bg-brand-soft text-brand",
    accent: "bg-[#F3FBD6] text-[#5E7A00]",
    neutral: "bg-surface text-gray-600",
  } as const;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <p className="mt-3 text-xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-gray-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
