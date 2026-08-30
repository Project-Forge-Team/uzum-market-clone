import type { Metadata } from "next";
import CheckoutView from "@/components/checkout/CheckoutView";
import { getCurrentUser } from "@/lib/server/data";

export const metadata: Metadata = { title: "Оформление заказа" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return <CheckoutView initialUser={user} />;
}
