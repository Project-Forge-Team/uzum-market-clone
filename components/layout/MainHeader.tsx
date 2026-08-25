"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { fetchCategories, fetchMe } from "@/lib/api";
import { authService } from "@/lib/auth-service";
import { Menu, X, Search, User, Heart, ShoppingBag, Boxes } from "lucide-react";


export default function MainHeader() {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<
    { id: number; name: string; slug: string }[]
  >([]);

  // Состояния авторизации и имени пользователя
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // 1. Загружаем категории из backend для каталога
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchCategories();
        if (!ignore) {
          setCategories(
            (data.results || []).map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
            })),
          );
        }
      } catch (error) {
        console.error("Ошибка загрузки категорий:", error);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 2. Проверяем авторизацию и получаем имя при монтировании и смене маршрута
  // В импортах MainHeader.tsx добавь:


  // ... внутри компонента ...

  useEffect(() => {
    const checkAuthAndUser = async () => {
      const isAuth = authService.isAuthenticated();
      setIsAuthenticated(isAuth);

      if (isAuth) {
        // Мгновенно показываем имя из кэша
        const cachedName = localStorage.getItem("uzum_user_name");
        if (cachedName) setUserName(cachedName);

        try {
          // Вызываем нашу умную функцию! 
          // Если access протух, она сама обновит его через /auth/refresh/ и вернет данные.
          const userData = await fetchMe();

          if (userData && userData.first_name) {
            setUserName(userData.first_name);
            localStorage.setItem("uzum_user_name", userData.first_name);
          } else {
            // Если fetchMe вернул null (например, refresh тоже протух и куки очистились)
            setIsAuthenticated(false);
            setUserName(null);
          }
        } catch (error) {
          console.error("Ошибка проверки сессии:", error);
        }
      } else {
        setUserName(null);
      }
    };

    checkAuthAndUser();
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  // Формируем текст для кнопки профиля
  const profileText = isAuthenticated ? (userName || "Профиль") : "Войти";

  return (
    <>
      <header className="bg-white border-b border-gray-100 relative z-20">
        <div className="w-full max-w-[1240px] mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row items-center gap-3 md:gap-6">

          {/* ВЕРХНЯЯ СТРОКА */}
          <div className="w-full md:w-auto flex items-center justify-between gap-3 shrink-0">
            <Link href="/" className="flex items-center">
              <img
                src="/headLogo.png"
                alt="Uzum Market"
                className="h-[22px] sm:h-[26px] w-auto"
              />
            </Link>

            {/* Иконки действий на МОБИЛЬНЫХ */}
            <div className="flex md:hidden items-center gap-3">
              {/* Мобильная кнопка профиля/входа с именем */}
              <Link href="/profile" className="flex items-center gap-1.5 p-1.5 text-gray-700 hover:text-[#7000FF]">
                <User size={22} />
                {isAuthenticated && (
                  <span className="text-sm font-medium max-w-[80px] truncate hidden sm:inline">
                    {userName || ""}
                  </span>
                )}
              </Link>
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

          {/* ПОЛЕ ПОИСКА */}
          <form
            onSubmit={handleSearch}
            className="w-full flex-1 flex items-center"
          >
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Искать товары и категории"
                className="w-full h-[40px] md:h-[44px] pl-4 pr-12 rounded-l-lg border border-r-0 border-gray-200 focus:outline-none focus:border-[#7000FF] text-[14px] transition-colors"
              />
              <button
                type="submit"
                className="h-[40px] md:h-[44px] px-5 bg-[#F2F4F7] text-gray-600 rounded-r-lg border border-l-0 border-gray-200 hover:bg-[#E5E7EB] transition-colors flex items-center justify-center shrink-0"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* ПРАВАЯ ЧАСТЬ (Только для ДЕСКТОПА md+) */}
          <div className="hidden md:flex items-center gap-6 shrink-0">

            {/* === КНОПКА ПРОФИЛЯ / ВХОДА С ИМЕНЕМ === */}
            <Link
              href="/profile"
              className="flex items-center gap-2 text-gray-700 hover:text-[#7000FF] transition-colors"
            >
              <User size={22} />
              <span className="font-medium text-[14px] max-w-[120px] truncate">
                {profileText}
              </span>
            </Link>
            {/* ========================================= */}

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

            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/catalog/${cat.slug}`}
                      className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group"
                    >
                      <Boxes
                        size={22}
                        className="text-gray-400 group-hover:text-[#7000FF]"
                      />
                      <span className="font-medium text-[15px]">
                        {cat.name}
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 p-3.5">Загрузка категорий…</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}