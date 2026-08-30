/**
 * Аутентификация «по-взрослому, но локально»:
 *  - пароль — scrypt с солью, в открытом виде нигде не хранится;
 *  - сессия — случайный токен в HttpOnly cookie (как JWT/sid у Django);
 *  - CSRF — double-submit cookie (uzum_csrf), как в реальном бэкенде.
 */
import { cookies } from "next/headers";
import crypto from "node:crypto";
import {
  getDb,
  hashPassword,
  nextId,
  nowIso,
  saveDb,
  uniqueSellerSlug,
  verifyPassword,
  type SellerRow,
  type UserRow,
} from "./db";
import { ApiError } from "./http";

export const SESSION_COOKIE = "uzum_sessionid";
export const CSRF_COOKIE = "uzum_csrf";
const SESSION_TTL_DAYS = 7;

function cookieOptions() {
  return {
    path: "/" as const,
    sameSite: "lax" as const,
    // В проде (https) ставим Secure, в dev/тестах — нет, иначе кука не запишется.
    secure: process.env.NODE_ENV === "production",
  };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...cookieOptions(),
    httpOnly: true,
    maxAge: SESSION_TTL_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    ...cookieOptions(),
    httpOnly: true,
    maxAge: 0,
  });
}

/** Выдаём CSRF-куку (её читает JS и кладёт в заголовок X-CSRFToken). */
export async function issueCsrfCookie() {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  const token = existing || crypto.randomUUID().replace(/-/g, "");
  store.set(CSRF_COOKIE, token, { ...cookieOptions(), httpOnly: false });
  return token;
}

export async function readSessionToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export function findUserByToken(token: string | null): UserRow | null {
  if (!token) return null;
  const db = getDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (Date.parse(session.expires_at) < Date.now()) {
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDb(db);
    return null;
  }
  return db.users.find((u) => u.id === session.user_id) ?? null;
}

/** Текущий пользователь для Server Component. */
export async function getCurrentUser(): Promise<UserRow | null> {
  return findUserByToken(await readSessionToken());
}

export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Нужно войти в аккаунт");
  return user;
}

/**
 * Проверка CSRF для «опасных» запросов.
 * Если куки нет — считаем, что клиент её ещё не получил, и не блокируем:
 * учебный проект не должен ломаться из-за гонки заголовков.
 */
export async function assertCsrf(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return;
  const store = await cookies();
  const cookie = store.get(CSRF_COOKIE)?.value;
  const header =
    request.headers.get("x-csrftoken") || request.headers.get("x-xsrf-token");
  if (cookie && header && cookie !== header) {
    throw new ApiError(403, "CSRF-токен не совпал. Обновите страницу.");
  }
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions.push({
    token,
    user_id: userId,
    created_at: nowIso(),
    expires_at: new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000,
    ).toISOString(),
  });
  // Подчищаем протухшие, чтобы файл не разрастался.
  db.sessions = db.sessions.filter(
    (s) => Date.parse(s.expires_at) > Date.now(),
  );
  saveDb(db);
  return token;
}

export function destroySession(token: string | null) {
  if (!token) return;
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb(db);
}

export interface RegisterInput {
  email: string;
  password: string;
  password2?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  shop_name?: string;
}

function validateRegister(input: RegisterInput) {
  const fields: Record<string, string> = {};
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    fields.email = "Укажите корректный email";
  }
  if (password.length < 8) {
    fields.password = "Минимум 8 символов";
  } else if (!/[A-Za-zА-Яа-я0-9]/.test(password)) {
    fields.password = "Пароль слишком простой";
  }
  if (input.password2 !== undefined && input.password2 !== password) {
    fields.password2 = "Пароли не совпадают";
  }
  if ((input.first_name ?? "").trim().length < 2) {
    fields.first_name = "Как к вам обращаться? Минимум 2 символа";
  }
  if (input.phone && !/^\+?[\d\s()-]{9,18}$/.test(input.phone.trim())) {
    fields.phone = "Телефон в формате +998XX XXX XX XX";
  }
  return { fields, email };
}

/**
 * Регистрация покупателя + автоматически создаём его мини-магазин,
 * чтобы любой пользователь мог сразу публиковать товары (как продавцы Uzum).
 */
export function registerUser(input: RegisterInput) {
  const { fields, email } = validateRegister(input);
  const db = getDb();

  if (db.users.some((u) => u.email === email)) {
    fields.email = "Такой email уже зарегистрирован";
  }
  if (Object.keys(fields).length) {
    throw new ApiError(400, "Проверьте правильность заполнения полей", fields);
  }

  const { salt, hash } = hashPassword(input.password ?? "");
  const user: UserRow = {
    id: nextId(db, "users"),
    email,
    passwordHash: hash,
    salt,
    first_name: (input.first_name ?? "").trim(),
    last_name: (input.last_name ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    date_joined: nowIso(),
    seller_id: null,
  };

  const shopName =
    (input.shop_name ?? "").trim() ||
    `${user.first_name || email.split("@")[0]} — магазин`;

  const seller: SellerRow = {
    id: nextId(db, "sellers"),
    name: shopName,
    slug: uniqueSellerSlug(shopName, (slug) => db.sellers.some((s) => s.slug === slug)),
    city: "Ташкент",
    description:
      "Новый магазин на учебном маркетплейсе. Добавляем товары и оперативно отвечаем на вопросы покупателей.",
    owner_id: user.id,
    created_at: nowIso(),
    verified: false,
  };

  db.users.push(user);
  db.sellers.push(seller);
  user.seller_id = seller.id;
  saveDb(db);

  return user;
}

export function loginUser(email: string, password: string): UserRow {
  const db = getDb();
  const normalized = (email ?? "").trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalized);
  if (!user || !verifyPassword(password ?? "", user)) {
    throw new ApiError(
      401,
      "Неверный email или пароль. Демо-аккаунты: seller@uzum.uz / buyer@uzum.uz, пароль Password123",
    );
  }
  return user;
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    date_joined: user.date_joined,
    is_seller: !!user.seller_id,
    seller_id: user.seller_id,
  };
}

export function updateProfile(userId: number, patch: Partial<UserRow>) {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new ApiError(404, "Пользователь не найден");

  if (patch.first_name !== undefined) {
    const v = patch.first_name.trim();
    if (v.length < 2) throw new ApiError(400, "Имя слишком короткое");
    user.first_name = v;
  }
  if (patch.last_name !== undefined) user.last_name = patch.last_name.trim();
  if (patch.phone !== undefined) user.phone = patch.phone.trim();
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new ApiError(400, "Некорректный email");
    }
    if (db.users.some((u) => u.email === email && u.id !== userId)) {
      throw new ApiError(400, "Такой email занят");
    }
    user.email = email;
  }
  if (patch.passwordHash) {
    user.passwordHash = patch.passwordHash;
    user.salt = patch.salt ?? user.salt;
  }
  saveDb(db);
  return user;
}

export const DEMO_ACCOUNTS = [
  {
    role: "Продавец",
    email: "seller@uzum.uz",
    password: "Password123",
    hint: "есть магазин «Uzum Students» — можно публиковать товары",
  },
  {
    role: "Покупатель",
    email: "buyer@uzum.uz",
    password: "Password123",
    hint: "демо-заказ и отзывы в личном кабинете",
  },
] as const;
