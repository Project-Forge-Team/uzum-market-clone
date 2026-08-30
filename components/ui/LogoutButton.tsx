"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/api";
import { useSession } from "@/lib/session";

/** Выход: сервер удаляет сессию и куку, клиент чистит состояние провайдера. */
export default function LogoutButton({
  label = "Выйти",
  className = "px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-100 rounded-lg transition-colors hover:bg-red-50",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { setUser } = useSession();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setLoading(false);
      router.refresh();
      router.push("/");
    }
  };

  return (
    <button type="button" onClick={handleLogout} disabled={loading} className={className}>
      {loading ? "Выходим…" : label}
    </button>
  );
}
