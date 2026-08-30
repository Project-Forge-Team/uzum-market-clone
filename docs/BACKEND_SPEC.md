# ТЗ на бэкенд для «Uzum Market Clone» (учебный маркетплейс)

Документ для backend-разработчика и одновременно — описание живого контракта.

> **Статус: реализовано.** Бэкенд поднят на `https://backend-uzum-market.onrender.com/api`,
> фронтенд на него переключён (см. §10). Контракт ниже — источник истины для обеих сторон;
> любое расхождение считается багом бэкенда, а не поводом менять UI.

Стек не навязываем, но в истории репозитория уже был **Django + DRF** (`tests/mock-backend/server.mjs`
имитирует его поведение), поэтому примерам соответствия лучше всего ставить DRF: пагинация,
`APPEND_SLASH`, CSRF double-submit — всё его родное. Node/Nest/Laravel/FastAPI — тоже ок, если
контракт ниже соблюдён 1-в-1.

---

## 0. Что должно работать после интеграции (User journey)

1. Покупатель регистрируется → **магазин создаётся автоматически** (можно выкладывать товары сразу).
2. Покупатель листает каталог, фильтрует, ищет, смотрит карточку, кладёт в корзину, оформляет заказ:
   сумма, скидка по промокоду и стоимость доставки считаются **на сервере**.
3. Заказ списывает остатки, получает номер и историю статусов; отмена возвращает остатки.
4. Покупатель оставляет отзыв (1 на товар, можно править), продавец товара отвечает; отзыв о
   выкупленном товаре получает признак `verified`.
5. Продавец публикует/редактирует/удаляет товары, грузит фото, ведёт заказы по статусам, отвечает
   на отзывы, правит данные магазина.

Если какой-то из этих шагов после подключения бэкенда не работает — это баг бэкенда, а не фронта.

---

## 1. Общие соглашения

| Тема | Требование |
| --- | --- |
| Base path | всё под `/api/` (например `GET /api/products/`) |
| Версионирование | **без** `/v1/` — пути зафиксированы фронтом, см. §5 |
| Trailing slash | `APPEND_SLASH` можно оставить: фронтенд-прокси нормализует путь сам |
| Формат дат | ISO-8601 UTC c `Z` (`2026-08-30T17:00:59.673Z`) — фронт парсит `Date.parse` |
| Деньги | **целое число** сумов. Никаких дробей и строк. `price: 1250000` |
| ID | целые числа, автоинкремент. `id` товара и `slug` взаимозаменяемы в GET (см. ниже) |
| Ошибки | `{"detail": "текст для пользователя", "fields": {"email": "..."}}`; код 400/401/403/404/409 |
| `detail` | обязательно: фронт показывает именно его в тосте/под полем |
| `fields` | опционально, карта `имя поля → одна строка ошибки` (не массив!) |
| Успешное удаление | можно 200 с `{"detail": "..."}`; 204 тоже поддержан |
| Пагинация | envelope §2 — **не** стандартный DRF (там `next` = URL) |
| CORS | `Access-Control-Allow-Credentials: true`, `Allow-Origin` — конкретный домен фронта, `Allow-Headers: X-CSRFToken, Content-Type` |
| Куки | имена и флаги — §3 |
| Тело запроса | JSON ≤ 256 КБ (кроме multipart — §7) |
| Rate limit | `auth/login|register|password` — ≥ 10/мин/IP; `products` (запись) ≥ 60/ч/юзер |
| Health | `GET /api/health` → `{"status":"ok","service":"uzum-market-clone","backend":"local","products":42,"time":"…"}` — readiness-проба для превью/деплоя; **не должна** инициализировать/пересоздавать базу |
| Стабильность полей | лишние поля разрешены, отсутствующие — ломают UI. Поля из §5 обязательны |

### 1.1 Envelope списка (важно!)

```json
{
  "count": 42,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "next": true,
  "previous": false,
  "results": []
}
```

`next` / `previous` — **boolean**, а не URL. Эндпоинты со списком, где фронт не просит постранично
(`categories`, `sellers`, `products/mine`, `orders`), отдают тот же envelope c `total_pages: 1`,
`next: false`, `previous: false`.

---

## 2. Модель данных

Ниже — логическая схема. Названия таблиц/колонок свободные, **названия полей в JSON-ответе — нет** (§5).

### `users`

