import Cookies from "js-cookie";

// Названия наших кук
const ACCESS_TOKEN_KEY = "uzum_access_token";
const REFRESH_TOKEN_KEY = "uzum_refresh_token";

export const authService = {
  // Сохраняем токены после успешного "входа"
  saveTokens: (access: string, refresh: string) => {
    // access живёт 1 час (1/24 дня), refresh — 7 дней
    Cookies.set(ACCESS_TOKEN_KEY, access, { expires: 1 / 24, path: "/" });
    Cookies.set(REFRESH_TOKEN_KEY, refresh, { expires: 7, path: "/" });
  },

  // Получаем access токен (для будущих запросов к API)
  getAccessToken: () => {
    return Cookies.get(ACCESS_TOKEN_KEY);
  },

  // Проверяем, авторизован ли пользователь (есть ли токен)
  isAuthenticated: () => {
    return !!Cookies.get(ACCESS_TOKEN_KEY);
  },

  // === ВОТ ЭТА СТРОКА У ТЕБЯ ПРОПУЩЕНА! ДОБАВЬ ЕЁ ===
  getRefreshToken: () => {
    return Cookies.get(REFRESH_TOKEN_KEY);
  },

  // Очищаем токены при выходе (Logout)
  clearTokens: () => {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: "/" });
  },
};