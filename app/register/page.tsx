import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Создайте аккаунт покупателя и магазин в учебном клоне Uzum Market.",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted">
          Загружаем форму регистрации…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
