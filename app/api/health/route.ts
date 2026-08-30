import { peekDb } from "@/lib/server/db";
import { json } from "@/lib/server/http";

/**
 * Проверка живости для тестов, превью и деплоя. Только читает: readiness не
 * должен создавать или пересобирать демо-базу — products = -1 означает
 * «база ещё не загружена», и это всё равно живой сервис.
 */
export async function GET() {
  const db = peekDb();
  const products = db ? db.products.filter((p) => p.status === "active").length : -1;
  return json({
    status: "ok",
    service: "uzum-market-clone",
    backend: "local",
    products,
    time: new Date().toISOString(),
  });
}
