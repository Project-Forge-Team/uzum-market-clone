import CategoryNav from "./CategoryNav";
import HeroBanner from "./HeroBanner";
import RecommendedSection from "./RecommendedSection";
import SpecialOffersSection from "./SpecialOffersSection";
import { fetchProducts, fetchCategories } from "@/lib/api";
import type { Product } from "@/types/product";

function pickDiscounted(products: Product[], limit = 5): Product[] {
  return products
    .filter((p) => p.old_price && Number(p.old_price) > Number(p.price))
    .sort((a, b) => {
      const da =
        ((Number(a.old_price) - Number(a.price)) / Number(a.old_price)) * 100;
      const db =
        ((Number(b.old_price) - Number(b.price)) / Number(b.old_price)) * 100;
      return db - da;
    })
    .slice(0, limit);
}

/** Server Component: один запрос products + один categories на всю главную */
export default async function MainPage() {
  const [productsData, categoriesData] = await Promise.all([
    fetchProducts({ page: 1, page_size: 20, ordering: "-rating" }),
    fetchCategories(),
  ]);

  const products = productsData.results || [];
  const categories = categoriesData.results || [];
  const offers = pickDiscounted(products, 5);

  return (
    <>
      <CategoryNav categories={categories} />
      <HeroBanner />
      <RecommendedSection
        initialProducts={products}
        initialHasMore={!!productsData.next}
      />
      <SpecialOffersSection offers={offers} />
    </>
  );
}
