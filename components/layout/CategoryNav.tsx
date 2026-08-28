"use client";

import Link from "next/link";
import type { Category } from "@/lib/api";

interface CategoryNavProps {
  categories?: Category[];
}

export default function CategoryNav({ categories = [] }: CategoryNavProps) {
  const items =
    categories.length > 0
      ? categories
      : [
          { id: 0, name: "Электроника", slug: "elektronika" },
          { id: 1, name: "Бытовая техника", slug: "bytovaya-tehnika" },
        ];

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="w-full max-w-[1240px] mx-auto px-4">
        <ul className="flex items-center gap-6 py-3 overflow-x-auto">
          {items.map((cat) => (
            <li key={cat.id || cat.name} className="shrink-0">
              <Link
                href={cat.slug ? `/search?category=${cat.id}` : "#"}
                className="text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap"
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
