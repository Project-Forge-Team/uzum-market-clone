import type { Metadata } from "next";
import CheckoutView from "@/components/checkout/CheckoutView";
import { getCurrentUser, publicUser } from "@/lib/api-server";

export const metadata: Metadata = { title: "Оформление заказа" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const userRow = await getCurrentUser();
  return <CheckoutView initialUser={userRow ? publicUser(userRow) : null} />;
}
