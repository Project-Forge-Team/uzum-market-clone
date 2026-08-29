"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService, notifyAuthChange } from "@/lib/auth-service";
import { logoutUser } from "@/lib/api";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Сервер отзывает refresh и удаляет HttpOnly cookies.
      await logoutUser();
    } catch {
      // Даже если вызов не прошёл, локально выходим и ведём на главную.
    } finally {
      authService.clearUserState();
      notifyAuthChange();
      router.push("/");
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "Выходим..." : "Выйти"}
    </button>
  );
}
