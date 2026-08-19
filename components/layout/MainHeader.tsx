"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  User,
  Heart,
  ShoppingBag,
  Sofa,
  Tent,
  Monitor,
  WashingMachine,
  Shirt,
} from "lucide-react";

export default function MainHeader() {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-100 relative z-20">
        <div className="w-full max-w-[1240px] mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row items-center gap-3 md:gap-6">
          {/* ВЕРХНЯЯ СТРОКА (Лого + Каталог + Иконки на мобильном) */}
          <div className="w-full md:w-auto flex items-center justify-between gap-3 shrink-0">
            {/* Логотип */}
            <Link href="/" className="flex items-center">
              <img
                src="/headLogo.png"
                alt="Uzum Market"
                className="h-[22px] sm:h-[26px] w-auto"
              />
            </Link>

            {/* Кнопка Каталог (Скрывается на совсем маленьких экранах или адаптируется) */}

            {/* Иконки действий на МОБИЛЬНЫХ (выносятся в верхнюю строку) */}
            <div className="flex md:hidden items-center gap-3">
              <a href="#" className="p-1.5 text-gray-700 hover:text-[#7000FF]">
                <User size={22} />
              </a>
              <a href="#" className="p-1.5 text-gray-700 hover:text-[#7000FF]">
                <Heart size={22} />
              </a>
              <a href="#" className="p-1.5 text-gray-700 hover:text-[#7000FF]">
                <ShoppingBag size={22} />
              </a>
            </div>
            <button
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
              className="flex items-center gap-2 bg-[#F0F0FF] text-[#7000FF] px-4 py-2.5 rounded-lg font-medium hover:bg-[#E2E0FF] transition-colors shrink-0"
            >
              {isCatalogOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="hidden sm:inline">Каталог</span>
            </button>
          </div>

          {/* ПОЛЕ ПОИСКА (На десктопе в центре, на мобильных во 2-й строчке) */}
          <div className="w-full flex-1 flex items-center">
            <div className="relative w-full flex items-center">
              <input
                type="text"
                placeholder="Искать товары и категории"
                className="w-full h-[40px] md:h-[44px] pl-4 pr-12 rounded-l-lg border border-r-0 border-gray-200 focus:outline-none focus:border-[#7000FF] text-[14px] transition-colors"
              />
              <button className="h-[40px] md:h-[44px] px-5 bg-[#F2F4F7] text-gray-600 rounded-r-lg border border-l-0 border-gray-200 hover:bg-[#E5E7EB] transition-colors flex items-center justify-center shrink-0">
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* ПРАВАЯ ЧАСТЬ (Только для ДЕСКТОПА md+) */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <a
              href="#"
              className="flex items-center gap-2 text-gray-700 hover:text-[#7000FF] transition-colors"
            >
              <User size={22} />
              <span className="font-medium text-[14px]">Shahzod</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-gray-700 hover:text-[#7000FF] transition-colors"
            >
              <Heart size={22} />
              <span className="font-medium text-[14px]">Избранное</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-gray-700 hover:text-[#7000FF] transition-colors"
            >
              <ShoppingBag size={22} />
              <span className="font-medium text-[14px]">Корзина</span>
            </a>
          </div>
        </div>
      </header>

      {/* МОДАЛЬНОЕ ОКНО / ШТОРКА КАТАЛОГА */}
      {isCatalogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-center items-start pt-0 md:pt-[110px]"
          onClick={() => setIsCatalogOpen(false)}
        >
          <div
            className="bg-white w-full max-w-[1240px] h-full md:h-auto md:max-h-[80vh] md:rounded-2xl shadow-xl p-5 md:p-8 overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Кнопка закрытия */}
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100 md:border-none">
              <h2 className="text-xl font-bold text-gray-900">
                Каталог товаров
              </h2>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X size={22} />
              </button>
            </div>

            {/* Элементы каталога */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              <li className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                <Sofa
                  size={22}
                  className="text-gray-400 group-hover:text-[#7000FF]"
                />
                <span className="font-medium text-[15px]">Мебель</span>
              </li>
              <li className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                <Tent
                  size={22}
                  className="text-gray-400 group-hover:text-[#7000FF]"
                />
                <span className="font-medium text-[15px]">Туризм и спорт</span>
              </li>
              <li className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                <Monitor
                  size={22}
                  className="text-gray-400 group-hover:text-[#7000FF]"
                />
                <span className="font-medium text-[15px]">Электроника</span>
              </li>
              <li className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                <WashingMachine
                  size={22}
                  className="text-gray-400 group-hover:text-[#7000FF]"
                />
                <span className="font-medium text-[15px]">Бытовая техника</span>
              </li>
              <li className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                <Shirt
                  size={22}
                  className="text-gray-400 group-hover:text-[#7000FF]"
                />
                <span className="font-medium text-[15px]">Одежда</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
