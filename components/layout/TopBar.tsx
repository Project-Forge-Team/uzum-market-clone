import { MapPin, ChevronDown } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-[#F0F2F5] text-[13px] sm:text-[14px] font-medium text-[#1F1F1F]">
      <div className="w-full max-w-[1240px] mx-auto px-4 flex items-center justify-between h-[36px]">

        {/* ЛЕВАЯ ЧАСТЬ */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Выбор города */}
          <button className="flex items-center gap-1 hover:opacity-70 transition-opacity">
            <MapPin size={15} className="text-[#1F1F1F]" />
            <span className="underline decoration-dotted underline-offset-4">Ташкент</span>
            <ChevronDown size={14} className="text-[#6B7280]" />
          </button>

          {/* Пункты выдачи (скрываем на совсем маленьких экранах) */}
          <a
            href="#"
            className="hidden sm:inline-block text-[#6B7280] hover:text-[#1F1F1F] transition-colors"
          >
            Пункты выдачи
          </a>
        </div>

        {/* ЦЕНТРАЛЬНАЯ / ПРАВАЯ ЧАСТЬ (Информационная плашка в стиле Uzum) */}
        <div className="hidden md:flex items-center text-[#7F4DFF] font-semibold text-[13px]">
          <span>Доставим ваш заказ бесплатно за 1 день!</span>
        </div>

        {/* ПРАВАЯ ЧАСТЬ */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Ссылки для партнеров и покупателей (только на десктопе) */}
          <div className="hidden lg:flex items-center gap-4 text-[#6B7280]">
            <a href="#" className="text-[#7F4DFF] font-medium hover:text-[#5A3DCC] transition-colors">
              Стать продавцом
            </a>
            <a href="#" className="text-[#7F4DFF] font-medium hover:text-[#5A3DCC] transition-colors">
              Открыть пункт выдачи
            </a>
            <a href="#" className="hover:text-[#1F1F1F] transition-colors">
              Вопрос-ответ
            </a>
            <a href="#" className="hover:text-[#1F1F1F] transition-colors">
              Мои заказы
            </a>
          </div>

          {/* Переключатель языка (виден всегда) */}
          <button className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <img
              src="/icons/russia.png"
              alt="Флаг России"
              className="w-[16px] h-[12px] rounded-[2px] object-cover"
            />
            <span className="text-[#1F1F1F]">Русский</span>
          </button>
        </div>

      </div>
    </div>
  );
}