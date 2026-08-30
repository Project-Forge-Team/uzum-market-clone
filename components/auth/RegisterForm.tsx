"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle, Store, UserPlus } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { registerUser } from "@/lib/api";
import { useSession } from "@/lib/session";

const registerSchema = z
  .object({
    first_name: z.string().min(2, "Минимум 2 буквы"),
    last_name: z.string().max(40).optional(),
    email: z.string().min(3, "Укажите email").email("Введите корректный email"),
    phone: z
      .string()
      .max(30, "Слишком длинный номер")
      .refine(
        (value) => value.length === 0 || /^\+?[\d\s()-]{9,20}$/.test(value),
        "Только цифры, скобки и дефисы",
      ),
    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .regex(/[A-Za-zА-Яа-я]/, "Хотя бы одна буква")
      .regex(/\d/, "Хотя бы одна цифра"),
    password2: z.string().min(8, "Повторите пароль"),
    shop_name: z.string().max(60, "Не длиннее 60 символов").optional(),
    terms: z.literal(true, {
      error: "Нужно подтвердить согласие",
    }),
  })
  .refine((data) => data.password === data.password2, {
    message: "Пароли не совпадают",
    path: ["password2"],
  });

type Values = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const { setUser } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      password2: "",
      shop_name: "",
      terms: true,
    },
  });

  const onSubmit = async (data: Values) => {
    setServerError(null);
    try {
      const user = await registerUser({
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || "",
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        password: data.password,
        password2: data.password2,
        shop_name: data.shop_name?.trim() || undefined,
      });
      setUser(user);
      router.push(redirect.startsWith("/") ? redirect : "/profile");
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Не удалось зарегистрироваться",
      );
    }
  };

  const field =
    "mt-1 h-12 w-full rounded-xl border border-line px-3.5 text-[14.5px] outline-none transition-colors focus:border-brand";
  const error = (message?: string) =>
    message ? (
      <span className="mt-1 block text-[12px] font-semibold text-red-600">
        {message}
      </span>
    ) : null;

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Аккаунт покупателя и магазин в один шаг. Почту подтверждать не нужно — товары выкладываются сразу."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirect)}`}
            className="font-bold text-brand hover:underline"
          >
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">Имя</span>
            <input
              {...register("first_name")}
              autoComplete="given-name"
              placeholder="Азиз"
              className={`${field} ${errors.first_name ? "border-red-400" : ""}`}
            />
            {error(errors.first_name?.message)}
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">
              Фамилия
            </span>
            <input
              {...register("last_name")}
              autoComplete="family-name"
              placeholder="Каримов"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-muted">Email</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            className={`${field} ${errors.email ? "border-red-400" : ""}`}
          />
          {error(errors.email?.message)}
        </label>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-muted">
            Телефон
          </span>
          <input
            {...register("phone")}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+998 90 123 45 67"
            className={field}
          />
          {error(errors.phone?.message)}
        </label>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">
              Пароль
            </span>
            <span className="relative block">
              <input
                {...register("password")}
                type={reveal ? "text" : "password"}
                autoComplete="new-password"
                placeholder="8+ символов, буква и цифра"
                className={`${field} pr-11 ${errors.password ? "border-red-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-gray-400 transition-colors hover:text-brand"
                aria-label={reveal ? "Скрыть пароль" : "Показать пароль"}
              >
                {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {error(errors.password?.message)}
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-muted">
              Повтор пароля
            </span>
            <input
              {...register("password2")}
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ещё раз"
              className={`${field} ${errors.password2 ? "border-red-400" : ""}`}
            />
            {error(errors.password2?.message)}
          </label>
        </div>

        <label className="block rounded-2xl bg-brand-soft/60 p-3.5">
          <span className="flex items-center gap-2 text-[13px] font-bold text-brand">
            <Store size={15} /> Магазин (необязательно)
          </span>
          <input
            {...register("shop_name")}
            placeholder="Например: Мастерская Audio"
            className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[14.5px] outline-none transition-colors focus:border-brand"
          />
          <span className="mt-1.5 block text-[12px] leading-relaxed text-gray-700">
            Оставьте поле пустым — магазин создадим автоматически по имени, а
            название потом можно поменять в настройках кабинета.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-gray-700">
          <input
            {...register("terms")}
            type="checkbox"
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Принимаю условия использования сервиса.{" "}
            <Link
              href="/help#terms"
              className="font-semibold text-brand hover:underline"
            >
              Подробнее
            </Link>
          </span>
        </label>
        {error(errors.terms?.message)}

        {serverError && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isSubmitting ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <UserPlus size={17} />
          )}
          Создать аккаунт
        </button>
      </form>
    </AuthShell>
  );
}
