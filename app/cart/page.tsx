import type { Metadata } from "next";
import CartView from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Корзина" };
export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartView />;
}
