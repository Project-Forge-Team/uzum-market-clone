"use client";

/**
 * Сессия пользователя на клиенте.
 *
 * Server Component получает пользователя из cookie (lib/server/auth) и
 * отдаёт его в провайдер как initialUser — первый рендер уже правильный,
 * без «мигания» шапки. Дальше состояние обновляется по событию
 * AUTH_CHANGE_EVENT (после входа/выхода) и при переключении вкладок.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AUTH_CHANGE_EVENT, fetchMe, notifyAuthChange } from "@/lib/api";
import type { UserProfile } from "@/types/product";

interface SessionValue {
  user: UserProfile | null;
  loading: boolean;
  isSeller: boolean;
  refresh: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  requireAuth: (redirectTo?: string) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: UserProfile | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const handler = async () => {
      const me = await fetchMe();
      if (active) setUser(me);
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // Синхронизируем SSR-состояние, если на клиенте сессия оказалась другой.
  useEffect(() => {
    if (initialUser === null && user === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- сверяем SSR-пользователя с кукой после гидрации
    if (initialUser?.id !== user?.id) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser?.id]);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      isSeller: !!user?.seller_id,
      refresh,
      setUser,
      requireAuth: (redirectTo?: string) => {
        if (user) return true;
        // requireAuth вызывается из обработчиков кликов, поэтому достаточно push().
        const target = redirectTo ?? window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(target)}`);
        return false;
      },
    }),
    [user, loading, refresh, router],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession можно вызывать только внутри <SessionProvider>");
  }
  return ctx;
}

export { notifyAuthChange };
