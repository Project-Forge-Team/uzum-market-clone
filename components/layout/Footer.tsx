"use client"; // Обязательно для работы onClick

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white border-t border-gray-100 mt-20 pb-6">
      <div className="w-full max-w-[1240px] mx-auto px-4">
        
        {/* ВЕРХНЯЯ ЧАСТЬ ФУТЕРА */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          
          {/* Колонка 1: О нас */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">О нас</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Пункты выдачи</a></li>
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Вакансии</a></li>
            </ul>
          </div>

          {/* Колонка 2: Пользователям */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Пользователям</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Связаться с нами</a></li>
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Вопрос - Ответ</a></li>
            </ul>
          </div>

          {/* Колонка 3: Для предпринимателей */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Для предпринимателей</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Продавайте на Uzum</a></li>
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Вход для продавцов</a></li>
              <li><a href="#" className="hover:text-[#7000FF] transition-colors">Открыть пункт выдачи</a></li>
            </ul>
          </div>

          {/* Колонка 4: Приложения и Соцсети (С МЕСТОМ ПОД ФОТО) */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Скачать приложение</h3>
            <div className="flex flex-wrap gap-3 mb-6">
              
              {/* Кнопка App Store */}
              <a href="#" className="inline-block h-5 overflow-hidden rounded-lg  hover:opacity-80 transition-opacity">
                <img 
                  src="/icons/appstore.png" 
                  alt="App Store" 
                  className="h-full w-auto object-cover"
                />
              </a>

              {/* Кнопка Google Play */}
              <a href="#" className="inline-block h-5 overflow-hidden rounded-lg  hover:opacity-80 transition-opacity">
                <img 
                  src="/icons/googleplay.png" 
                  alt="Google Play" 
                  className="h-full w-auto object-cover"
                />
              </a>

            </div>

            <h3 className="font-bold text-gray-900 mb-3">Uzum в соцсетях</h3>
            <div className="flex gap-3">
              
              {/* Instagram */}
              <a href="#" className="block h-10 w-10 overflow-hidden rounded-full bg-gray-100 hover:bg-pink-50 transition-colors">
                <img src="/icons/instagram.png" alt="Instagram" className="h-full w-full object-cover p-1.5" />
              </a>

              {/* Telegram */}
              <a href="#" className="block h-10 w-10 overflow-hidden rounded-full bg-gray-100 hover:bg-blue-50 transition-colors">
                <img src="/icons/telegram.png" alt="Telegram" className="h-full w-full object-cover p-1.5" />
              </a>

              {/* Facebook */}
              <a href="#" className="block h-10 w-10 overflow-hidden rounded-full bg-gray-100 hover:bg-blue-50 transition-colors">
                <img src="/icons/facebook.png" alt="Facebook" className="h-full w-full object-cover p-1.5" />
              </a>

              {/* YouTube */}
              <a href="#" className="block h-10 w-10 overflow-hidden rounded-full bg-gray-100 hover:bg-red-50 transition-colors">
                <img src="/icons/youtube.png" alt="YouTube" className="h-full w-full object-cover p-1.5" />
              </a>

            </div>
          </div>

        </div>

        {/* НИЖНЯЯ ПОЛОСА */}
        <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
            <a href="#" className="hover:text-gray-600 transition-colors">Соглашение о конфиденциальности</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Пользовательское соглашение</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Положение по обработке персональных данных</a>
          </div>
          <div className="text-center md:text-right">
            ©2026 ООО «UZUM MARKET». ИНН 309376127. Все права защищены
          </div>
        </div>
      </div>

      {/* КНОПКА НАВЕРХ */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 bg-[#7000FF] text-white p-3 rounded-full shadow-lg hover:bg-[#5a00cc] transition-all hover:scale-110 z-50"
        aria-label="Наверх"
      >
        ↑
      </button>

    </footer>
  );
}