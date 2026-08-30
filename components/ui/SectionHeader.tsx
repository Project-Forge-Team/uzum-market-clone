import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel,
  icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink md:text-2xl">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand sm:flex"
        >
          {linkLabel}
          <ChevronRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
