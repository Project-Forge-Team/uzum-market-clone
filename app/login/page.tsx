import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в личный кабинет учебного клона Uzum Market.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted">
          Загружаем форму входа…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
