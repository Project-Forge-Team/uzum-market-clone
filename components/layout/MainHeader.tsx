"use client";

import { useState } from 'react';
import { Menu, X, Sofa, Tent, Monitor, WashingMachine, Shirt, Footprints, Baby, HeartPulse, Smartphone, BookOpen, Car, Dumbbell } from 'lucide-react';

export default function MainHeader() {
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);

    return (
        <>
            <header className="bg-white shadow-md relative z-20">
                <div className="w-full max-w-[1240px] mx-auto px-4 flex flex-col items-center gap-4 py-[18px] md:flex-row md:items-center md:justify-between">

                    {/* Логотип */}
                    <a href="/" className="flex items-center shrink-0">
                        <img src="/headLogo.png" alt="Uzum Market" className="h-[24px] w-auto" />
                    </a>

                    {/* Кнопка Каталог */}
                    <button
                        onClick={() => setIsCatalogOpen(true)}
                        className="flex items-center gap-[11px] bg-[#F0F0FF] text-[#7000FF] p-[15px] rounded-[8px] font-medium hover:bg-[#D8D4FF] transition-colors duration-200 shrink-0 w-fit"
                    >
                        <Menu size={20} />
                        <span>Каталог</span>
                    </button>

                    {/* Поле поиска */}
                    <div className="flex max-w-[486px] min-w-0 mx-4">
                        <input type="text" placeholder="Искать товары и категории" className="w-full h-[48px] pl-[15px] pr-4 rounded-l-[4px] border border-r-0 border-gray-200 focus:outline-none focus:border-[#7000FF] transition-colors" />
                        <button className="h-[48px] px-[24px] bg-[rgba(54,55,64,0.2)] rounded-r-[4px] border border-l-0 border-gray-200 hover:bg-[rgba(54,55,64,0.3)] transition-colors shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                    </div>

                    {/* Правая часть */}
                    <div className="flex items-center gap-[16px] shrink-0">
                        <a href="#" className="flex items-center gap-[9px] text-gray-700 hover:text-[#7000FF] transition-colors cursor-pointer">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span className="font-medium hidden sm:block">Shahzod</span>
                        </a>
                        <a href="#" className="flex items-center gap-[9px] text-gray-700 hover:text-[#7000FF] transition-colors cursor-pointer">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            <span className="font-medium hidden sm:block">Избранное</span>
                        </a>
                        <a href="#" className="flex items-center gap-[9px] text-gray-700 hover:text-[#7000FF] transition-colors cursor-pointer">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                            <span className="font-medium hidden sm:block">Корзина</span>
                        </a>
                    </div>
                </div>
            </header>

            {/* МОДАЛЬНОЕ ОКНО КАТАЛОГА */}
            {isCatalogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[80px] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsCatalogOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-[1240px] rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsCatalogOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>

                        <h2 className="text-xl font-bold mb-6 text-gray-900">Каталог товаров</h2>

                        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <li className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                                <Sofa size={24} className="text-gray-400 group-hover:text-[#7000FF] transition-colors" />
                                <span className="font-medium">Мебель</span>
                            </li>
                            <li className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                                <Tent size={24} className="text-gray-400 group-hover:text-[#7000FF] transition-colors" />
                                <span className="font-medium">Туризм, рыбалка и охота</span>
                            </li>
                            <li className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                                <Monitor size={24} className="text-gray-400 group-hover:text-[#7000FF] transition-colors" />
                                <span className="font-medium">Электроника</span>
                            </li>
                            <li className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                                <WashingMachine size={24} className="text-gray-400 group-hover:text-[#7000FF] transition-colors" />
                                <span className="font-medium">Бытовая техника</span>
                            </li>
                            <li className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-[#F0F0FF] hover:text-[#7000FF] transition-colors cursor-pointer group">
                                <Shirt size={24} className="text-gray-400 group-hover:text-[#7000FF] transition-colors" />
                                <span className="font-medium">Одежда</span>
                            </li>

                        </ul>
                    </div>
                </div>
            )}
        </>
    );
}