import {
  assertCsrf,
  createSession,
  issueCsrfCookie,
  publicUser,
  registerUser,
  setSessionCookie,
} from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const body = await readJson<{
      email: string;
      password: string;
      password2: string;
      first_name: string;
      last_name: string;
      phone: string;
      shop_name: string;
    }>(request);

    const user = registerUser({
      ...body,
      // Продавец регистрируется вместе с магазином — сразу можно публиковать товары.
      shop_name: body.shop_name,
    });
    await issueCsrfCookie();
    await setSessionCookie(createSession(user.id));
    return json(publicUser(user), { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