| поле | тип | заметки |
| --- | --- | --- |
| id | pk | |
| email | citext unique not null | хранится в lower |
| password_hash | text | argon2id / bcrypt / scrypt — не md5, не plaintext |
| first_name | varchar(60) | ≥ 2 симв. |
| last_name | varchar(60) null | |
| phone | varchar(30) | формат `+998XX XXX XX XX` (или пустая строка) |
| date_joined | timestamptz | |
| seller_id | fk → sellers.id, null | магазин «1 к 1» с владельцем |
| password_updated_at | timestamptz null | *(should)* для инвалидации сессий |

### `sessions` (или Django `django_session` — что угодно, лишь бы кука работала)

| поле | тип |
| --- | --- |
| token | pk/unique, 32+ байт crypto-random, httponly-cookie |
| user_id | fk → users, on delete cascade |
| created_at, expires_at | timestamptz (TTL 7 дней) |

### `sellers` (магазины)

| поле | тип | заметки |
| --- | --- | --- |
| id | pk | |
| name | varchar(60) | 3..60 |
| slug | varchar(80) unique | **стабильный**: при переименовании не меняется |
| city | varchar(40) | по умолчанию «Ташкент» |
| description | varchar(600) | |
| owner_id | fk → users, unique, null | `null` = магазин без владельца (демо-сид) |
| verified | bool | «документы проверены» |
| created_at | timestamptz | |

### `categories`

`id, name(60), slug(60) unique, emoji(8), color(9)`. 10 записей из сида, менять руками не нужно.

### `products`

| поле | тип | заметки |
| --- | --- | --- |
| id | pk | |
| slug | varchar(140) unique | из title, транслит; дедупликация `-2`, `-3` |
| title | varchar(120) | 8..120 |
| description | text | 20..4000 |
| price | integer | > 0, ≤ 5 000 000 000 |
| old_price | integer null | если `≤ price` → считать `null` (скидка не показывается) |
| stock | integer | 0..99 999 |
| brand | varchar(40) | по умолчанию «Без бренда» |
| delivery_time | varchar(40) | «Завтра», «1–2 дня», … |
| category_id | fk → categories, restrict | |
| seller_id | fk → sellers, cascade | |
| is_ad | bool | полоса «реклама» на карточке |
| status | enum(`active`,`draft`,`archived`) | draft/archived не видно в каталоге/поиске |
| views | integer default 0 | растёт от `POST /products/{id}/view` |
| created_at, updated_at | timestamptz | |

Изображения и характеристики — два варианта на выбор:

* **проще:** `images jsonb` (массив URL, ≤ 8, индекс 0 = главное) и `characteristics jsonb`
  (объект `{"Вид":"…"}`, ≤ 24 пар) — тогда не нужен переезд по формату, фронт ждёт ровно это;
* **правильнее:** таблицы `product_images(id, product_id, url, position)` и
  `product_specs(id, product_id, key, value, position)` — но в ответе всё равно собирается
  в `images[]` / `characteristics{}`.

Индексы: `products(status, category_id)`, `products(seller_id, status)`, unique `products(slug)`,
GIN/`pg_trgm` на `title, description, brand` (поиск), btree на `price`.

### `reviews`

| поле | тип | заметки |
| --- | --- | --- |
| id | pk | |
| product_id | fk → products, cascade | |
| user_id | fk → users, cascade, null | null только у сидовых «анонимных» отзывов |
| author | varchar(80) | денормализованное имя на момент написания |
| rating | smallint | 1..5 |
| text | text | 15..2000 |
| pros / cons | varchar(200) | |
| verified | bool | у пользователя есть не-отменённый заказ с этим товаром |
| seller_reply | text null | 5..800, один ответ |
| created_at | timestamptz | |

**`UNIQUE (product_id, user_id)`** — это реализация «повторный `POST` = редактирование».
Индекс `(product_id, created_at desc)`.

### `orders`

| поле | тип | заметки |
| --- | --- | --- |
| id | pk | |
| number | varchar(16) unique | `UZ-` + 6 цифр, например `UZ-332464` |
| user_id | fk → users, restrict | покупатель |
| status | enum(`new`,`packing`,`shipping`,`delivered`,`cancelled`) | default `new` |
| subtotal | integer | сумма позиций на момент создания |
| discount | integer | от промокода |
| promo_code | varchar(32) null | |
| delivery_cost | integer | 0 или 25 000 |
| total | integer | `subtotal - discount + delivery_cost` |
| address | varchar(250) | обязателен при `courier`, ≥ 8 симв. |
| pickup_point | varchar(120) | при `pickup` |
| delivery_method | enum(`courier`,`pickup`) | |
| payment_method | enum(`card`,`cash`,`installment`) | |
| comment | varchar(300) | |
| created_at | timestamptz | |

