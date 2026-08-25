"use client";

import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth-service";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    authService.clearTokens(); // Удаляем куки
    router.push("/"); // На главную
    router.refresh(); // Обновляем состояние серверных компонентов
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
    >
      Выйти
    </button>
  );
}