"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { registerUser } from "@/lib/api";
import { authService } from "@/lib/auth-service";

// 1. Настраиваем правила валидации (Zod)
const registerSchema = z.object({
  first_name: z.string().min(2, "Имя обязательно (минимум 2 буквы)"), // <-- ИЗМЕНЕНО
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
  password2: z.string().min(6, "Подтвердите пароль"),
}).refine((data) => data.password === data.password2, {
  message: "Пароли не совпадают",
  path: ["password2"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // 2. Инициализируем форму
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // 3. Обработчик отправки
  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      const response = await registerUser(data);

      authService.saveTokens(response.access, response.refresh);

      // === СОХРАНЯЕМ ИМЯ ПОЛЬЗОВАТЕЛЯ ===
      // Бэкенд возвращает объект user, сохраняем имя в localStorage
      if (response.user && response.user.first_name) {
        localStorage.setItem("uzum_user_name", response.user.first_name);
      }

      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      setServerError(err.message);
    }
  };
  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <h1 className="text-2xl font-bold text-center mb-6">Регистрация</h1>

      {serverError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-100">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Имя (теперь обязательно) */}
        <div>
          <input
            type="text"
            placeholder="Имя *" // <-- Добавили звездочку
            {...register("first_name")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.first_name && (
            <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
          )}
        </div>

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
            placeholder="Пароль (мин. 6 символов)"
            {...register("password")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Подтверждение пароля */}
        <div>
          <input
            type="password"
            placeholder="Повторите пароль"
            {...register("password2")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.password2 && (
            <p className="text-red-500 text-xs mt-1">{errors.password2.message}</p>
          )}
        </div>

        {/* Кнопка */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#7000FF] text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-[#5a00cc] active:scale-95 mt-2"
        >
          {isSubmitting ? "Создаем аккаунт..." : "Зарегистрироваться"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-[#7000FF] font-medium hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}