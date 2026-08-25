// Имитация задержки сети (800 мс)
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export interface MockAuthResponse {
  access: string;
  refresh: string;
  user: { id: number; email: string; name: string };
}

// Фейковый логин
export async function mockLogin(email: string, password: string): Promise<MockAuthResponse> {
  await delay(800);
  
  // Допустим, правильный пароль для теста — "123456"
  if (password.length >= 6) {
    return {
      access: "fake-jwt-access-" + Date.now(),
      refresh: "fake-jwt-refresh-" + Date.now(),
      user: { id: 1, email, name: email.split("@")[0] || "Пользователь" },
    };
  }
  throw new Error("Неверный email или пароль");
}

// Фейковая регистрация
export async function mockRegister(name: string, email: string, password: string): Promise<MockAuthResponse> {
  await delay(1000);
  return {
    access: "fake-jwt-access-" + Date.now(),
    refresh: "fake-jwt-refresh-" + Date.now(),
    user: { id: 2, email, name },
  };
}