### `order_items` (snapshot, а не ссылка «живого» товара)

`id, order_id fk cascade, product_id fk restrict null, title(140), image(url), price, qty(1..20), seller_id fk`.
Цена/название/картинка **копируются** в момент заказа — иначе история заказа поедет после редкойта.
Индекс `(order_id)`, частичный `(seller_id)` для «заказы магазина».

### `order_events` (append-only таймлайн)

`id, order_id fk cascade, status enum, at timestamptz, note varchar(160)`. Только вставка; UPDATE/DELETE
запретить на уровне прав. Даёт таймлайн во фронтенде без дополнительной логики на клиенте.

### `promo_codes` *(в моке коды захардкожены в `tests/mock-backend/lib/actions.ts`; на бэкенде просим таблицу)*

`code pk (upper), percent smallint, min_subtotal integer, label varchar(120), active bool, valid_to null`.
Сид: `STUDENT10 | 10 | 200000 | "Учебный промокод: −10%"`, `UZUM2026 | 5 | 0 | "Знакомство с маркетплейсом: −5%"`.

### `media_files` *(в демо-сервере таблицы нет — файлы лежат на диске в `.data/uploads`; просим сделать таблицу или Object Storage)*

`id, owner_id fk, key unique, filename, content_type, size, width, height, created_at`.
Отдаётся по `GET /api/uploads/{key}` или напрямую из Object Storage (§7).

---

## 3. Авторизация: куки и CSRF

Фронт работает по схеме **cookie-session + double-submit CSRF** — ровно как Django.

| что | значение |
| --- | --- |
| кука сессии | имя **`uzum_sessionid`**, `HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` в prod, `Max-Age=604800` (7 дней) |
| кука CSRF | имя **`uzum_csrf`**, **без** HttpOnly (фронт читает её из JS), `Path=/`, `SameSite=Lax`, `Secure` в prod |
| заголовок | любой небезопасный метод (`POST/PUT/PATCH/DELETE`) обязан прийти с `X-CSRFToken`, равным значению куки |
| 401 | `{ "detail": "Нужно войти в аккаунт" }` (текст любой, важен код) |
| 403 CSRF | `{ "detail": "CSRF-токен не совпал. Обновите страницу." }` |
| `auth/me` без куки | 401 `{"detail":"Вы не авторизованы"}` — фронт ловит 401 и показывает гостевой режим; а вот `GET /api/shop/` без магазина отдаёт **200 с телом `null`** |

Вход/выход должны ставить/снимать обе куки одним ответом (несколько `Set-Cookie` — нормально).

---

## 4. Бизнес-правила (итоговые, обязательные к повторению)

**Товар**
* `title` 8..120, `description` 20..4000, `price > 0`, `stock 0..99 999`, `≤ 8` картинок, `≤ 24` характеристик.
* `old_price` имеет смысл только если больше `price`; иначе отдавать `null`.
* `discount_percent = round((old_price - price) / old_price * 100)`, если скидки нет — `0`.
* `in_stock = stock > 0`; `monthly_payment = { months: 12, per_month: ceil(price/12/100)*100, overpay: 0 }`.
* Права: менять/удалять/менять статус — только владелец магазина-продавца, иначе 403.
* `PATCH` принимает частичный payload (напр. только `stock`): не пришедшие поля не трогаем,
  валидируем **слитые** значения, а не присланные.

**Каталог/поиск**
* Витрина (`GET /products`) отдаёт только `status=active`; черновик/архив — по прямой ссылке
  **только владельцу**, остальным 404.
* `ids=1,2,3` — верни эти товары в текущем статусе (фронт сверяет цены/остатки в корзине),
  фильтры и `status` при этом игнорируются.

**Отзыв**
* оценка 1..5, текст 15..2000, `pros/cons ≤ 200`; только 1 на (товар, пользователь) — повторный `POST` = `PATCH`.
* товар для отзыва должен быть `active`, иначе 404.
* удалить может автор **или** владелец магазина; ответ — только владелец, 5..800 симв.
* `verified` — есть заказ покупателя с этим товаром в статусе ≠ `cancelled`.

**Заказ**
* 1..30 позиций, `qty` 1..20 на строку, остаток проверяется и **атомарно** списывается.
* доставка: `pickup → 0`, иначе `0` если `subtotal - discount ≥ 500 000`, иначе `25 000`.
* промокод: регистронезависимый, `min_subtotal` проверяется по `subtotal`, неизвестный код →
  `promo_valid: false` и `discount: 0`.
