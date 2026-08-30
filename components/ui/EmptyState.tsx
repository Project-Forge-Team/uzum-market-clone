import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  text,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-line">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon size={26} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      {text && <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {actionLabel}
        </Link>
      )}
      {secondaryHref && secondaryLabel && (
        <Link href={secondaryHref} className="mt-2.5 text-sm font-medium text-brand hover:underline">
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
