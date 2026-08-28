import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "uzum_access_token";
const REFRESH_TOKEN_KEY = "uzum_refresh_token";

const isSecure =
  typeof window !== "undefined" && window.location.protocol === "https:";

const cookieBase = {
  path: "/",
  sameSite: "lax" as const,
  secure: isSecure,
};

export const authService = {
  saveTokens: (access: string, refresh: string) => {
    // access ~ 1 час, refresh ~ 7 дней
    Cookies.set(ACCESS_TOKEN_KEY, access, { ...cookieBase, expires: 1 / 24 });
    Cookies.set(REFRESH_TOKEN_KEY, refresh, { ...cookieBase, expires: 7 });
  },

  getAccessToken: () => Cookies.get(ACCESS_TOKEN_KEY),

  getRefreshToken: () => Cookies.get(REFRESH_TOKEN_KEY),

  /** Авторизован, если есть access или refresh (access можно обновить) */
  isAuthenticated: () => {
    return !!(Cookies.get(ACCESS_TOKEN_KEY) || Cookies.get(REFRESH_TOKEN_KEY));
  },

  clearTokens: () => {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: "/" });
  },
};

/** Событие: сессия изменилась (login / logout) — слушает Header */
export const AUTH_CHANGE_EVENT = "uzum:auth-change";

export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}
