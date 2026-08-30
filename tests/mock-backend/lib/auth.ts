/**
 * Аутентификация мок-бэкенда: пароли (scrypt), сессии и CSRF.
 *
 * Отличие от прежней версии во фронтенде — куки здесь не берутся из
 * `next/headers`, а передаются явно: мок работает как обычный HTTP-сервер.
 */
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
} from "./db.ts";
import { ApiError } from "./http.ts";

export const SESSION_COOKIE = "uzum_sessionid";
export const CSRF_COOKIE = "uzum_csrf";
export const SESSION_TTL_DAYS = 7;

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

export function requireUser(token: string | null): UserRow {
  const user = findUserByToken(token);
  if (!user) throw new ApiError(401, "Вы не авторизованы");
  return user;
}

/** Double-submit CSRF: заголовок обязан совпасть с кукой. */
export function assertCsrf(method: string, cookie?: string, header?: string | null) {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return;
  if (cookie && header && cookie !== header) {
    throw new ApiError(403, "CSRF-токен не совпал. Обновите страницу.");
  }
}

export function newCsrfToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions.push({
    token,
    user_id: userId,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000).toISOString(),
  });
  db.sessions = db.sessions.filter((s) => Date.parse(s.expires_at) > Date.now());
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

/** Регистрация + автоматически созданный магазин (как на реальном бэкенде). */
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
    throw new ApiError(401, "Неверный email или пароль.");
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
  saveDb(db);
  return user;
}
