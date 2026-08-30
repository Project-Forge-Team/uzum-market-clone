import HeroBanner from "@/components/layout/HeroBanner";
import CategoryTiles from "@/components/layout/CategoryTiles";
import RecommendedSection from "@/components/layout/RecommendedSection";
import SpecialOffersSection from "@/components/layout/SpecialOffersSection";
import {
  SellerPromo,
  ShopsRow,
  TrustStrip,
} from "@/components/layout/HomeExtras";
import {
  listCategories,
  listProducts,
  listSellers,
  marketplaceStats,
} from "@/lib/api-server";

/**
 * Главная собирается на сервере одним запросом к бэкенду:
 * категории, подборки, скидки и магазины. Клиенту остаётся только
 * догрузка следующих страниц в блоке «Рекомендуем».
 */
export default async function MainPage() {
  const [categories, recommended, offers, sellers, stats] = await Promise.all([
    listCategories(),
    listProducts({ page: 1, page_size: 12, ordering: "" }),
    listProducts({ discounted: true, ordering: "discount", page_size: 12 }),
    listSellers(),
    marketplaceStats(),
  ]);
  const topSellers = sellers.slice(0, 8);

  return (
    <>
      {/* Заголовок первого уровня на главной: виден скринридерам и поисковикам,
          но не мешает визуальному «как у маркетплейса» первому экрану. */}
      <h1 className="sr-only">
        Uzum Market — каталог товаров, скидки и рассрочка
      </h1>
      <HeroBanner quickCategories={categories.slice(0, 8)} />
      <CategoryTiles categories={categories} />
      <SpecialOffersSection offers={offers.results} />
      <RecommendedSection
        initialProducts={recommended.results}
        initialHasMore={recommended.next}
      />
      <ShopsRow sellers={topSellers} />
      <SellerPromo stats={stats} />
      <TrustStrip />
    </>
  );
}