* номер `UZ-<6 цифр>`, уникальный.
* статус-машина: `new → packing → shipping → delivered`, `advance` на `delivered` → 400.
  `cancel` — только покупатель, только пока статус ≠ `delivered`/`cancelled`; отмена возвращает остатки.
* каждое изменение — строка в `order_events`.

**Магазин**
* `name` 3..60; `slug` генерируется один раз и не меняется при переименовании; дубли названий разрешены.
* магазин уже есть → `POST /api/shop` идемпотентен (200/201, ничего не дублируем).

---

## 5. Эндпоинты

`id_or_slug` = число id или slug. Все пути — префикс `/api`.

### 5.1 Auth

| метод | путь | вход | выход |
| --- | --- | --- | --- |
| GET | `/auth/csrf/` | — | 200 `{"detail":"CSRF cookie issued","csrf":"<token>"}` + ставит `uzum_csrf` |
| POST | `/auth/register/` | `{email,password,password2,first_name,last_name,phone,shop_name?}` | 201 + UserProfile; **создаёт магазин** (`shop_name` или `"<имя> — магазин"`), ставит куки |
| POST | `/auth/login/` | `{email,password}` | 200 + UserProfile, обе куки; неверный пароль → 401 `{"detail":"Неверный email или пароль…"}` |
| POST | `/auth/logout/` | — | 200 `{"detail":"Вы вышли из аккаунта"}`, куки чистятся |
| GET | `/auth/me/` | — | 200 UserProfile; без валидной куки — 401 (не 200 `null`) |
| PATCH | `/auth/me/` | `{first_name?,last_name?,phone?,email?}` | 200 UserProfile |
| POST | `/auth/password/` | `{current,next}` | 200 `{"detail":"Пароль обновлён"}`; `next ≥ 8`; *(should)* инвалидировать прочие сессии |

Валидация регистрации (в `fields`): email по regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, пароль ≥ 8,
совпадение `password2`, `first_name ≥ 2`, phone по regex `^\+?[\d\s()-]{9,18}$` (или пусто).

**UserProfile** (публичная часть, без хэшей):

```json
{ "id": 1, "email": "seller@uzum.uz", "first_name": "Сардор", "last_name": "Каримов",
  "phone": "+998901112233", "date_joined": "2026-02-14T12:00:00.000Z",
  "is_seller": true, "seller_id": 10 }
```

### 5.2 Справочники

| метод | путь | выход |
| --- | --- | --- |
| GET | `/categories/` | envelope; `results[] = {id,name,slug,emoji,color,product_count}` (только активные товары) |
| GET | `/sellers/` | envelope; `results[] = Seller + {product_count, order_count, created_at}`, сортировка: рейтинг ↓, затем число товаров ↓ |
| GET | `/sellers/{id_or_slug}/` | `Seller + { products: Product[] }` (активные товары магазина); 404 если нет |

```json
{ "id": 10, "name": "Uzum Students", "slug": "uzum-students", "city": "Ташкент",
  "description": "…", "rating": 4.5, "reviews_count": 2, "product_count": 1,
  "verified": false, "owner_id": 1 }
```

### 5.3 Товары

`GET /products/` — query-параметры (все опциональны, повторяются как есть):

```
q | search      — подстрока по title/description/brand (регистронезависимо)
ids             — «1,2,3»
category        — slug или id
seller          — slug или id
min_price, max_price, min_rating (1..5)
discounted=1    — только со скидкой (>0%)
in_stock=1      — stock > 0
ordering        — price | -price | rating | -rating | new | -created_at | discount | popular
                  (пусто/неизвестно = «рекомендованное»: свой скоринг, но стабильный)
page, page_size — page_size по умолчанию 20, диапазон 4..120
status          — active|draft|archived, НО: чужие черновики/архив наружу не отдаются.
                  Для запроса без прав владельца список возвращается пустым (200, count 0),
                  а владелец магазина получает только СВОИ товары этого статуса (фильтр по
                  seller подставляется сервером). Реализация в демо: app/api/products/route.ts
```

Ответ: envelope + `facets`:

```json
{ "count": 11, "page": 1, "page_size": 20, "total_pages": 1, "next": false, "previous": false,
  "facets": { "price": { "min": 45000, "max": 9750000 },
              "categories": [ { "id":1, "name":"Электроника", "slug":"elektronika", "emoji":"📱",
                                "color":"#EDE9FF", "product_count": 11 } ] },
  "results": [ /* Product[] */ ] }
```

