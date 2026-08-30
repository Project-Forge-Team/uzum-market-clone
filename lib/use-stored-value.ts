"use client";

import { useSyncExternalStore } from "react";

/**
 * Чтение localStorage через useSyncExternalStore.
 *
 * Так значения из «хранилища браузера» не ломают гидрацию: серверный рендер
 * и первый клиентский рендер используют getServerSnapshot (fallback), а
 * реальное значение подтягивается сразу после гидрации. Плюс все виджеты
 * (город, баннер-уведомление) синхронизируются между табами через событие.
 */
const SYNC_EVENT = "uzum:local-store";

export function readStored(key: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // приватный режим / переполнение — тихо игнорируем, UI работает и так
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SYNC_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SYNC_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useStoredValue(key: string, fallback = ""): readonly [string, (v: string | null) => void] {
  const value = useSyncExternalStoreSync(key, fallback);
  return [value, (next) => writeStored(key, next)] as const;
}

function useSyncExternalStoreSync(key: string, fallback: string): string {
  // вынесено в отдельный хук, чтобы useSyncExternalStore вызывался наверху компонента
  return useSyncExternalStore(
    subscribe,
    () => readStored(key, fallback),
    () => fallback,
  );
}
