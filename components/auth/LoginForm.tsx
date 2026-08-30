"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import DemoAccounts from "@/components/auth/DemoAccounts";
import { loginUser } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { UserProfile } from "@/types/product";

const loginSchema = z.object({
  email: z.string().min(3, "Укажите email").email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  remember: z.boolean().optional(),
});

type Values = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const { setUser } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (data: Values) => {
    setServerError(null);
    try {
      const user: UserProfile = await loginUser({
        email: data.email,
        password: data.password,
      });
      setUser(user);
      router.push(redirect.startsWith("/") ? redirect : "/profile");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Не удалось войти");
    }
  };

  const field =
    "mt-1 h-12 w-full rounded-xl border border-line px-3.5 text-[14.5px] outline-none transition-colors focus:border-brand";

  return (
    <AuthShell
      title="Вход в аккаунт"
      subtitle="Введите email и пароль от аккаунта для входа."
      footer={
        <>
          Аккаунта ещё нет?{" "}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirect)}`}
            className="font-bold text-brand hover:underline"
          >
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <DemoAccounts
          onPick={(email, password) => {
            setValue("email", email);
            setValue("password", password);
          }}
        />

        <label className="block">
          <span className="text-[12.5px] font-semibold text-muted">Email</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            className={`${field} ${errors.email ? "border-red-400" : ""}`}
          />
          {errors.email && (
            <span className="mt-1 block text-[12px] font-semibold text-red-600">
              {errors.email.message}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-muted">Пароль</span>
          <span className="relative block">
            <input
              {...register("password")}
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
          {errors.password && (
            <span className="mt-1 block text-[12px] font-semibold text-red-600">
              {errors.password.message}
            </span>
          )}
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
          <input
            {...register("remember")}
            type="checkbox"
            className="h-4 w-4"
          />
          Держать меня в курсе акций
        </label>

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
            <LogIn size={17} />
          )}
          Войти
        </button>

        <Link
          href="/help#faq"
          className="block text-center text-[13px] font-medium text-muted transition-colors hover:text-brand"
        >
          Забыли, как здесь всё устроено?
        </Link>
      </form>
    </AuthShell>
  );
}
