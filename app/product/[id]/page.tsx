import { notFound } from "next/navigation";
import { mockProducts } from "@/data/mockProducts";
import ProductGallery from "@/components/ProductGallery";
import Link from "next/link";
import {
  Star,
  Truck,
  ShieldCheck,
  Store,
  ChevronRight,
  Heart,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";

interface ProductPageProps {
  params: { id: string };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = mockProducts.find((p) => p.id === Number(id));

  if (!product) {
    notFound();
  }

  // Похожие товары (для примера возьмём товары той же категории или просто первые 4)
  const relatedProducts = mockProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const discountPercent = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-[#7000FF] transition-colors">
          Главная
        </Link>
        <ChevronRight size={14} />
        {product.category && (
          <>
            <a
              href={`/catalog/${product.category.toLowerCase()}`}
              className="hover:text-[#7000FF] transition-colors"
            >
              {product.category}
            </a>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-gray-700 truncate">{product.title}</span>
      </nav>

      {/* Основная секция */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Галерея */}
        <ProductGallery
          images={product.images || [product.image]}
          title={product.title}
        />

        {/* Информация о товаре */}
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
            {product.title}
          </h1>

          {/* Рейтинг и отзывы */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              <Star size={18} className="fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.rating}</span>
            </div>
            <a
              href="#reviews"
              className="text-[#7000FF] hover:underline text-sm"
            >
              {product.reviewsCount} отзывов
            </a>
          </div>

          {/* Цена */}
          <div className="mt-5 flex items-end gap-3 flex-wrap">
            <span className="text-3xl md:text-4xl font-bold text-gray-900">
              {product.price.toLocaleString()} сум
            </span>
            {product.oldPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {product.oldPrice.toLocaleString()} сум
                </span>
                <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-lg">
                  -{discountPercent}%
                </span>
              </>
            )}
          </div>

          {/* Рассрочка */}
          {product.monthlyPayment && (
            <div className="mt-3 inline-flex items-center gap-2 bg-[#F0F0FF] text-[#7000FF] text-sm font-medium px-4 py-2 rounded-xl w-fit">
              <ShieldCheck size={16} />
              от {product.monthlyPayment.toLocaleString()} сум/мес
            </div>
          )}

          {/* Кнопки */}
          <div className="mt-6 space-y-3">
            <button className="w-full bg-[#7000FF] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#5a00cc] transition-colors flex items-center justify-center gap-2">
              <ShoppingCart size={20} />
              Добавить в корзину
            </button>
            <button className="w-full bg-white border-2 border-[#7000FF] text-[#7000FF] py-4 rounded-xl font-semibold text-lg hover:bg-[#F0F0FF] transition-colors">
              Купить сейчас
            </button>
          </div>

          {/* Доставка */}
          <div className="mt-5 flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
            <Truck size={22} className="text-gray-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Доставка</p>
              <p className="text-gray-600">{product.deliveryTime}</p>
            </div>
          </div>

          {/* Продавец */}
          {product.seller && (
            <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <Store size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {product.seller.name}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star
                      size={14}
                      className="fill-yellow-400 text-yellow-400"
                    />
                    {product.seller.rating} · {product.seller.reviewsCount}{" "}
                    отзывов
                  </div>
                </div>
              </div>
              <button className="text-[#7000FF] hover:bg-[#F0F0FF] px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                В магазин
              </button>
            </div>
          )}

          {/* Кнопка избранного */}
          <button className="mt-3 flex items-center gap-2 text-gray-500 hover:text-[#7000FF] transition-colors">
            <Heart size={18} />В избранное
          </button>
        </div>
      </div>

      {/* Характеристики */}
      {product.characteristics && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
            Характеристики
          </h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(product.characteristics).map(
                  ([key, value], index) => (
                    <tr
                      key={key}
                      className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="px-4 py-3 text-gray-500 w-1/3">{key}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {value}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Описание */}
      {product.description && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
            Описание
          </h2>
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
        </section>
      )}

      {/* Отзывы */}
      <section id="reviews" className="mt-12">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
          Отзывы ({product.reviewsCount})
        </h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Здесь пока нет отзывов.</p>
            <button className="mt-4 bg-[#7000FF] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#5a00cc] transition-colors">
              Написать отзыв
            </button>
          </div>
        </div>
      </section>

      {/* Похожие товары */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
            Похожие товары
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((item) => (
              <a
                key={item.id}
                href={`/product/${item.id}`}
                className="group bg-white border border-gray-200 rounded-2xl p-3 hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-square mb-3">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <p className="text-sm text-gray-900 line-clamp-2 font-medium group-hover:text-[#7000FF] transition-colors">
                  {item.title}
                </p>
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-gray-700">{item.rating}</span>
                </div>
                <p className="mt-1 font-semibold text-gray-900">
                  {item.price.toLocaleString()} сум
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
