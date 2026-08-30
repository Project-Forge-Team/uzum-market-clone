import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { serializeSeller } from "@/lib/server/catalog";
import { ensureShopForUser, updateShop } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";

export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    const seller = db.sellers.find((s) => s.owner_id === user.id);
    if (!seller) return json(null);
    return json(serializeSeller(db, seller));
  } catch (err) {
    return fail(err);
  }
}

/** Создать магазин, если аккаунт зарегистрирован без него. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ name: string }>(request);
    const id = ensureShopForUser(user.id, body.name ?? "Мой магазин");
    return json({ id, detail: "Магазин создан" }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{
      name?: string;
      description?: string;
      city?: string;
    }>(request);
    updateShop(user.id, body);
    return json({ detail: "Данные магазина сохранены" });
  } catch (err) {
    return fail(err);
  }
}
