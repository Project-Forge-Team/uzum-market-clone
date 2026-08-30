import HeroBanner from "@/components/layout/HeroBanner";
import CategoryTiles from "@/components/layout/CategoryTiles";
import RecommendedSection from "@/components/layout/RecommendedSection";
import SpecialOffersSection from "@/components/layout/SpecialOffersSection";
import { SellerPromo, ShopsRow, TrustStrip } from "@/components/layout/HomeExtras";
import {
  listCategories,
  listProducts,
  listSellers,
  marketplaceStats,
} from "@/lib/server/catalog";

/**
 * Главная собирается на сервере одним проходом по локальной «БД»:
 * категории, подборки, скидки и магазины. Клиенту остаётся только
 * догрузка следующих страниц в блоке «Рекомендуем».
 */
export default function MainPage() {
  const categories = listCategories();
  const recommended = listProducts({ page: 1, page_size: 12, ordering: "" });
  const offers = listProducts({ discounted: true, ordering: "discount", page_size: 12 });
  const sellers = listSellers().slice(0, 8);
  const stats = marketplaceStats();

  return (
    <>
      {/* Заголовок первого уровня на главной: виден скринридерам и поисковикам,
          но не мешает визуальному «как у маркетплейса» первому экрану. */}
      <h1 className="sr-only">
        Uzum Market — учебный клон маркетплейса: {stats.products} товаров, скидки и рассрочка
      </h1>
      <HeroBanner quickCategories={categories.slice(0, 8)} />
      <CategoryTiles categories={categories} />
      <SpecialOffersSection offers={offers.results} />
      <RecommendedSection
        initialProducts={recommended.results}
        initialHasMore={recommended.next}
      />
      <ShopsRow sellers={sellers} />
      <SellerPromo stats={stats} />
      <TrustStrip />
    </>
  );
}
