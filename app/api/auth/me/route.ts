import {
  getCurrentUser,
  publicUser,
  requireUser,
  updateProfile,
} from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ detail: "Вы не авторизованы" }, { status: 401 });
    return json(publicUser(user));
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{
      first_name?: string;
      last_name?: string;
      phone?: string;
      email?: string;
    }>(request);
    const updated = updateProfile(user.id, body);
    return json(publicUser(updated));
  } catch (err) {
    return fail(err);
  }
}
