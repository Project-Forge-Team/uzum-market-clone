"use client";

/**
 * Корзина и избранное.
 *
 * Храним снапшот товара в localStorage: корзина живёт без сети и без
 * лишних запросов, а страница корзины сверяет цены и остатки через
 * GET /products?ids=… . При входе анонимная корзина объединяется с
 * корзиной пользователя.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/session";
import type { Product } from "@/types/product";

export interface CartLine {
  id: number;
  qty: number;
  title: string;
  image: string;
  price: number;
  old_price?: number | null;
  stock?: number;
  seller_id?: number;
  seller_name?: string;
  delivery_time?: string;
}

export interface CartProductInput {
  id: number;
  title: string;
  image: string;
  price: number;
  old_price?: number | null;
  stock?: number;
  seller_id?: number;
  seller_name?: string;
  delivery_time?: string;
}

const CART_PREFIX = "uzum:cart:v1:";
const FAV_PREFIX = "uzum:fav:v1:";
const MAX_QTY = 20;

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* переполнение приватного режима игнорируем */
  }
}

function snapshot(product: Product): CartProductInput {
  return {
    id: product.id,
    title: product.title,
    image: product.image,
    price: product.price,
    old_price: product.old_price,
    stock: product.stock,
    seller_id: product.seller?.id,
    seller_name: product.seller?.name,
    delivery_time: product.delivery_time,
  };
}

interface CartValue {
  items: CartLine[];
  favorites: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  toast: string | null;
  add: (product: CartProductInput | Product, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  inCart: (id: number) => boolean;
  qtyInCart: (id: number) => number;
  toggleFavorite: (product: CartProductInput | Product) => void;
  isFavorite: (id: number) => boolean;
  showToast: (message: string) => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const scope = user ? `u${user.id}` : "anon";
  const cartKey = `${CART_PREFIX}${scope}`;
  const favKey = `${FAV_PREFIX}${scope}`;

  const [items, setItems] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  // Загрузка + объединение анонимной корзины при входе в аккаунт.
  /* eslint-disable react-hooks/set-state-in-effect -- localStorage читаем только после гидрации, иначе серверный HTML разойдётся с клиентским */
  useEffect(() => {
    const cart = readList<CartLine>(cartKey);
    const fav = readList<CartLine>(favKey);

    if (user) {
      const anonCart = readList<CartLine>(`${CART_PREFIX}anon`);
      const anonFav = readList<CartLine>(`${FAV_PREFIX}anon`);
      if (anonCart.length) {
        const merged = [...cart];
        for (const line of anonCart) {
          const found = merged.find((x) => x.id === line.id);
          if (found) found.qty = Math.min(MAX_QTY, found.qty + line.qty);
          else merged.push(line);
        }
        setItems(merged);
        writeList(cartKey, merged);
        writeList(`${CART_PREFIX}anon`, []);
      }
      if (anonFav.length) {
        const merged = [...fav];
        for (const line of anonFav) {
          if (!merged.some((x) => x.id === line.id)) merged.push(line);
        }
        setFavorites(merged);
        writeList(favKey, merged);
        writeList(`${FAV_PREFIX}anon`, []);
      }
    } else {
      setItems(cart);
      setFavorites(fav);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Синхронизация между вкладками.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === cartKey) setItems(readList<CartLine>(cartKey));
      if (event.key === favKey) setFavorites(readList<CartLine>(favKey));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cartKey, favKey]);

  const persistItems = useCallback(
    (next: CartLine[]) => {
      setItems(next);
      writeList(cartKey, next);
    },
    [cartKey],
  );

  const persistFavorites = useCallback(
    (next: CartLine[]) => {
      setFavorites(next);
      writeList(favKey, next);
    },
    [favKey],
  );

  const add = useCallback(
    (product: CartProductInput | Product, qty = 1) => {
      const source =
        "seller" in product && product.seller
          ? snapshot(product as Product)
          : (product as CartProductInput);
      const found = items.find((line) => line.id === source.id);
      const max = source.stock ? Math.min(MAX_QTY, source.stock) : MAX_QTY;
      if (found) {
        persistItems(
          items.map((line) =>
            line.id === source.id
              ? { ...line, qty: Math.min(max, line.qty + qty) }
              : line,
          ),
        );
      } else {
        persistItems([...items, { ...source, qty: Math.min(max, qty) }]);
      }
      showToast(`«${source.title.slice(0, 40)}» в корзине`);
    },
    [items, persistItems, showToast],
  );

  const setQty = useCallback(
    (id: number, qty: number) => {
      if (qty <= 0) {
        persistItems(items.filter((line) => line.id !== id));
        return;
      }
      persistItems(
        items.map((line) =>
          line.id === id
            ? {
                ...line,
                qty: Math.min(MAX_QTY, line.stock ? Math.min(qty, line.stock) : qty),
              }
            : line,
        ),
      );
    },
    [items, persistItems],
  );

  const remove = useCallback(
    (id: number) => {
      persistItems(items.filter((line) => line.id !== id));
      showToast("Товар убран из корзины");
    },
    [items, persistItems, showToast],
  );

  const clear = useCallback(() => {
    persistItems([]);
  }, [persistItems]);

  const toggleFavorite = useCallback(
    (product: CartProductInput | Product) => {
      const source =
        "seller" in product && product.seller
          ? snapshot(product as Product)
          : (product as CartProductInput);
      const exists = favorites.some((line) => line.id === source.id);
      persistFavorites(
        exists
          ? favorites.filter((line) => line.id !== source.id)
          : [...favorites, { ...source, qty: 1 }],
      );
      showToast(exists ? "Убрано из избранного" : "Добавлено в избранное");
    },
    [favorites, persistFavorites, showToast],
  );

  const value = useMemo<CartValue>(
    () => ({
      items,
      favorites,
      ready,
      toast,
      count: items.reduce((acc, line) => acc + line.qty, 0),
      subtotal: items.reduce((acc, line) => acc + line.price * line.qty, 0),
      add,
      setQty,
      remove,
      clear,
      inCart: (id: number) => items.some((line) => line.id === id),
      qtyInCart: (id: number) => items.find((line) => line.id === id)?.qty ?? 0,
      toggleFavorite,
      isFavorite: (id: number) => favorites.some((line) => line.id === id),
      showToast,
    }),
    [
      items,
      favorites,
      ready,
      toast,
      add,
      setQty,
      remove,
      clear,
      toggleFavorite,
      showToast,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartToast toast={toast} />
    </CartContext.Provider>
  );
}

function CartToast({ toast }: { toast: string | null }) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 bottom-6 z-[80] -translate-x-1/2 transition-all duration-200 ${
        toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="rounded-xl bg-[#1F1F1F]/95 px-4 py-3 text-sm font-medium text-white shadow-xl">
        {toast ?? ""}
      </div>
    </div>
  );
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart можно вызывать только внутри <CartProvider>");
  return ctx;
}

export { MAX_QTY };
