"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { loginUser } from "@/lib/api";
import { authService } from "@/lib/auth-service";

// 1. Валидация для логина
const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Получаем адрес, куда юзер хотел попасть (например, /profile)
  const redirect = searchParams.get("redirect") || "/";

  const [serverError, setServerError] = useState<string | null>(null);

  // 2. Инициализация формы
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // 3. Обработчик отправки
  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      // Стучимся на реальный бэкенд
      const response = await loginUser(data);

      // Сохраняем настоящие JWT токены в куки
      authService.saveTokens(response.access, response.refresh);

      // Перенаправляем туда, откуда пришел (или на главную)
      router.push(redirect);
      router.refresh(); // Обновляем Header, чтобы появилось "Профиль"
      // Было: } catch (err: any) {
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка при входе";
      setServerError(errorMessage);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <h1 className="text-2xl font-bold text-center mb-6">Вход в аккаунт</h1>

      {redirect !== "/" && (
        <div className="bg-orange-50 text-orange-600 p-3 rounded-lg mb-4 text-sm text-center border border-orange-100">
          ⚠️ Для просмотра страницы <b>{redirect}</b> необходимо войти.
        </div>
      )}

      {serverError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-100">
          {serverError === "No active account found with the given credentials"
            ? "Неверный email или пароль"
            : serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <input
            type="email"
            placeholder="Email"
            {...register("email")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Пароль */}
        <div>
          <input
            type="password"
            placeholder="Пароль"
            {...register("password")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Кнопка входа */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#7000FF] text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-[#5a00cc] active:scale-95 mt-2"
        >
          {isSubmitting ? "Входим..." : "Войти"}
        </button>
      </form>

      {/* === ССЫЛКА НА РЕГИСТРАЦИЮ === */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="text-[#7000FF] font-medium hover:underline"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}