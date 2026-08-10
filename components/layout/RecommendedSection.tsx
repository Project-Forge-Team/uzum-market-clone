import ProductCard from '../ui/ProductCard';
import { mockProducts } from '@/data/mockProducts';

export default function RecommendedSection() {
    // В будущем здесь будет fetch данных или использование SWR/React Query
    const products = mockProducts;

    return (
        <section className="w-full max-w-[1240px] mx-auto px-4 mt-10">
            <h2 className="text-2xl font-bold mb-6">Рекомендуем</h2>

            {/* Сетка товаров */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
            {/* КНОПКА "ПОКАЗАТЬ ЕЩЁ" */}
            <button className="w-full bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-800 font-medium py-4 rounded-xl transition-colors duration-200 mt-[60px] mb-[53px]">
                Показать ещё 10
            </button>
        </section>
    );
}