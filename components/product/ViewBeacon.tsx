"use client";

import { useEffect } from "react";
import { countProductView } from "@/lib/api";

/**
 * Счётчик просмотров: один POST на показ карточки. Держим на клиенте,
 * чтобы серверный рендер карточки не писал в «БД» во время билда.
 */
export default function ViewBeacon({ productId }: { productId: number }) {
  useEffect(() => {
    void countProductView(productId);
  }, [productId]);

  return null;
}
