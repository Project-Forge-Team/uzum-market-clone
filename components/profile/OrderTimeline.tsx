import { Clock } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABELS, type ShopOrder } from "@/types/product";

/** История статусов заказа — как трек-номер в настоящем маркетплейсе. */
export default function OrderTimeline({ order }: { order: ShopOrder }) {
  if (!order.timeline?.length) return null;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="text-[15px] font-bold text-ink">История заказа</h2>
      <ol className="mt-3 space-y-3">
        {order.timeline.map((event, index) => (
          <li key={`${event.at}-${index}`} className="flex gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Clock size={14} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-ink">
                {ORDER_STATUS_LABELS[event.status]}
              </p>
              <p className="text-[12.5px] text-muted">
                {event.note} · {formatDateTime(event.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