`facets.price` считается **до** фильтра по цене (чтобы ползунок не «ехал»), `facets.categories` —
без учёта фильтра по категории.

**Product** (полностью, поля обязательны):

```json
{ "id": 44, "slug": "portativnaya-kolonka-boombox-mini-2",
  "title": "Портативная колонка BoomBox Mini 2", "description": "…",
  "price": 349000, "old_price": 429000, "discount_percent": 19,
  "monthly_payment": { "months": 12, "per_month": 29100, "overpay": 0 },
  "rating": 4.5, "reviews_count": 2,
  "rating_breakdown": [ {"stars":5,"count":1},{"stars":4,"count":1},{"stars":3,"count":0},
                        {"stars":2,"count":0},{"stars":1,"count":0} ],
  "delivery_time": "1–2 дня", "stock": 7, "in_stock": true, "brand": "BoomBox",
  "image": "/products/gen/speaker-1.svg",
  "images": ["/products/gen/speaker-1.svg", "/products/gen/speaker-2.svg"],
  "characteristics": { "Мощность": "16 Вт", "Защита": "IPX7" },
  "is_ad": true, "views": 154, "status": "active",
  "created_at": "2026-05-01T10:00:00.000Z", "updated_at": "2026-07-18T10:00:00.000Z",
  "seller": { /* Seller */ }, "category": { "id":2, "name":"Бытовая техника", "slug":"bytovaya-tehnika", "emoji":"🍳" },
  "has_own_review": false }
```

`image`/`images` — относительный путь (`/media/…`) или абсолютный URL; фронт отдаёт их в
`<img>`/`next/image` как есть. `has_own_review` — есть ли отзыв у **текущего** пользователя (нужна кука).

| метод | путь | вход / выход |
| --- | --- | --- |
| GET | `/products/{id_or_slug}/` | Product (черновик — только владельцу, иначе 404) |
| POST | `/products/` | `{title, description, price, old_price?, stock, category_id \| category(slug), delivery_time?, brand?, images[], characteristics{}, status?, is_ad?}` → 201 `{"id":44,"detail":"Товар опубликован"}`; 403 если у аккаунта нет магазина |
| PATCH | `/products/{id}/` | любой набор полей → `{"id":…,"detail":"Изменения сохранены"}` |
| DELETE | `/products/{id}/` | `{"detail":"Товар удалён"}`; **каскадом удаляет отзывы** |
| POST | `/products/{id}/status/` | `{"status":"draft"}` → `{"detail":"Статус обновлён"}` |
| POST | `/products/{id}/view/` | без тела и без авторизации → `{"ok":true}`, инкремент `views` |
| GET | `/products/mine/` | envelope **включая** draft/archived; если магазина нет → 200 `{"detail":"У вас пока нет магазина","results":[]}` |

### 5.4 Отзывы

| метод | путь | детали |
| --- | --- | --- |
| GET | `/products/{id}/reviews/` | `{"summary":{"count":2,"average":4.5,"breakdown":[…5→1]}, "results":[Review…], "can_review":bool, "purchases":int}` — новые сверху. `can_review` — может ли **текущий** пользователь оставить отзыв (нужна кука), `purchases` — сколько штук товара куплено в не-отменённых заказах (фронт рисует «Куплено N раз») |
| POST | `/products/{id}/reviews/` | `{rating, text, pros?, cons?}` → **201** `{"id":88,"updated":false,"detail":"Спасибо за отзыв!"}`; если отзыв уже был → **200** `{"id":88,"updated":true,"detail":"Отзыв обновлён"}`. **Шлюз покупки:** нового отзыва без оплаты не бывает — если у пользователя нет ни одного не-отменённого заказа с этим товаром → **403** `{"detail":"Отзыв могут оставить только покупатели, которые уже купили этот товар. …"}`. Свой существующий отзыв можно править всегда (иначе человек не смог бы убрать отзыв после отмены заказа) |
| DELETE | `/reviews/{id}/` | `{"detail":"Отзыв удалён"}`; 403 — не автор и не продавец |
| POST | `/reviews/{id}/reply/` | `{"reply":"…"}` → `{"detail":"Ответ опубликован"}`; 403 — не владелец товара |

```json
{ "id": 88, "product_id": 44, "author": "Азиз Юсупов", "initials": "А", "rating": 5,
  "text": "…", "pros": "Автономность", "cons": "", "created_at": "2026-08-29T17:00:59.536Z",
  "verified": true, "seller_reply": "Добрый! …", "own": true }
```

