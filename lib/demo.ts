/** Демо-аккаунты локальной «БД» — безопасно показывать в браузере. */
export const DEMO_ACCOUNTS = [
  {
    role: "Продавец",
    email: "seller@uzum.uz",
    password: "Password123",
    hint: "магазин «Uzum Students»: публикует товары, отвечает на отзывы",
  },
  {
    role: "Покупатель",
    email: "buyer@uzum.uz",
    password: "Password123",
    hint: "демо-заказ UZ-100246 и история статусов",
  },
  {
    role: "Техно-магазин",
    email: "electro@uzum.uz",
    password: "Password123",
    hint: "магазин Electro House с товарами электроники",
  },
] as const;
