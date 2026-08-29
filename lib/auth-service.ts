const USER_NAME_KEY = "uzum_user_name";

/**
 * Токены живут в HttpOnly cookies и JavaScript их не видит.
 * Поэтому authService хранит только удобный индикатор текущего пользователя
 * (локальное имя для шапки), а настоящий статус сессии проверяется
 * через `fetchMe()` (server отдаёт 401, если cookies нет/истекли).
 */
export const authService = {
  saveUserName(name: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_NAME_KEY, name);
  },

  getUserName(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(USER_NAME_KEY);
  },

  /** Токены нельзя прочитать из JS, поэтому «авторизован» определяем по API. */
  isAuthenticated(): boolean {
    return false;
  },

  /** Удаляем только локальный пользовательский индикатор (cookies чистит бэкенд). */
  clearUserState() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(USER_NAME_KEY);
  },

  /** Совместимость со старым кодом. */
  clearTokens() {
    this.clearUserState();
  },
};

/** Событие: сессия изменилась (login / logout) — слушает Header */
export const AUTH_CHANGE_EVENT = "uzum:auth-change";

export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}