`initials` — 1 заглавная буква (фронт рисует аватар), `own` = автор смотрит свой отзыв.
Отзывов на товар у покупателя может быть ровно один (`UNIQUE(product_id, user_id)`),
`verified`/`can_review` считаются по одному и тому же правилу «есть не-отменённый заказ с этим товаром».

### 5.5 Заказы

| метод | путь | детали |
| --- | --- | --- |
| PUT | `/orders/` | **превью сумм, без авторизации и без CSRF**: `{subtotal, delivery_method, promo_code}` → `{discount, delivery_cost, total, promo_valid, promo_label}` |
| POST | `/orders/` | `{items:[{product_id,qty}], address, pickup_point, delivery_method, payment_method, comment?, promo_code?}` → **201** `{"id":3,"detail":"Заказ оформлен"}`. Суммы **пересчитать на сервере**, клиентскому `subtotal` не верить. Ошибки остатка → 400 `{"detail":"«Товар»: на складе всего 2 шт."}` |
| GET | `/orders/` | `{"count":n,"results":[ShopOrder…]}`, новые сверху |
| GET | `/orders/{id}/` | ShopOrder + `timeline`; 401 анониму, 404 если заказ принадлежит другому пользователю (не покупателю и не продавцу позиции) |
| POST | `/orders/{id}/status/` | `{"action":"advance" \| "cancel"}` → `{"status":"packing","detail":"Статус заказа обновлён"}`. `advance` — продавец любой позиции **или** покупатель; `cancel` — только покупатель |

```json
{ "id": 3, "number": "UZ-332464", "status": "new", "created_at": "2026-08-29T17:00:59.673Z",
  "subtotal": 2500000, "discount": 250000, "promo_code": "STUDENT10", "delivery_cost": 0,
  "total": 2250000, "address": "г. Ташкент, ул. Тестовая, 5", "pickup_point": "",
  "delivery_method": "courier", "payment_method": "card", "comment": "Позвонить за 15 минут",
  "items": [ { "product_id": 1, "title": "…", "image": "/products/gaming-set.png",
               "price": 1250000, "qty": 2, "seller_id": 2, "seller_name": "Techno Plus" } ],
  "items_count": 2, "buyer_name": "Азиз Юсупов",
  "timeline": [ { "status": "new", "at": "…", "note": "Заказ собран и передан в доставку" } ] }
```

### 5.6 Кабинет продавца

| метод | путь | детали |
| --- | --- | --- |
| GET | `/shop/` | `Seller` **или `null`**, если магазина нет (200, а не 404!) |
| POST | `/shop/` | `{"name":"Моя мастерская"}` → 201 `{"id":11,"detail":"Магазин создан"}` (создаёт и связывает с юзером) |
| PATCH | `/shop/` | `{name?, description?, city?}` → `{"id":…,"detail":"Данные сохранены"}`; 404 если магазина нет |
| GET | `/shop/orders/` | `{"count":n,"results":[ShopOrder…],"stats":SellerStats}`. В `results` — **только позиции этого продавца**, `total/subtotal` = их сумма, `discount: 0`, `promo_code: null`, плюс `buyer_name` и `timeline` |

```json
SellerStats = { "product_count": 1, "draft_count": 1, "review_count": 2, "rating": 4.5,
                "views": 1202, "order_count": 2, "revenue": 96000, "stock_units": 11 }
```

### 5.7 Медиа и служебное

| метод | путь | детали |
| --- | --- | --- |
| POST | `/uploads/` | `multipart/form-data`, поле **`file`** (только картинка) → 201 `{"url":"/api/uploads/mtemqqsx-b7fd5cc3.png","name":"shot.png"}`; требует куки+CSRF |
| GET | `/uploads/{key}` | тело картинки, `Content-Type`, `Cache-Control: public, max-age=31536000, immutable` |
| GET | `/health` | 200 `{status, service, backend, products, time}` — см. §1, только чтение |
| POST | `/demo/reset/` | вернуть БД к сид-состоянию. Только для авторизованных (анониму 401); на проде рубильник `UZUM_LOCK_DEMO=1` → 403. Фронтная кнопка уже шлёт этот запрос |

`GET /api/sellers/{slug}` и `GET /api/shop/` должны корректно работать **с кукой сессии** — на SSR
фронт прокидывает её, чтобы `has_own_review`/`own` были правдивыми.

---

