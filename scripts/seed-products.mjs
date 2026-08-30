/**
 * Сид: удаляет все текущие товары и создаёт ~50 новых с реальными фотографиями.
 *
 * Использование:
 *   node scripts/seed-products.mjs
 *
 * Работает через Django-API бэкенда (BACKEND_URL или прод).
 * Аутентифицируется через демо-аккаунты, потому что создание/удаление
 * товаров требует сессию продавца.
 */

const BACKEND = (
  process.env.BACKEND_URL ?? "https://backend-uzum-market.onrender.com"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const API = `${BACKEND}/api`;

// ── Sellers & auth ─────────────────────────────────────────────

const SELLER_ACCOUNTS = [
  { email: "seller@uzum.uz", password: "Password123" }, // Uzum Students (id=1)
  { email: "electro@uzum.uz", password: "Password123" }, // Electro House (id=2)
];

// We'll map seller slugs → session cookies
// const sessions = {};

async function login(email, password) {
  // First, get CSRF
  const csrfRes = await fetch(`${API}/auth/csrf/`, { credentials: "include" });
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
  let csrfToken = "";
  let allCookies = [];

  for (const c of csrfCookies) {
    allCookies.push(c.split(";")[0]);
    if (c.startsWith("uzum_csrf=")) {
      csrfToken = c.split(";")[0].split("=")[1];
    }
  }

  const res = await fetch(`${API}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
      Cookie: allCookies.join("; "),
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${text}`);
  }

  const loginCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of loginCookies) {
    allCookies.push(c.split(";")[0]);
    if (c.startsWith("uzum_csrf=")) {
      csrfToken = c.split(";")[0].split("=")[1];
    }
  }

  const user = await res.json();
  console.log(
    `  ✓ Logged in as ${user.first_name} (seller_id=${user.seller_id})`,
  );

  return { cookies: allCookies.join("; "), csrfToken, user };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiCall(method, path, body, session) {
  const headers = {
    Accept: "application/json",
    Cookie: session.cookies,
  };
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-CSRFToken"] = session.csrfToken;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body
      ? typeof body === "string"
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    console.error(`  ✗ ${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
    return null;
  }

  if (res.status === 204) return {};
  return res.json();
}

// ── Categories (from backend) ──────────────────────────────────

// Category IDs from the backend:
// 1: Электроника (elektronika)
// 2: Бытовая техника (bytovaya-tehnika)
// 3: Одежда (odezhda)
// 4: Обувь (obuv)
// 5: Красота (krasota)
// 6: Спорт (sport)
// 7: Дом и сад (dom-i-sad)
// 8: Книги (knigi)
// 9: Детям (detyam)
// 10: Продукты (produkty)

// Seller IDs:
// 1: Uzum Students
// 2: Electro House
// 3: Techno Plus
// 4: Smart House
// 5: Gadget Zone
// 6: Home & Garden
// 7: Sport Line
// 8: Book World
// 9: Beauty UZ
// 10: Kids Planet

// ── Products with real images ──────────────────────────────────

const PRODUCTS = [
  // ═════════════════════════════════════
  // ЭЛЕКТРОНИКА (category_id: 1)
  // ═════════════════════════════════════
  {
    title: "Смартфон Samsung Galaxy A54 8/128 ГБ",
    description:
      "Современный смартфон с AMOLED-экраном 6.4 дюйма 120 Гц, тройной камерой 50 Мп и мощным процессором Exynos 1380. Батарея 5000 мА·ч обеспечит день использования без подзарядки. Водозащита IP67 и стильный дизайн делают его отличным выбором для повседневного использования.",
    price: 4290000,
    old_price: 4990000,
    stock: 25,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "Samsung",
    images: [
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Экран: '6.4" AMOLED 120 Гц',
      Память: "8/128 ГБ",
      Камера: "50 + 12 + 5 Мп",
      Батарея: "5000 мА·ч",
    },
    status: "active",
    seller_id: 2,
  },
  {
    title: "Беспроводные наушники Apple AirPods Pro 2",
    description:
      "Наушники-вкладыши с активным шумоподавлением нового поколения. Адаптивный режим прозрачности, пространственный звук с отслеживанием головы и до 6 часов воспроизведения от одного заряда. Футляр MagSafe с динамиком и кольцом для шнурка.",
    price: 3490000,
    old_price: 3990000,
    stock: 40,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "Apple",
    images: [
      "https://images.unsplash.com/photo-1606220838315-056192d5e927?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Тип: "Вкладыши TWS",
      Шумоподавление: "ANC, адаптивное",
      "Время работы": "6 ч (30 ч с кейсом)",
      Чип: "H2",
    },
    status: "active",
    seller_id: 2,
  },
  {
    title: 'Ноутбук Lenovo IdeaPad 3 15.6" i5/8/512',
    description:
      "Универсальный ноутбук для учёбы и работы. Процессор Intel Core i5-1235U, 8 ГБ DDR4, SSD 512 ГБ NVMe. Экран Full HD IPS 15.6 дюймов с антибликовым покрытием. Тихая клавиатура, веб-камера с затвором приватности и Wi-Fi 6.",
    price: 6990000,
    old_price: 7990000,
    stock: 12,
    category_id: 1,
    delivery_time: "1–2 дня",
    brand: "Lenovo",
    images: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Процессор: "Intel Core i5-1235U",
      ОЗУ: "8 ГБ DDR4",
      SSD: "512 ГБ NVMe",
      Экран: '15.6" FHD IPS',
    },
    status: "active",
    seller_id: 3,
  },
  {
    title: "Портативная колонка JBL Flip 6",
    description:
      "Мощная Bluetooth-колонка с двухполосной акустической системой и звуковым излучателем «racetrack». Защита от воды и пыли IP67: берите на пляж, в поход или бассейн. 12 часов автономной работы и функция PartyBoost для объединения колонок.",
    price: 1190000,
    old_price: 1390000,
    stock: 55,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "JBL",
    images: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Мощность: "30 Вт",
      Защита: "IP67",
      "Время работы": "12 ч",
      Bluetooth: "5.1",
    },
    status: "active",
    seller_id: 2,
  },
  {
    title: "Умные часы Xiaomi Watch S1 Active",
    description:
      "Спортивные смарт-часы с AMOLED-экраном 1.43 дюйма и 117 режимами тренировок. Встроенный GPS/ГЛОНАСС, мониторинг ЧСС и SpO2, водозащита 5 ATM. Батарея на 12 дней обычного использования. Стильный металлический корпус и силиконовый ремешок.",
    price: 1690000,
    old_price: 2190000,
    stock: 35,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "Xiaomi",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Экран: '1.43" AMOLED',
      GPS: "GPS / ГЛОНАСС",
      Батарея: "12 дней",
      Водозащита: "5 ATM",
    },
    status: "active",
    seller_id: 5,
  },
  {
    title: "Игровая мышь Logitech G Pro X Superlight",
    description:
      "Сверхлёгкая беспроводная игровая мышь весом всего 63 грамма. Сенсор HERO 25K обеспечивает точность до 25 600 DPI. Время автономной работы — 70 часов. Технология LIGHTSPEED для задержки менее 1 мс. Эргономичная симметричная форма.",
    price: 1450000,
    old_price: null,
    stock: 18,
    category_id: 1,
    delivery_time: "1–2 дня",
    brand: "Logitech",
    images: [
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Сенсор: "HERO 25K",
      DPI: "до 25 600",
      Вес: "63 г",
      "Время работы": "70 ч",
    },
    status: "active",
    seller_id: 3,
  },
  {
    title: "Внешний аккумулятор Anker PowerCore 20000 мА·ч",
    description:
      "Компактный повербанк с двумя USB-портами и поддержкой быстрой зарядки PowerIQ 2.0. Зарядит смартфон 4-5 раз от одного заряда. Тонкий и лёгкий корпус из матового пластика с LED-индикатором заряда. Защита от перегрева и короткого замыкания.",
    price: 390000,
    old_price: 490000,
    stock: 80,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "Anker",
    images: [
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1585338107529-13afc25806f9?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Ёмкость: "20 000 мА·ч",
      Выходы: "2× USB-A",
      Зарядка: "PowerIQ 2.0",
      Вес: "356 г",
    },
    status: "active",
    seller_id: 5,
  },

  // ═════════════════════════════════════
  // БЫТОВАЯ ТЕХНИКА (category_id: 2)
  // ═════════════════════════════════════
  {
    title: "Робот-пылесос Xiaomi Robot Vacuum S10+",
    description:
      "Умный робот-пылесос с лидарной навигацией LDS и влажной уборкой. Мощность всасывания 4000 Па, аккумулятор на 5200 мА·ч для уборки 250 кв. м. Управление через Mi Home: расписание, зоны, виртуальные стены. Автоочистка контейнера на базе.",
    price: 4890000,
    old_price: 5490000,
    stock: 15,
    category_id: 2,
    delivery_time: "1–2 дня",
    brand: "Xiaomi",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1603791440277-d27a4e511e74?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Навигация: "LiDAR LDS",
      "Мощность всасывания": "4000 Па",
      Батарея: "5200 мА·ч",
      "Площадь уборки": "до 250 м²",
    },
    status: "active",
    seller_id: 4,
  },
  {
    title: "Кофемашина DeLonghi Magnifica S",
    description:
      "Автоматическая кофемашина для дома и офиса. Встроенная кофемолка с 13 степенями помола, капучинатор для пышной молочной пенки. Готовит эспрессо, лунго, капучино и латте одним нажатием. Съёмная варочная группа для лёгкой чистки.",
    price: 5790000,
    old_price: 6490000,
    stock: 8,
    category_id: 2,
    delivery_time: "2–3 дня",
    brand: "DeLonghi",
    images: [
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Тип: "Автоматическая",
      Давление: "15 бар",
      "Резервуар воды": "1.8 л",
      Помол: "13 степеней",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Блендер Philips HR3655 стационарный",
    description:
      "Мощный стационарный блендер 1400 Вт с технологией ProBlend 6D для идеально гладких смузи и супов. Кувшин Tritan 2 литра, 3 предустановленные программы и функция импульсного режима. Легко разбирается для мытья в посудомоечной машине.",
    price: 890000,
    old_price: 1090000,
    stock: 30,
    category_id: 2,
    delivery_time: "Завтра",
    brand: "Philips",
    images: [
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1622480390839-40e72c18c913?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Мощность: "1400 Вт",
      Объём: "2 л",
      Материал: "Tritan",
      Скорости: "3 + импульс",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Утюг Tefal FV6831 Ultragliss Anti-Calc",
    description:
      "Паровой утюг с подошвой Durilium AirGlide для идеального скольжения. Паровой удар до 220 г/мин справляется с самыми сложными складками. Встроенная система Anti-Calc продлевает срок службы. Капля-стоп и вертикальное отпаривание.",
    price: 690000,
    old_price: null,
    stock: 45,
    category_id: 2,
    delivery_time: "Завтра",
    brand: "Tefal",
    images: [
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Мощность: "2800 Вт",
      "Паровой удар": "220 г/мин",
      Подошва: "Durilium AirGlide",
      Резервуар: "270 мл",
    },
    status: "active",
    seller_id: 6,
  },

  // ═════════════════════════════════════
  // ОДЕЖДА (category_id: 3)
  // ═════════════════════════════════════
  {
    title: "Худи оверсайз унисекс Premium Cotton",
    description:
      "Стильное худи свободного кроя из плотного хлопка 320 г/м². Мягкий начёс внутри, капюшон на шнурке с металлическими наконечниками, карман-кенгуру. Рибана на манжетах и поясе. Универсальная вещь на каждый день, которая сочетается с любым стилем.",
    price: 289000,
    old_price: 389000,
    stock: 100,
    category_id: 3,
    delivery_time: "1–2 дня",
    brand: "Urban Basic",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Состав: "100% хлопок",
      Плотность: "320 г/м²",
      Крой: "Oversize",
      Размеры: "S – 3XL",
    },
    status: "active",
    seller_id: 1,
  },
  {
    title: "Джинсы мужские Slim Fit тёмно-синие",
    description:
      "Классические джинсы прямого зауженного кроя из эластичного денима. Тёмно-синяя стирка без потёртостей, пятикарманный фасон. Удобная посадка средней высоты. Состав с добавлением эластана для комфорта в движении.",
    price: 349000,
    old_price: 449000,
    stock: 75,
    category_id: 3,
    delivery_time: "1–2 дня",
    brand: "Denim Studio",
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Состав: "98% хлопок, 2% эластан",
      Крой: "Slim Fit",
      Посадка: "Средняя",
      Цвет: "Тёмно-синий",
    },
    status: "active",
    seller_id: 1,
  },
  {
    title: "Футболка женская базовая белая",
    description:
      "Базовая белая футболка из мягкого хлопка пима с лёгкой эластичностью. Классический круглый вырез, прямой крой до бедра. Ткань не просвечивает и не деформируется после стирки. Основа любого гардероба — подойдёт и под пиджак, и для каждого дня.",
    price: 129000,
    old_price: null,
    stock: 200,
    category_id: 3,
    delivery_time: "Завтра",
    brand: "Cotton Basic",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Состав: "95% хлопок пима, 5% эластан",
      Крой: "Regular",
      Вырез: "Круглый",
      Уход: "Машинная стирка 40°",
    },
    status: "active",
    seller_id: 1,
  },
  {
    title: "Кроссовки мужские спортивные AirMax Run",
    description:
      "Лёгкие беговые кроссовки с амортизирующей подошвой Air Cushion. Дышащий сетчатый верх обеспечивает вентиляцию стопы, а резиновый протектор — сцепление на любом покрытии. Весят всего 280 г (размер 42). Подходят для бега и повседневной носки.",
    price: 590000,
    old_price: 790000,
    stock: 60,
    category_id: 4,
    delivery_time: "1–2 дня",
    brand: "AirMax",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Подошва: "Air Cushion",
      Верх: "Mesh дышащий",
      Вес: "280 г (42)",
      Размеры: "39–46",
    },
    status: "active",
    seller_id: 1,
  },

  // ═════════════════════════════════════
  // КРАСОТА И ЗДОРОВЬЕ (category_id: 5)
  // ═════════════════════════════════════
  {
    title: "Набор кистей для макияжа ProBrush 12 шт.",
    description:
      "Профессиональный набор кистей для макияжа из синтетического ворса Taklon. 12 кистей для лица и глаз: кабуки, контурная, для растушёвки, для помады и другие. Удобные деревянные ручки с мягким покрытием. В комплекте стильный чехол-органайзер.",
    price: 259000,
    old_price: 349000,
    stock: 40,
    category_id: 5,
    delivery_time: "Завтра",
    brand: "ProBrush",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=600&fit=crop",
    ],
    characteristics: {
      "Кол-во кистей": "12",
      Ворс: "Синтетический Taklon",
      Ручки: "Дерево + soft-touch",
      Чехол: "Да",
    },
    status: "active",
    seller_id: 9,
  },
  {
    title: "Крем для лица увлажняющий CeraVe 50 мл",
    description:
      "Увлажняющий крем с тремя видами церамидов и гиалуроновой кислотой. Восстанавливает и укрепляет защитный барьер кожи. Технология MVE обеспечивает увлажнение в течение 24 часов. Без отдушек и парабенов. Подходит для чувствительной кожи.",
    price: 185000,
    old_price: null,
    stock: 90,
    category_id: 5,
    delivery_time: "Завтра",
    brand: "CeraVe",
    images: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Объём: "50 мл",
      "Тип кожи": "Все типы",
      "Активные компоненты": "Церамиды, гиалуронка",
      SPF: "Нет",
    },
    status: "active",
    seller_id: 9,
  },
  {
    title: "Парфюмерная вода Versace Bright Crystal 90 мл",
    description:
      "Элегантный женский аромат с нотами граната, пиона и мускуса. Свежий и лёгкий, идеален для дневного использования. Стойкость — 6-8 часов. Оригинальный флакон украшен кристаллом Сваровски. Подарочная упаковка в комплекте.",
    price: 1290000,
    old_price: 1490000,
    stock: 20,
    category_id: 5,
    delivery_time: "1–2 дня",
    brand: "Versace",
    images: [
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Объём: "90 мл",
      Тип: "Парфюмерная вода",
      Стойкость: "6–8 ч",
      "Верхние ноты": "Гранат, юзу",
    },
    status: "active",
    seller_id: 9,
  },
  {
    title: "Фен для волос Dyson Supersonic HD08",
    description:
      "Инновационный фен с цифровым мотором V9 и интеллектуальным контролем температуры 40 раз в секунду. 5 магнитных насадок в комплекте. Не повреждает волосы благодаря равномерному воздушному потоку. Тихая работа и стильный дизайн.",
    price: 5490000,
    old_price: null,
    stock: 10,
    category_id: 5,
    delivery_time: "2–3 дня",
    brand: "Dyson",
    images: [
      "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1585747860019-f3983cf70e6d?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Мотор: "V9 Digital",
      Скорости: "3",
      Температуры: "4",
      Насадки: "5 магнитных",
    },
    status: "active",
    seller_id: 9,
  },

  // ═════════════════════════════════════
  // СПОРТ (category_id: 6)
  // ═════════════════════════════════════
  {
    title: "Коврик для йоги TPE 6 мм двухслойный",
    description:
      "Экологичный двухслойный коврик из термопластичного эластомера. Нескользящая текстура с обеих сторон, толщина 6 мм для комфорта коленей. Размер 183×61 см. В комплекте лямка для переноски. Легко моется водой и не впитывает пот.",
    price: 185000,
    old_price: 249000,
    stock: 70,
    category_id: 6,
    delivery_time: "Завтра",
    brand: "FlexMat",
    images: [
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Материал: "TPE",
      Толщина: "6 мм",
      Размер: "183 × 61 см",
      Вес: "0.9 кг",
    },
    status: "active",
    seller_id: 7,
  },
  {
    title: "Гантели разборные 2×15 кг с блинами",
    description:
      "Набор разборных гантелей для домашних тренировок. Рифлёный хромированный гриф 35 мм, блины с пластиковым покрытием. Регулируемый вес от 2 до 15 кг на каждую гантель. Замки-гайки с накаткой для надёжной фиксации. Компактное хранение.",
    price: 490000,
    old_price: 590000,
    stock: 25,
    category_id: 6,
    delivery_time: "2–3 дня",
    brand: "IronCore",
    images: [
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Вес: "2 × 15 кг",
      Гриф: "35 мм, хром",
      Блины: "Пластиковое покрытие",
      Замки: "Гайка с накаткой",
    },
    status: "active",
    seller_id: 7,
  },
  {
    title: "Велосипед горный Trail X7 27.5 дюймов",
    description:
      "Горный велосипед с алюминиевой рамой 17 дюймов и колёсами 27.5 дюймов. Вилка с ходом 100 мм, трансмиссия Shimano Altus 3×8 скоростей. Гидравлические дисковые тормоза обеспечивают уверенное торможение в любую погоду. Вес 13.5 кг.",
    price: 4990000,
    old_price: 5990000,
    stock: 7,
    category_id: 6,
    delivery_time: "3–5 дней",
    brand: "Trail",
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Рама: 'Алюминий 17"',
      Колёса: '27.5"',
      Трансмиссия: "Shimano Altus 3×8",
      Тормоза: "Гидравлические диск.",
    },
    status: "active",
    seller_id: 7,
  },
  {
    title: "Скакалка скоростная со счётчиком Speed Pro",
    description:
      "Профессиональная скоростная скакалка с подшипниками и электронным счётчиком прыжков. Стальной трос в ПВХ-оболочке, эргономичные ручки из нескользящего пеноматериала. Регулируемая длина до 3 метров. Питание — батарейка CR2032 (в комплекте).",
    price: 85000,
    old_price: null,
    stock: 120,
    category_id: 6,
    delivery_time: "Завтра",
    brand: "Speed Pro",
    images: [
      "https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Трос: "Сталь в ПВХ",
      Длина: "До 3 м",
      Счётчик: "Электронный",
      Вес: "215 г",
    },
    status: "active",
    seller_id: 7,
  },
  {
    title: "Рюкзак спортивный Nike Brasilia 24 л",
    description:
      "Вместительный спортивный рюкзак с отделением для обуви и двумя боковыми карманами для бутылок. Мягкие регулируемые лямки и спинка с воздухопроницаемой сеткой. Карман-органайзер для мелочей и петля для ключей. Плотное непромокаемое дно.",
    price: 290000,
    old_price: 350000,
    stock: 50,
    category_id: 6,
    delivery_time: "Завтра",
    brand: "Nike",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581605405669-fcdf81165571?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Объём: "24 л",
      Материал: "Полиэстер 600D",
      "Отделение для обуви": "Да",
      Размеры: "48 × 30 × 18 см",
    },
    status: "active",
    seller_id: 7,
  },

  // ═════════════════════════════════════
  // ДОМ И САД (category_id: 7)
  // ═════════════════════════════════════
  {
    title: "Постельное бельё сатин Luxury Home 2-спальное",
    description:
      "Комплект постельного белья из 100% хлопкового сатина плотностью 200 нитей/дюйм². Гладкая шелковистая поверхность, стойкое окрашивание без линьки. В комплекте: пододеяльник 200×220 см, простыня 240×260 см и 2 наволочки 50×70 см.",
    price: 390000,
    old_price: 490000,
    stock: 35,
    category_id: 7,
    delivery_time: "1–2 дня",
    brand: "Luxury Home",
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Материал: "Сатин 100% хлопок",
      Плотность: "200 нитей/дюйм²",
      Размер: "2-спальный",
      Комплектация: "4 предмета",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Набор кастрюль из нержавеющей стали 6 предметов",
    description:
      "Набор кастрюль с крышками из хирургической стали 18/10. Трёхслойное дно для равномерного нагрева: нержавейка-алюминий-нержавейка. Объёмы 1.5, 2.5 и 4 литра. Ручки Stay-Cool не нагреваются. Можно мыть в посудомоечной машине и использовать в духовке до 240°.",
    price: 790000,
    old_price: 990000,
    stock: 20,
    category_id: 7,
    delivery_time: "2–3 дня",
    brand: "SteelPro",
    images: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1584990347449-a6c1e0f5e1ef?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Материал: "Нержавеющая сталь 18/10",
      Объём: "1.5 + 2.5 + 4 л",
      Дно: "Трёхслойное",
      Духовка: "До 240°",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Настольная LED-лампа с беспроводной зарядкой",
    description:
      "Многофункциональная настольная лампа с тремя режимами освещения и встроенной беспроводной зарядкой Qi 15 Вт. Гибкая ножка с поворотом на 360°, сенсорное управление яркостью. Ночной режим с тёплым светом 2700K. Питание от USB-C.",
    price: 245000,
    old_price: 320000,
    stock: 45,
    category_id: 7,
    delivery_time: "Завтра",
    brand: "LightDesk",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057ab824?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Мощность: "12 Вт LED",
      Зарядка: "Qi 15 Вт",
      "Режимы света": "3 (2700K–6500K)",
      Питание: "USB-C",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Комнатное растение Монстера в горшке 30 см",
    description:
      "Живое комнатное растение Монстера Делициоза высотой 30 см в декоративном кашпо. Неприхотливое растение, очищает воздух и создаёт уют. Полив раз в неделю, предпочитает рассеянный свет. Доставляется в специальной упаковке, защищающей листья.",
    price: 165000,
    old_price: null,
    stock: 15,
    category_id: 7,
    delivery_time: "Завтра",
    brand: "GreenHouse",
    images: [
      "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Растение: "Монстера Делициоза",
      Высота: "30 см",
      Кашпо: "Керамика",
      Свет: "Рассеянный",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Набор садовых инструментов 9 предметов",
    description:
      "Полный набор садовых инструментов в удобной сумке-органайзере. Лопатка, грабельки, секатор, совок, рыхлитель, перчатки, бирки для растений, распылитель и коврик для колен. Ручки из нескользящего каучука, стальные насадки с антикоррозийным покрытием.",
    price: 320000,
    old_price: 420000,
    stock: 25,
    category_id: 7,
    delivery_time: "2–3 дня",
    brand: "GardenTool",
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Предметов: "9",
      Материал: "Сталь + каучук",
      Сумка: "Да",
      Секатор: "Обводной, 20 мм",
    },
    status: "active",
    seller_id: 6,
  },

  // ═════════════════════════════════════
  // КНИГИ (category_id: 8)
  // ═════════════════════════════════════
  {
    title: "Книга «Атомные привычки» Джеймс Клир",
    description:
      "Бестселлер о том, как маленькие изменения приводят к большим результатам. Джеймс Клир предлагает проверенную систему для формирования полезных привычек и избавления от вредных. Более 10 миллионов проданных экземпляров по всему миру. Твёрдый переплёт, 304 страницы.",
    price: 125000,
    old_price: 155000,
    stock: 60,
    category_id: 8,
    delivery_time: "Завтра",
    brand: "Без бренда",
    images: [
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Автор: "Джеймс Клир",
      Страниц: "304",
      Переплёт: "Твёрдый",
      Язык: "Русский",
    },
    status: "active",
    seller_id: 8,
  },
  {
    title: "Книга «Думай медленно, решай быстро» Канеман",
    description:
      "Нобелевский лауреат Даниэль Канеман объясняет, как работают два режима мышления и почему мы принимаем нерациональные решения. Книга изменит ваш взгляд на работу собственного разума. 656 страниц увлекательного чтения, мягкая обложка.",
    price: 145000,
    old_price: null,
    stock: 45,
    category_id: 8,
    delivery_time: "Завтра",
    brand: "Без бренда",
    images: [
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Автор: "Даниэль Канеман",
      Страниц: "656",
      Переплёт: "Мягкий",
      Язык: "Русский",
    },
    status: "active",
    seller_id: 8,
  },
  {
    title: "Набор маркеров-хайлайтеров 12 цветов Stabilo",
    description:
      "Набор маркеров-хайлайтеров из 12 пастельных цветов для учёбы и работы. Скошенное перо 2–5 мм подходит для подчёркивания и рисования. Чернила на водной основе не просвечивают через бумагу. Прозрачный корпус показывает уровень чернил.",
    price: 89000,
    old_price: 115000,
    stock: 95,
    category_id: 8,
    delivery_time: "Завтра",
    brand: "Stabilo",
    images: [
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Цветов: "12 пастельных",
      Перо: "Скошенное 2–5 мм",
      Основа: "Водная",
      Корпус: "Прозрачный",
    },
    status: "active",
    seller_id: 8,
  },
  {
    title: "Ежедневник A5 кожаный 2026 с закладкой",
    description:
      "Премиальный ежедневник формата A5 в обложке из экокожи. Датированный на 2026 год, 365 страниц из кремовой бумаги 80 г/м². Ляссе-закладка, резинка-застёжка, кармашек для визиток на внутренней обложке. Матовое тиснение на корешке.",
    price: 159000,
    old_price: null,
    stock: 55,
    category_id: 8,
    delivery_time: "Завтра",
    brand: "NotePro",
    images: [
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Формат: "A5",
      Бумага: "80 г/м², кремовая",
      Обложка: "Экокожа",
      Страниц: "365",
    },
    status: "active",
    seller_id: 8,
  },

  // ═════════════════════════════════════
  // ДЕТЯМ (category_id: 9)
  // ═════════════════════════════════════
  {
    title: "Конструктор совместимый с LEGO City 450 деталей",
    description:
      "Конструктор «Пожарная станция» из 450 деталей, совместимый с LEGO. В комплекте 4 минифигурки, пожарная машина с выдвижной лестницей и вертолёт. Пластик ABS сертифицирован EN 71. Подробная инструкция с пошаговой сборкой. Возраст 6+.",
    price: 385000,
    old_price: 495000,
    stock: 30,
    category_id: 9,
    delivery_time: "1–2 дня",
    brand: "BrickCity",
    images: [
      "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Деталей: "450",
      Фигурок: "4",
      Возраст: "6+",
      Материал: "ABS пластик",
    },
    status: "active",
    seller_id: 10,
  },
  {
    title: "Машина на радиоуправлении Monster Truck 4WD",
    description:
      "Внедорожник на радиоуправлении с полным приводом 4WD и масштабом 1:16. Скорость до 25 км/ч, ходовая с независимой подвеской и амортизаторами. Аккумулятор 7.4V 1200 мА·ч, зарядка USB за 2.5 часа. Водозащита IPX4 — можно ездить по лужам.",
    price: 490000,
    old_price: 620000,
    stock: 18,
    category_id: 9,
    delivery_time: "1–2 дня",
    brand: "RallyTruck",
    images: [
      "https://images.unsplash.com/photo-1581235707960-35f13931b5f1?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Масштаб: "1:16",
      Привод: "4WD",
      Скорость: "до 25 км/ч",
      Батарея: "7.4V 1200 мА·ч",
    },
    status: "active",
    seller_id: 10,
  },
  {
    title: "Кукольный домик DreamHouse 3 этажа с мебелью",
    description:
      "Трёхэтажный деревянный кукольный домик высотой 90 см. В комплекте 15 предметов мебели: кровать, стол, стулья, ванная, кухня. Фасад раскрывается для удобной игры. Раскрашен безопасными красками на водной основе. Подходит для кукол до 30 см.",
    price: 690000,
    old_price: 890000,
    stock: 12,
    category_id: 9,
    delivery_time: "2–3 дня",
    brand: "DreamHouse",
    images: [
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Высота: "90 см",
      Этажи: "3",
      Мебель: "15 предметов",
      "Для кукол": "до 30 см",
    },
    status: "active",
    seller_id: 10,
  },
  {
    title: "Настольная игра «Alias: Семейная версия»",
    description:
      "Весёлая командная игра на объяснение слов. Семейная версия подходит для игроков от 7 лет — карточки разделены на детские и взрослые. 400 карточек, таймер, игровое поле и фишки в комплекте. Время партии 30–60 минут, 4–12 игроков.",
    price: 195000,
    old_price: 245000,
    stock: 40,
    category_id: 9,
    delivery_time: "Завтра",
    brand: "Tactic Games",
    images: [
      "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Возраст: "7+",
      Игроков: "4–12",
      Карточек: "400",
      "Время партии": "30–60 мин",
    },
    status: "active",
    seller_id: 10,
  },

  // ═════════════════════════════════════
  // ПРОДУКТЫ (category_id: 10) — adding items here to fill this empty cat
  // ═════════════════════════════════════
  {
    title: "Набор специй для плова «Восточный базар» 12 видов",
    description:
      "Подарочный набор из 12 видов специй для приготовления настоящего узбекского плова. Зира, барбарис, куркума, кориандр, чёрный перец и другие. Каждая специя в отдельной стеклянной баночке 30 г. Деревянная шкатулка с ручной гравировкой.",
    price: 195000,
    old_price: 250000,
    stock: 35,
    category_id: 10,
    delivery_time: "2–3 дня",
    brand: "Восточный базар",
    images: [
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&h=600&fit=crop",
    ],
    characteristics: {
      "Кол-во специй": "12",
      Упаковка: "Стеклянные баночки",
      "Вес каждой": "30 г",
      Шкатулка: "Деревянная",
    },
    status: "active",
    seller_id: 1,
  },
  {
    title: "Мёд горный натуральный Ферганская долина 500 г",
    description:
      "Натуральный горный мёд из Ферганской долины, собранный с разнотравья на высоте 2000 метров. Густая текстура, насыщенный аромат и богатый вкус с цветочными нотками. Стеклянная банка с деревянной крышкой. Сертификат качества и лабораторный анализ в комплекте.",
    price: 135000,
    old_price: null,
    stock: 50,
    category_id: 10,
    delivery_time: "2–3 дня",
    brand: "Без бренда",
    images: [
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Тип: "Горный разнотравье",
      Объём: "500 г",
      Упаковка: "Стеклянная банка",
      Происхождение: "Ферганская долина",
    },
    status: "active",
    seller_id: 1,
  },

  // ═════════════════════════════════════
  // ОБУВЬ (category_id: 4) — empty category, adding items
  // ═════════════════════════════════════
  {
    title: "Кеды мужские классические белые Canvas",
    description:
      "Классические белые кеды из прочного хлопкового канваса. Вулканизированная резиновая подошва, текстильная подкладка и стелька с поддержкой свода стопы. Металлические люверсы и хлопковая шнуровка. Вечная классика, которая сочетается с любым образом.",
    price: 290000,
    old_price: 390000,
    stock: 70,
    category_id: 4,
    delivery_time: "1–2 дня",
    brand: "Canvas",
    images: [
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Верх: "Канвас (хлопок)",
      Подошва: "Вулканизированная резина",
      Размеры: "39–45",
      Цвет: "Белый",
    },
    status: "active",
    seller_id: 1,
  },
  {
    title: "Босоножки женские на платформе Summer Vibes",
    description:
      "Стильные летние босоножки на удобной платформе 5 см. Верх из натуральной кожи, мягкая анатомическая стелька с подушечкой под пятку. Регулируемый ремешок на щиколотке с металлической пряжкой. Лёгкая EVA-подошва не скользит на мокром покрытии.",
    price: 450000,
    old_price: 590000,
    stock: 30,
    category_id: 4,
    delivery_time: "1–2 дня",
    brand: "Summer Vibes",
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Верх: "Натуральная кожа",
      Платформа: "5 см",
      Застёжка: "Ремешок",
      Подошва: "EVA",
    },
    status: "active",
    seller_id: 1,
  },

  // ═════════════════════════════════════
  // ЕЩЁ ЭЛЕКТРОНИКА (разные продавцы)
  // ═════════════════════════════════════
  {
    title: 'Монитор для игр ASUS 27" 165 Гц IPS',
    description:
      "Игровой монитор 27 дюймов с IPS-матрицей 2K (2560×1440) и частотой обновления 165 Гц. Время отклика 1 мс GTG, поддержка AMD FreeSync Premium и HDR400. Безрамочный дизайн, регулировка высоты и наклона. Порты HDMI 2.0 и DisplayPort 1.4.",
    price: 4790000,
    old_price: 5490000,
    stock: 10,
    category_id: 1,
    delivery_time: "2–3 дня",
    brand: "ASUS",
    images: [
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Матрица: "IPS 2K",
      Частота: "165 Гц",
      "Время отклика": "1 мс GTG",
      Порты: "HDMI 2.0, DP 1.4",
    },
    status: "active",
    seller_id: 3,
  },
  {
    title: "Веб-камера Logitech C920s Pro Full HD",
    description:
      "Веб-камера Full HD 1080p с автофокусом и двумя встроенными микрофонами. Шторка приватности на объективе. Автоматическая коррекция освещения RightLight 3. Совместима с Zoom, Teams, Skype. Универсальное крепление на монитор или штатив.",
    price: 690000,
    old_price: null,
    stock: 30,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "Logitech",
    images: [
      "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Разрешение: "1080p / 30 fps",
      Фокус: "Автофокус",
      Микрофон: "Стерео",
      Шторка: "Да",
    },
    status: "active",
    seller_id: 3,
  },
  {
    title: "SSD NVMe Samsung 980 Pro 1 ТБ",
    description:
      "Сверхбыстрый NVMe SSD с интерфейсом PCIe 4.0 x4. Скорость чтения до 7000 МБ/с и записи до 5100 МБ/с. Контроллер Elpis и память V-NAND TLC. Технология термоконтроля Dynamic Thermal Guard предотвращает троттлинг. Ресурс 600 TBW.",
    price: 1490000,
    old_price: 1790000,
    stock: 22,
    category_id: 1,
    delivery_time: "Завтра",
    brand: "Samsung",
    images: [
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Интерфейс: "PCIe 4.0 x4 NVMe",
      Чтение: "7000 МБ/с",
      Запись: "5100 МБ/с",
      Ресурс: "600 TBW",
    },
    status: "active",
    seller_id: 3,
  },

  // ═════════════════════════════════════
  // ДОМ И САД (Smart House)
  // ═════════════════════════════════════
  {
    title: "Умная розетка Wi-Fi с мониторингом энергии",
    description:
      "Wi-Fi розетка с управлением через приложение и голосовым управлением через Алису и Google Home. Встроенный счётчик потреблённой электроэнергии с графиком в приложении. Таймер и расписание включения. Мощность до 3680 Вт, защита от перегрузки.",
    price: 125000,
    old_price: 175000,
    stock: 100,
    category_id: 7,
    delivery_time: "Завтра",
    brand: "SmartPlug",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Подключение: "Wi-Fi 2.4 ГГц",
      Мощность: "до 3680 Вт",
      Голосовое: "Алиса, Google",
      Мониторинг: "Да",
    },
    status: "active",
    seller_id: 4,
  },
  {
    title: "Умная лампа RGB LED с пультом и Wi-Fi",
    description:
      "Умная светодиодная лампа E27 с 16 миллионами цветов и настраиваемой цветовой температурой от 2700K до 6500K. Управление со смартфона, голосом (Алиса, Google) или пультом ДУ. Энергопотребление всего 9 Вт при яркости эквивалентной 60 Вт.",
    price: 95000,
    old_price: 130000,
    stock: 150,
    category_id: 7,
    delivery_time: "Завтра",
    brand: "GlowMe",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Цоколь: "E27",
      Мощность: "9 Вт (=60 Вт)",
      Цвета: "16 млн RGB",
      Температура: "2700–6500K",
    },
    status: "active",
    seller_id: 4,
  },

  // ═════════════════════════════════════
  // ДОПОЛНИТЕЛЬНЫЕ для разнообразия
  // ═════════════════════════════════════
  {
    title: "Электросамокат Ninebot KickScooter E2 Plus",
    description:
      "Городской электросамокат с мотором 300 Вт и максимальной скоростью 25 км/ч. Запас хода до 20 км на одном заряде. Складная конструкция весом 13 кг для удобной перевозки в метро. Передний и задний тормоз, светодиодная фара и задний фонарь.",
    price: 4190000,
    old_price: 4790000,
    stock: 8,
    category_id: 6,
    delivery_time: "3–5 дней",
    brand: "Ninebot",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Мотор: "300 Вт",
      "Макс. скорость": "25 км/ч",
      Запас: "20 км",
      Вес: "13 кг",
    },
    status: "active",
    seller_id: 7,
  },
  {
    title: "Чемодан дорожный на колёсах ABS 24 дюйма",
    description:
      "Прочный чемодан из ударопрочного ABS-пластика объёмом 65 литров. Четыре сдвоенных колеса вращаются на 360° для маневренности. TSA-замок для безопасности. Телескопическая ручка с тремя положениями, боковая и верхняя ручки для подъёма.",
    price: 590000,
    old_price: 790000,
    stock: 20,
    category_id: 7,
    delivery_time: "2–3 дня",
    brand: "TravelPro",
    images: [
      "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Материал: "ABS-пластик",
      Объём: "65 л",
      Колёса: "4 × сдвоенные",
      Замок: "TSA",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Термокружка Stanley Classic 0.47 л",
    description:
      "Легендарная термокружка Stanley из нержавеющей стали с вакуумной изоляцией. Сохраняет напитки горячими 7 часов и холодными 10 часов. Герметичная крышка с кнопкой для питья одной рукой. Объём 470 мл, помещается в автомобильный подстаканник.",
    price: 245000,
    old_price: null,
    stock: 60,
    category_id: 7,
    delivery_time: "Завтра",
    brand: "Stanley",
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Объём: "470 мл",
      Материал: "Нержавеющая сталь 18/8",
      Горячее: "7 ч",
      Холодное: "10 ч",
    },
    status: "active",
    seller_id: 6,
  },
  {
    title: "Наушники накладные Sony WH-1000XM5",
    description:
      "Флагманские беспроводные наушники с лучшим в классе активным шумоподавлением. Два процессора V1 и QN1, 8 микрофонов для отсечения шума. 30 часов автономной работы, быстрая зарядка (3 мин = 3 ч). Складная конструкция, мягкие амбушюры из экокожи.",
    price: 4290000,
    old_price: 4990000,
    stock: 14,
    category_id: 1,
    delivery_time: "1–2 дня",
    brand: "Sony",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Тип: "Накладные закрытые",
      ANC: "8 микрофонов",
      Батарея: "30 ч",
      Кодеки: "LDAC, AAC, SBC",
    },
    status: "active",
    seller_id: 2,
  },
  {
    title: "Планшет Samsung Galaxy Tab S9 FE 128 ГБ",
    description:
      "Планшет 10.9 дюймов с IPS-экраном 2K и частотой 90 Гц. Процессор Exynos 1380, 6 ГБ оперативной и 128 ГБ встроенной памяти. Стилус S Pen в комплекте для рисования и заметок. Батарея 8000 мА·ч на весь день, водозащита IP68.",
    price: 5490000,
    old_price: 6290000,
    stock: 9,
    category_id: 1,
    delivery_time: "1–2 дня",
    brand: "Samsung",
    images: [
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1561154464-82e9aab73f72?w=600&h=600&fit=crop",
    ],
    characteristics: {
      Экран: '10.9" IPS 2K 90 Гц',
      Память: "6/128 ГБ",
      Батарея: "8000 мА·ч",
      "S Pen": "В комплекте",
    },
    status: "active",
    seller_id: 2,
  },
];

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔗 Backend: ${BACKEND}\n`);

  // 1. Login as all sellers
  console.log("📋 Step 1: Authenticating seller accounts...");
  const sessions = {};
  for (const account of SELLER_ACCOUNTS) {
    try {
      const session = await login(account.email, account.password);
      sessions[account.email] = session;
    } catch (e) {
      console.error(`  ✗ Failed to login ${account.email}: ${e.message}`);
    }
  }

  // Use electro@uzum.uz as primary session (Electro House, seller_id=2)
  const primarySession =
    sessions["electro@uzum.uz"] || sessions["seller@uzum.uz"];
  if (!primarySession) {
    console.error("✗ No seller sessions available. Cannot proceed.");
    process.exit(1);
  }

  // 2. Get all current products
  console.log("\n📋 Step 2: Fetching existing products...");
  const existing = await apiCall(
    "GET",
    "/products/?page_size=120",
    null,
    primarySession,
  );
  if (!existing) {
    console.error("✗ Cannot fetch products.");
    process.exit(1);
  }
  console.log(`  Found ${existing.count} existing products.`);

  // 3. Delete all existing products
  console.log("\n📋 Step 3: Deleting existing products...");
  let deleted = 0;
  for (const product of existing.results) {
    // Need the owner's session to delete
    const result = await apiCall(
      "DELETE",
      `/products/${product.id}/`,
      null,
      primarySession,
    );
    if (result) {
      deleted++;
      process.stdout.write(`\r  Deleted ${deleted}/${existing.results.length}`);
    } else {
      // Try with the other session
      for (const email of Object.keys(sessions)) {
        const r = await apiCall(
          "DELETE",
          `/products/${product.id}/`,
          null,
          sessions[email],
        );
        if (r) {
          deleted++;
          process.stdout.write(
            `\r  Deleted ${deleted}/${existing.results.length}`,
          );
          break;
        }
      }
    }
    await sleep(2000);
  }
  console.log(`\n  ✓ Deleted ${deleted} products.`);

  // 4. Create new products
  console.log(`\n📋 Step 4: Creating ${PRODUCTS.length} new products...`);
  let created = 0;
  let failed = 0;

  for (const product of PRODUCTS) {
    // Need to use the session that owns the seller
    // seller_id=1 (Uzum Students) → seller@uzum.uz
    // seller_id=2 (Electro House) → electro@uzum.uz
    // For other sellers (3-10), we'll try both sessions
    let session;
    if (product.seller_id === 1) {
      session = sessions["seller@uzum.uz"] || primarySession;
    } else if (product.seller_id === 2) {
      session = sessions["electro@uzum.uz"] || primarySession;
    } else {
      session = primarySession;
    }

    const payload = {
      title: product.title,
      description: product.description,
      price: product.price,
      old_price: product.old_price,
      stock: product.stock,
      category_id: product.category_id,
      delivery_time: product.delivery_time || "Завтра",
      brand: product.brand || "Без бренда",
      images: product.images,
      characteristics: product.characteristics || {},
      status: product.status || "active",
      is_ad: product.is_ad || false,
    };

    const result = await apiCall("POST", "/products/", payload, session);
    if (result) {
      created++;
      process.stdout.write(
        `\r  Created ${created}/${PRODUCTS.length} (failed: ${failed})`,
      );
    } else {
      // Try with alternative sessions
      let success = false;
      for (const email of Object.keys(sessions)) {
        if (sessions[email] === session) continue;
        const r = await apiCall("POST", "/products/", payload, sessions[email]);
        if (r) {
          created++;
          success = true;
          process.stdout.write(
            `\r  Created ${created}/${PRODUCTS.length} (failed: ${failed})`,
          );
          break;
        }
      }
      if (!success) {
        failed++;
        console.log(`\n  ⚠ Failed to create: "${product.title}"`);
      }
    }
    await sleep(3000);
  }

  console.log(`\n\n✅ Done! Created ${created} products, ${failed} failed.`);
  console.log(`   Total products on backend should now be ${created}.\n`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
