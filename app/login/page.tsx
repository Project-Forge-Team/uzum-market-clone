import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10">
      {/* 
        Suspense обязателен для useSearchParams в Next.js 15+ при сборке.
        fallback - это то, что покажется пользователю, пока грузится форма 
        (можно сделать красивый скелетон, но пока просто текст).
      */}
      <Suspense fallback={
        <div className="max-w-md mx-auto mt-10 p-8 text-center text-gray-500">
          Загрузка формы входа...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}