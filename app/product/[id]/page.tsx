import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ChevronRight,
  Eye,
  Package,
  PencilLine,
  Store,
} from "lucide-react";
import ProductGallery from "@/components/ProductGallery";
import BuyPanel from "@/components/product/BuyPanel";
import ReviewsSection from "@/components/product/ReviewsSection";
import ViewBeacon from "@/components/product/ViewBeacon";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  getProductByIdOrSlug,
  getCurrentUser,
  listReviews,
  publicUser,
  relatedProducts,
} from "@/lib/api-server";
import { formatNumber } from "@/lib/format";
import { productsWord } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductByIdOrSlug(id);
  if (!product) return { title: "Товар не найден" };
  return {
    title: `${product.title}`,
    description: product.description.slice(0, 160),
  };
}

/**
 * Карточка товара. Собрана на сервере (SEO + быстрый первый экран),
 * интерактив вынесен в клиентские компоненты: покупка, отзывы, зум.
 */
export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const userRow = await getCurrentUser();
  const user = userRow ? publicUser(userRow) : null;

  // includeHidden по умолчанию: черновик/снятый товар вернётся только его
  // владельцу (бэкенд сверяет куку сессии) — остальные получают 404.
  const product = await getProductByIdOrSlug(id, user?.id ?? null);
  if (!product) notFound();

  const [
    {
      results: reviews,
      summary,
      can_review: canReview,
      purchases,
    },
    related,
  ] = await Promise.all([listReviews(product.id, user?.id ?? null), relatedProducts(product, 10)]);
  const isOwner = !!user && product.seller?.owner_id === user.id;

  const characteristics = Object.entries(product.characteristics ?? {});

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <ViewBeacon productId={product.id} />

      {product.status !== "active" && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[#FFF4E5] px-4 py-3 text-[13.5px] text-[#9A5B00]">
          <PencilLine size={16} className="shrink-0" />
          <span>
            Это {product.status === "draft" ? "черновик" : "товар, снятый с продажи"}: его
            нет в каталоге и поиске, ссылку видите только вы.
          </span>
          <Link
            href={`/cabinet/products/${product.id}`}
            className="ml-auto rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Открыть в кабинете
          </Link>
        </div>
      )}

      <nav
        aria-label="Хлебные крошки"
        className="no-scrollbar mb-4 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-[13px] text-muted"
      >
        <Link href="/" className="transition-colors hover:text-brand">
          Главная
        </Link>
        <ChevronRight size={13} className="text-gray-300" />
        {product.category && (
          <>
            <Link
              href={`/catalog/${product.category.slug}`}
              className="transition-colors hover:text-brand"
            >
              {product.category.name}
            </Link>
            <ChevronRight size={13} className="text-gray-300" />
          </>
        )}
        <span className="max-w-[46ch] truncate text-gray-700">{product.title}</span>
        {product.status !== "active" && (
          <span className="ml-2 rounded-md bg-[#FFF4E5] px-2 py-0.5 text-[11px] font-bold text-[#9A5B00]">
            {product.status === "draft" ? "черновик" : "архив"}
          </span>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <ProductGallery images={product.images} title={product.title} />
        <BuyPanel product={product} />
      </div>

      {isOwner && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-brand-border bg-brand-soft/50 p-4">
          <p className="text-[13px] font-medium text-brand">
            Это ваш товар — вы видите карточку так же, как покупатель. Статус:{" "}
            {product.status}.
          </p>
          <Link
            href={`/cabinet/products/${product.id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
          >
            <PencilLine size={15} /> Редактировать в кабинете
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {characteristics.length > 0 && (
            <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <h2 className="text-[17px] font-bold text-ink">Характеристики</h2>
              <dl className="mt-3 divide-y divide-line text-[14px]">
                {characteristics.map(([key, value]) => (
                  <div key={key} className="flex flex-wrap gap-2 py-2">
                    <dt className="min-w-[160px] flex-1 text-muted">{key}</dt>
                    <dd className="font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <h2 className="text-[17px] font-bold text-ink">Описание</h2>
            <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-gray-700">
              {product.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-[12.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Eye size={14} /> {formatNumber(product.views)} просмотров
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package size={14} /> {productsWord(product.stock)} на складе
              </span>
              <span>Обновлено {new Date(product.updated_at).toLocaleDateString("ru-RU")}</span>
            </div>
          </section>
        </div>

        {product.seller && (
          <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-line">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted">
              Продавец
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-[15px] font-bold text-brand">
                {product.seller.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink">
                  {product.seller.name}
                </p>
                <p className="text-[12.5px] text-muted">
                  {product.seller.rating > 0
                    ? `${product.seller.rating.toFixed(1)} ★`
                    : "новый магазин"}{" "}
                  · {product.seller.city}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <Stat label="товаров" value={product.seller.product_count} />
              <Stat label="отзывов" value={product.seller.reviews_count} />
            </div>
            <Link
              href={`/shop/${product.seller.slug}`}
              className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark"
            >
              <Store size={16} /> В магазин
            </Link>
            <p className="mt-2.5 text-[11.5px] leading-snug text-muted">
              {product.seller.verified
                ? "Магазин прошёл проверку документов (в демо — всегда «проверен»)."
                : "Магазин без верификации: в учебном проекте статус «новый»."}
            </p>
          </aside>
        )}
      </div>

      <ReviewsSection
        productId={product.id}
        initialReviews={reviews}
        initialSummary={summary}
        user={user}
        canReply={isOwner}
        shopName={product.seller?.name}
        initialCanReview={canReview}
        initialPurchases={purchases}
      />

      {related.length > 0 && (
        <section className="mt-12">
          <SectionHeader
            title="Похожие товары"
            subtitle={
              product.category
                ? `Категория «${product.category.name}» и товары этого продавца`
                : undefined
            }
            href={product.category ? `/catalog/${product.category.slug}` : "/catalog"}
            linkLabel="В категорию"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface/70 py-2">
      <p className="text-[15px] font-bold text-ink">{value}</p>
      <p className="text-[11.5px] text-muted">{label}</p>
    </div>
  );
}
