"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  { id: 1, image: "/HeroImage.png", alt: "Школьный базар" },
  { id: 2, image: "/HeroImage2.png", alt: "Летняя распродажа" }
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 mt-6">
      
      {/* ВЕРХНЯЯ ЧАСТЬ: Слайдер */}
      <div className="relative w-full h-[280px] md:h-[360px] rounded-2xl overflow-hidden bg-gray-100">
        
        {/* Картинка текущего слайда */}
        <img 
          src={slides[currentSlide].image}
          alt={slides[currentSlide].alt} 
          className="w-full h-full object-cover transition-opacity duration-500 ease-in-out"
        />
        
        {/* Кнопки навигации - ВСЕГДА ВИДНЫ */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all z-10"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all z-10"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>

        {/* Точки пагинации */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, index) => (
            <div 
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
              }`}
            ></div>
          ))}
        </div>
      </div>

      {/* НИЖНЯЯ ЧАСТЬ: Быстрые категории */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {[
          { name: "Детский мир", icon: "/icons/ChildWorld.png", bg: "bg-purple-100" },
          { name: "Бытовая техника", icon: "/icons/Appliances.png", bg: "bg-blue-100" },
          { name: "Модный базар", icon: "/icons/Fashion Bazaar.png", bg: "bg-yellow-100" },
          { name: "Школьный базар", icon: "/icons/School Bazaar.png", bg: "bg-green-100" }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
            <div className={`w-10 h-10 ${item.bg} rounded-full flex items-center justify-center shrink-0 overflow-hidden`}>
              <img src={item.icon} alt={item.name} className="w-6 h-6 object-contain" />
            </div>
            <span className="font-medium text-sm text-gray-800 leading-tight">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}