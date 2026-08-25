"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { mockLogin } from "@/lib/mock-auth";
import { authService } from "@/lib/auth-service";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Получаем адрес, куда юзер хотел попасть (например, /profile)
  const redirect = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      // Имитируем запрос к бэкенду
      const res = await mockLogin("test@uzum.uz", "123456");
      
      // Сохраняем токены в куки
      authService.saveTokens(res.access, res.refresh);
      
      // Перенаправляем туда, откуда пришел (или на главную)
      router.push(redirect);
      
      // Обновляем серверные компоненты, чтобы они увидели новую куку
      router.refresh(); 
    } catch (e) {
      console.error("Ошибка входа:", e);
      alert("Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-2xl text-center shadow-sm bg-white">
      <h1 className="text-2xl font-bold mb-2">Вход в Uzum Market</h1>
      <p className="text-gray-500 mb-6 text-sm">Режим разработки (День 1)</p>
      
      {redirect !== "/" && (
        <div className="bg-orange-50 text-orange-600 p-3 rounded-lg mb-6 text-sm border border-orange-100">
          ⚠️ Доступ к странице <b>{redirect}</b> ограничен.<br/>Пожалуйста, войдите в систему.
        </div>
      )}

      <button
        onClick={handleTestLogin}
        disabled={loading}
        className="w-full bg-[#7000FF] text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-[#5a00cc] active:scale-95"
      >
        {loading ? "Подключение..." : "Войти (Тестовый аккаунт)"}
      </button>
      
      <p className="mt-4 text-xs text-gray-400">
        Пароль не проверяется (мок)
      </p>
    </div>
  );
}