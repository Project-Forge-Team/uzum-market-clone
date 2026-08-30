import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import OrderCard from "@/components/profile/OrderCard";
import OrderTimeline from "@/components/profile/OrderTimeline";
import { getCurrentUser, getOrderForUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заказ" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) return null;

  const order = await getOrderForUser(Number(id), user.id);
  if (!order) notFound();

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-[13px] text-muted">
        <Link href="/profile" className="hover:text-brand">
          Кабинет
        </Link>
        <ChevronRight size={13} className="text-gray-300" />
        <Link href="/profile/orders" className="hover:text-brand">
          Заказы
        </Link>
        <ChevronRight size={13} className="text-gray-300" />
        <span className="text-gray-700">{order.number}</span>
      </nav>

      {sp.created === "1" && (
        <div className="rounded-2xl bg-[#EAF7EE] p-4 text-[14px] font-semibold text-green-800 ring-1 ring-green-100">
          Заказ {order.number} оформлен 🎉 Он сразу появился у продавца —
          зайдите в кабинет продавца, чтобы перевести заказ на следующий статус.
        </div>
      )}

      <OrderCard order={order} detailed />
      <OrderTimeline order={order} />
    </div>
  );
}
