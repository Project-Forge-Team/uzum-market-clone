"use client";

import { useRouter } from "next/navigation";
import { authService, notifyAuthChange } from "@/lib/auth-service";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    authService.clearTokens();
    localStorage.removeItem("uzum_user_name");
    notifyAuthChange();
    router.push("/");
    router.refresh();
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