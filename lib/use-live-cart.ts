"use client";

/**
 * Корзина и избранное лежат в localStorage как снапшоты, но показывать мы
 * должны актуальные цену/остаток. Хук один раз по заходу тянет товары через
 * GET /products?ids=… и помечает то, чего уже нет в продаже.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/lib/api";
import { useCart, type CartLine } from "@/lib/cart";
import type { Product } from "@/types/product";

export interface LiveLine {
  id: number;
  qty: number;
  title: string;
  image: string;
  price: number;
  old_price: number | null;
  product: Product | null;
  missing: boolean;
  unavailable: boolean;
}

function merge(lines: CartLine[], products: Product[]): LiveLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return lines.map((line) => {
    const product = byId.get(line.id) ?? null;
    const price = product?.price ?? line.price;
    return {
      id: line.id,
      qty: line.qty,
      title: product?.title ?? line.title,
      image: product?.image ?? line.image,
      price,
      old_price: product?.old_price ?? line.old_price ?? null,
      product,
      missing: !product,
      unavailable: !!product && (!product.in_stock || product.status !== "active"),
    };
  });
}

export function useLiveLines(lines: CartLine[], ready: boolean) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(lines.length > 0);
  const [error, setError] = useState<string | null>(null);

  const idsKey = useMemo(
    () =>
      lines
        .map((line) => line.id)
        .sort((a, b) => a - b)
        .join(","),
    [lines],
  );

  const refresh = useCallback(async () => {
    if (!idsKey) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchProducts({
        ids: idsKey.split(",").map(Number),
        page_size: 60,
      });
      setProducts(data.results);
      setError(null);
    } catch {
      setError("Не удалось проверить цены и остатки — показываем сохранённые.");
    } finally {
      setLoading(false);
    }
  }, [idsKey]);

  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- запрос к API после готовности локальной корзины
    void refresh();
  }, [ready, refresh]);

  const live = merge(lines, products ?? []);
  const available = live.filter((line) => !line.missing && !line.unavailable);
  const subtotal = available.reduce((acc, line) => acc + line.price * line.qty, 0);
  const savings = available.reduce(
    (acc, line) =>
      acc + (line.old_price && line.old_price > line.price ? (line.old_price - line.price) * line.qty : 0),
    0,
  );

  return { live, available, loading, error, refresh, subtotal, savings };
}

export function useCartTotals() {
  const { items, ready } = useCart();
  return useLiveLines(items, ready);
}

export function useFavoritesTotals() {
  const { favorites, ready } = useCart();
  return useLiveLines(favorites, ready);
}

export const FREE_DELIVERY_FROM = 500_000;
export const COURIER_COST = 25_000;