## 6. Транзакции, идемпотентность, конкурентность

1. **Создание заказа** = одна транзакция: `SELECT … FOR UPDATE` на строки товаров → проверка
   остатков → `UPDATE stock` → вставка `orders/order_items/order_events`. При нехватке — откат и 400/409.
2. **Отмена** = та же транзакция в обратную сторону (`stock += qty` по всем позициям).
3. **Отзыв** — `INSERT … ON CONFLICT (product_id, user_id) DO UPDATE`, чтобы гонка двух табов не
   создала дубль.
4. **Счётчик просмотров** — допустим `UPDATE products SET views = views + 1` без блокировки; терять
   инкременты можно, блокировать карточку нельзя.
5. Все изменяющие запросы идемпотентны по смыслу: `POST /shop/` при существующем магазине → 200/201
   без дубля; `POST /products/{id}/status/` с тем же статусом → 200.
6. *(опционально, но полезно)* `Idempotency-Key` заголовок на `POST /orders/`: повтор запроса в
   течение 5 минут возвращает тот же заказ.

---

## 7. Загрузка файлов

* Поле формы — строго `file`; фронт не переименовывает.
* Типы: `image/png, image/jpeg, image/webp, image/gif`; размер ≤ **2 МБ**; иначе 400 с `detail`.
* Имя на диске — генерируем сам (`<base36 ts>-<hex8><ext>`), расширение — из MIME, **не** из имени.
* Ответ должен содержать готовый `url`, который фронт вставит в `images[]` товара и покажет через
  `next/image` (в `next.config.ts` уже разрешён любой хост, но если будешь отдавать с CDN —
  скажи, добавим `remotePatterns` и уберём `unoptimized`).
* Хранение: локальный том в dev, S3-совместимый Object Storage (R2/Yandex/MinIO) в prod.
* Доступ: публичный read (приватные картинки в этом проекте не нужны).

---

## 8. Производительность и кэш

* `GET /products/` при `page_size=120` и фильтрах должен укладываться в ~50 мс на 10k товаров —
  пагинация на стороне БД, `COUNT(*) OVER()`, фасеты одним запросом.
* Список карточек: `seller` и `category` **join'ом**, не N+1 (фронт рисует их из каждого товара).
* `rating`, `reviews_count`, `rating_breakdown` — материализовать в `products` (counter +
  пересчёт на запись отзыва) либо делать один агрегатный запрос на страницу выдачи.
* Заголовки: приватные эндпоинты (`orders`, `products/mine`, `shop*`, `auth/me`) —
  `Cache-Control: no-store`; публичные списки — `public, max-age=15, stale-while-revalidate=60`.
* `ETag` на выдачу каталога приветствуется, но `no-store`-эндпоинты им не покрывать.

---

## 9. Миграции и сид

* Миграции — обязательны (в dev — `sqlite`, в prod — Postgres; лучше сразу Postgres + docker-compose).
* Сид: **10 категорий, 10 магазинов, ~42 товара, 84 отзыва, 1 демонстрационный заказ** — эталонный
  датасет лежит в `tests/mock-backend/lib/catalog.json`. Товары ссылаются на картинки
  `/products/gen/*.svg`; сейчас их отдаёт фронт из `public/`, промахи прокси переписывает на бэкенд
  (`next.config.ts`), а последним рубежом работает `onError` → `/products/placeholder.svg`.
  Если бэкенд начнёт отдавать эти файлы сам — слаги должны совпасть с фронтовыми.
* Демо-аккаунты (пароль у всех `Password123`):

| email | роль |
| --- | --- |
| `seller@uzum.uz` | владелец «Uzum Students»: 1 активный товар, 1 черновик, 1 заказ в `packing` |
| `buyer@uzum.uz` | покупатель: 2 заказа (1 в работе, 1 «в пути»), свой отзыв с ответом продавца |
| `electro@uzum.uz` | владелец «Electro House» (8 товаров электроники) |

* `POST /api/demo/reset/` пересоздаёт БД из этого же сида (в проде — отключается env-флагом).

---

## 10. Что сделано во фронтенде (сделано, тебе на заметку)

Выбран **вариант A** — same-origin прокси, без CORS и без `SameSite=None`.

1. `BACKEND_URL` (по умолчанию `https://backend-uzum-market.onrender.com/api`) читает
   `lib/server/backend.ts`; прокси `app/api/[...path]/route.ts` нормализует трейлинг-слэш
   (исключения — `/api/health` и `/api/uploads/<файл>.<ext>`), переносит `Set-Cookie` целиком
   и вырезает hop-by-hop. Браузер знает только про `/api/*` — CORS не нужен.
