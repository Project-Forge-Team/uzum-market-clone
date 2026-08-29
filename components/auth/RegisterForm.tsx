"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { registerUser } from "@/lib/api";
import { authService, notifyAuthChange } from "@/lib/auth-service";

// 1. Настраиваем правила валидации (Zod) по API-документации
const registerSchema = z
  .object({
    first_name: z.string().min(2, "Имя обязательно (минимум 2 буквы)"),
    last_name: z.string().optional(),
    email: z.string().email("Введите корректный email"),
    phone: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value ||
          /^(\+?\d[\d\s()\-]{7,19})$/.test(value),
        "Введите корректный номер телефона, например +998901234567",
      ),
    password: z
      .string()
      .min(8, "Пароль должен быть не менее 8 символов")
      .refine(
        (value) => /[A-Za-zА-Яа-яЁё]/.test(value),
        "Пароль не должен состоять только из цифр",
      ),
    password2: z.string().min(8, "Подтвердите пароль"),
  })
  .refine((data) => data.password === data.password2, {
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
      const user = await registerUser({
        email: data.email,
        password: data.password,
        password2: data.password2,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      });

      // Кладём имя в localStorage только для быстрого отображения в шапке.
      const displayName =
        user?.first_name || user?.email?.split("@")[0] || "Профиль";
      authService.saveUserName(displayName);

      notifyAuthChange();
      router.push("/profile");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка при регистрации";
      setServerError(errorMessage);
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
        {/* Имя */}
        <div>
          <input
            type="text"
            placeholder="Имя *"
            autoComplete="given-name"
            {...register("first_name")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.first_name && (
            <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
          )}
        </div>

        {/* Фамилия */}
        <div>
          <input
            type="text"
            placeholder="Фамилия"
            autoComplete="family-name"
            {...register("last_name")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.last_name && (
            <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            {...register("email")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Телефон */}
        <div>
          <input
            type="tel"
            placeholder="Телефон (+998901234567)"
            autoComplete="tel"
            {...register("phone")}
            className="w-full h-[44px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#7000FF] transition-colors"
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Пароль */}
        <div>
          <input
            type="password"
            placeholder="Пароль (мин. 8 символов)"
            autoComplete="new-password"
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
            autoComplete="new-password"
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
