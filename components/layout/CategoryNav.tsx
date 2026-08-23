// components/layout/CategoryNav.tsx
"use client";
import { useState, useEffect } from "react";
import { fetchCategories } from "@/lib/api";

export default function CategoryNav() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchCategories();
        if (!ignore) {
          setCategories((data.results || []).map((c) => c.name));
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

  // Пока категории не загрузились — показываем заглушки
  const items =
    categories.length > 0 ? categories : ["Электроника", "Бытовая техника"];

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="w-full max-w-[1240px] mx-auto px-4">
        <ul className="flex items-center gap-6 py-3 overflow-x-auto">
          {items.map((name) => (
            <li
              key={name}
              className="shrink-0 text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
