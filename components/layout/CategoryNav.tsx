// components/layout/CategoryNav.tsx
export default function CategoryNav() {
  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="w-full max-w-[1240px] mx-auto px-4">
        <ul className="flex items-center gap-6 py-3 overflow-x-auto">
          <li className="shrink-0 text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap">
            Мебель
          </li>
          <li className="shrink-0 text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap">
            Туризм, рыбалка и охота
          </li>
          <li className="shrink-0 text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap">
            Электроника
          </li>
          <li className="shrink-0 text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap">
            Бытовая техника
          </li>
          <li className="shrink-0 text-sm font-medium text-gray-700 hover:text-[#7000FF] cursor-pointer whitespace-nowrap">
            Одежда
          </li>
        </ul>
      </div>
    </nav>
  );
}