2. Удалены **26** локальных обработчиков `app/api/**`; остался только catch-all `[...path]`.
3. Все server-компоненты (~26 файлов: `app/product/*`, `app/catalog/*`, `app/search`, `app/shop/*`,
   `app/cabinet/*`, `app/profile/*`, `app/sellers`, `app/sell`, `app/layout`) ходят через
   `lib/server/data.ts` — он зовёт бэкенд напрямую и **пробрасывает куку `uzum_sessionid`** из
   входящего запроса, иначе `own` / `has_own_review` и черновики продавца отдавались бы как гостю.
4. `lib/server/{db,catalog,actions,auth,http}.ts` удалены из приложения и переехали в
   `tests/mock-backend/` — там из них собран мок Django для `npm test` (сеть не нужна).
   `types/product.ts` остался общим контрактом.
5. `/products/gen/:path*` переписывается на бэкенд **после** локальных файлов (`next.config.ts`).

Не реализовано на бэкенде и агрегируется на фронте (эндпоинтов нет): «мои отзывы», «отзывы
магазина» (нет коллекции `/api/reviews/`), счётчики на главной и похожие товары — всё это
собирается фан-аутом по товарным эндпоинтам.

---

## 11. Критерии приёмки (проверяются без фронтенда)

```bash
# 1) контракт
curl -s $API/api/categories/            | jq '.results | length'        # 10
curl -s "$API/api/products/?page_size=5" | jq '.results[0] | keys | length' # все поля Product
# 2) цикл «купил»
c=$(curl -s -c j $API/api/auth/csrf/ | jq -r .csrf)
curl -s -b j -c j -H "X-CSRFToken: $c" -H 'Content-Type: application/json' \
  -d '{"email":"buyer@uzum.uz","password":"Password123"}' $API/api/auth/login/   # 200, профиль
# 3) гонка остатков: 2 параллельных заказа последнего товара → ровно один 201, второй 400/409
# 4) отзыв дважды → второй ответ updated=true, строка в БД одна
# 5) чужой товар PATCH/DELETE/status → 403; чужой черновик GET → 404
# 6) заказ без CSRF-заголовка → 403; без куки auth/me → 401, а не 500
# 7) GET  /api/products/?status=draft      чужому → 200 count=0, владельцу → только свои
# 8) POST /api/products/{id}/reviews/ без покупки → 403; с не-отменённым заказом → 201
#    и в GET /api/products/{id}/reviews/ can_review/purchases меняются соответственно
```

Автоматизация на моей стороне: **`npm test`** (`tests/run-node-tests.mjs` поднимает приложение в
своей песочнице и прогоняет `tests/e2e.py` — **55 проверок**, идемпотентно: можно запускать дважды
подряд против той же базы) и `npm run test:e2e` (Playwright-смоук по UI). Если бэкенд проходит те же
55 — интеграция готова; `tests/e2e.py` принимает `UZUM_BASE_URL`, так что его можно гонять прямо
по твоему API без фронтенда.

---

## 12. Открытые вопросы (реши и напиши мне)

1. **Платежи**: остаётся «ручная» смена статуса или подключаем Payme/Click/Uzum Тўлов с webhook +
   `idempotency key`? От ответа зависит, нужна ли таблица `payments` и статус `awaiting_payment`.
2. **Возвраты/споры**: отдельная сущность `return_request` или пока только `cancelled`?
3. **Модерация товаров**: нужна ли очередь (статус `moderation`) или продавец публикует сам, как сейчас?
4. **Языки**: только `ru` или закладываем `uz`/`en` (тогда `title_ru/title_uz` или jsonb-локаль)?
5. **CDN/домен медиа**: отдаём `/api/uploads/*` из бэкенда или сразу `media.<domain>`?
6. ~~**JWT vs cookie-session**~~ — закрыто: cookie-session + CSRF, как и хотел фронт.
7. **Коллекция отзывов**: нужен `GET /api/reviews/?user=…&seller=…`. Сейчас страницы «Мои отзывы»
   и «Отзывы магазина» собираются фан-аутом по товарам — это N запросов вместо одного.
8. **Картинки товаров**: `/products/gen/*.svg` на бэкенде отдают 500, файлы живут во фронте.
   Либо заливаем их в `MEDIA_ROOT`, либо оставляем за фронтом навсегда — реши, чтобы убрать rewrite.
