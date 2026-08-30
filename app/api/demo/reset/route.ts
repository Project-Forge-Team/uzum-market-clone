import { fail, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { resetDemoData } from "@/lib/server/actions";

/**
 * Кнопка «сбросить демо-данные»: возвращает каталог и аккаунты к исходному
 * состоянию. Работает, пока база живёт в файле (локальный запуск, превью);
 * на публикации достаточно поставить UZUM_LOCK_DEMO=1, чтобы кнопку заклинило.
 */
export async function POST() {
  if (process.env.UZUM_LOCK_DEMO === "1") {
    return json({ detail: "Сброс отключён переменной UZUM_LOCK_DEMO" }, { status: 403 });
  }
  try {
    await requireUser();
    resetDemoData();
    return json({ detail: "Демо-данные восстановлены" });
  } catch (err) {
    return fail(err);
  }
}
