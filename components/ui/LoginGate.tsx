import Link from "next/link";
import { Lock } from "lucide-react";

/** Заглушка для разделов, которые требуют входа (заказы, кабинет продавца). */
export default function LoginGate({
  title = "Нужно войти в аккаунт",
  text,
  redirect,
}: {
  title?: string;
  text?: string;
  redirect: string;
}) {
  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-line">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Lock size={24} />
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {text ?? "Это демо-проект: аккаунт создаётся за 20 секунд, а демо-пользователи уже заполнены — можно войти одним кликом."}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Войти
        </Link>
        <Link
          href={`/register?redirect=${encodeURIComponent(redirect)}`}
          className="rounded-xl px-5 py-3 text-sm font-semibold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
        >
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}
