import { MapPin, ChevronDown } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-[#F0F2F5] text-[14px] font-semibold">
      <div className="flex items-center justify-between container py-[9px]">

        {/* ЛЕВАЯ ЧАСТЬ */}
        <div className="flex items-center gap-[24px] ">
          <button className="flex items-center gap-[3px]">
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
        <div className="flex items-center gap-[12px]">
          <a
            href="#"
            className="text-[#7F4DFF] pr-[12px] border-r-2 border-[#DEE0E5] hover:text-[#5A3DCC] transition-colors"
          >
            Стать продавцом
          </a>
          <a href="#" className="text-[#7F4DFF] hover:text-[#5A3DCC] transition-colors">Открыть пункт выдачи</a>
          <a href="#" className="text-[#6B7280] hover:text-[#1F1F1F] transition-colors">Вопрос-ответ</a>
          <a href="#" className="text-[#6B7280] hover:text-[#1F1F1F] transition-colors">Мои заказы</a>

          <div className="flex items-center gap-[8px]">
            {/* Пустое место для иконки флага */}
            <img
              src="/icons/russia.png"
              alt="Флаг России"
              width={15}
              height={15}
            />
            <span>Русский</span>
          </div>
        </div>

      </div>
    </div>
  );
}