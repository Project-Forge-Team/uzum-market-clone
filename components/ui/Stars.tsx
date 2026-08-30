import { Star } from "lucide-react";
import { reviewsWord } from "@/lib/format";

/** Звёздный рейтинг: 5 иконок с дробным заполнением через градиент. */
export default function Stars({
  value,
  size = 14,
  showValue = true,
  reviews,
  className = "",
}: {
  value: number;
  size?: number;
  showValue?: boolean;
  reviews?: number;
  className?: string;
}) {
  const rating = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-[2px]">
        {[0, 1, 2, 3, 4].map((index) => {
          const fillRatio = Math.max(0, Math.min(1, rating - index));
          return (
            <span
              key={index}
              className="relative inline-flex"
              style={{ width: size, height: size }}
            >
              <Star
                size={size}
                className="absolute inset-0 text-gray-300"
                strokeWidth={1.5}
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillRatio * 100}%` }}
              >
                <Star
                  size={size}
                  className="absolute left-0 top-0 fill-[#FFB800] text-[#FFB800]"
                  strokeWidth={1.5}
                />
              </span>
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-[13px] font-semibold text-ink">
          {rating > 0 ? rating.toFixed(1).replace(".", ",") : "—"}
        </span>
      )}
      {reviews !== undefined && (
        <span className="text-[13px] text-muted">· {reviewsWord(reviews)}</span>
      )}
    </div>
  );
}
