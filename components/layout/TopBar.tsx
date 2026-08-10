import { MapPin, ChevronDown } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-[#F0F2F5] text-[14px] font-semibold">
      {/* 
        Адаптивный контейнер:
        - w-full max-w-[1240px] mx-auto px-4 — точная ширина как у шапки
        - flex-col gap-2 py-[9px] — по умолчанию колонка для мобильных
        - lg:flex-row lg:justify-between — на десктопе (1024px+) в ряд
      */}
      <div className="w-full max-w-[1240px] mx-auto px-4 flex flex-col gap-2 py-[9px] lg:flex-row lg:items-center lg:justify-between">

        {/* ЛЕВАЯ ЧАСТЬ */}
        <div className="flex items-center gap-[24px]">
          <button className="flex items-center gap-[3px] hover:text-[#1F1F1F] transition-colors">
            <MapPin size={14} />
            Ташкент
            <ChevronDown size={12} />
          </button>

          <a
            href="#"
            className="text-[#6B7280] hover:text-[#1F1F1F] transition-colors"
          >
            Пункты выдачи
          </a>
        </div>

        {/* ПРАВАЯ ЧАСТЬ */}
        {/* hidden lg:flex — скрываем на мобильных, показываем только на десктопе */}
        <div className="flex items-center gap-[12px]">
          <a
            href="#"
            className="text-[#7F4DFF] pr-[12px] border-r-2 border-[#DEE0E5] hover:text-[#5A3DCC] transition-colors hidden lg:flex"
          >
            Стать продавцом
          </a>
          <a href="#" className="text-[#7F4DFF] hover:text-[#5A3DCC] transition-colors hidden lg:flex">Открыть пункт выдачи</a>
          <a href="#" className="text-[#6B7280] hover:text-[#1F1F1F] transition-colors hidden lg:flex">Вопрос-ответ</a>
          <a href="#" className="text-[#6B7280] hover:text-[#1F1F1F] transition-colors hidden lg:flex">Мои заказы</a>

          <div className="flex items-center gap-[8px] cursor-pointer hover:opacity-80 transition-opacity">
            <img
              src="/icons/russia.png"
              alt="Флаг России"
              width={15}
              height={15}
              className="rounded-sm object-cover"
            />
            <span>Русский</span>
          </div>
        </div>

      </div>
    </div>
  );
}