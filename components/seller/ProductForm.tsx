"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Store,
  Trash2,
  X,
} from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import {
  createProduct,
  createShop,
  deleteProduct,
  updateProduct,
  uploadImage,
} from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { formatNumber } from "@/lib/format";
import type { Category, Product } from "@/types/product";

interface SpecRow {
  key: string;
  value: string;
}

interface DraftState {
  title: string;
  description: string;
  price: string;
  old_price: string;
  stock: string;
  category_id: string;
  delivery_time: string;
  brand: string;
  images: string[];
  specs: SpecRow[];
  status: "active" | "draft" | "archived";
  is_ad: boolean;
}

const DELIVERY_OPTIONS = ["Завтра", "Послезавтра", "2 дня", "3 дня", "5 дней"];

function fromProduct(product: Product, categories: Category[]): DraftState {
  return {
    title: product.title,
    description: product.description,
    price: String(product.price),
    old_price: product.old_price ? String(product.old_price) : "",
    stock: String(product.stock),
    category_id: String(product.category?.id ?? categories[0]?.id ?? ""),
    delivery_time: product.delivery_time || "Завтра",
    brand: product.brand ?? "",
    images: product.images?.length ? product.images : [product.image],
    specs: Object.entries(product.characteristics ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
    status: product.status,
    is_ad: product.is_ad,
  };
}

function emptyDraft(categories: Category[]): DraftState {
  return {
    title: "",
    description: "",
    price: "",
    old_price: "",
    stock: "10",
    category_id: String(categories[0]?.id ?? ""),
    delivery_time: "Завтра",
    brand: "",
    images: [],
    specs: [{ key: "", value: "" }],
    status: "active",
    is_ad: false,
  };
}

/**
 * Форма публикации/редактирования товара продавца: фото (загрузка или ссылка),
 * цена со скидкой, характеристики, статус публикации и живой предпросмотр карточки.
 */
export default function ProductForm({
  categories,
  product,
  shopName,
  shopId,
}: {
  categories: Category[];
  product?: Product | null;
  shopName: string | null;
  shopId: number | null;
}) {
  const router = useRouter();
  const { showToast } = useCart();
  const { refresh } = useSession();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<DraftState>(
    () => (product ? fromProduct(product, categories) : emptyDraft(categories)),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageInput, setImageInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [shopNameDraft, setShopNameDraft] = useState("");

  const editing = !!product;

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const previewProduct = useMemo<Product>(() => {
    const price = Number(draft.price || 0);
    const oldPrice = Number(draft.old_price || 0);
    const categoryId = Number(draft.category_id);
    const category = categories.find((c) => c.id === categoryId) ?? null;
    return {
      id: product?.id ?? 0,
      slug: "preview",
      title: draft.title || "Название товара появится здесь",
      description: draft.description,
      price,
      old_price: oldPrice > price ? oldPrice : null,
      discount_percent:
        oldPrice > price && oldPrice > 0
          ? Math.round(((oldPrice - price) / oldPrice) * 100)
          : 0,
      monthly_payment: price > 0 ? { months: 12, per_month: Math.ceil(price / 12), overpay: 0 } : null,
      rating: product?.rating ?? 0,
      reviews_count: product?.reviews_count ?? 0,
      delivery_time: draft.delivery_time,
      stock: Number(draft.stock || 0),
      in_stock: Number(draft.stock || 0) > 0,
      brand: draft.brand,
      image: draft.images[0] ?? "/products/placeholder.svg",
      images: draft.images,
      characteristics: {},
      is_ad: draft.is_ad,
      views: product?.views ?? 0,
      status: draft.status,
      created_at: product?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: null,
      category: category
        ? { id: category.id, name: category.name, slug: category.slug, emoji: category.emoji }
        : null,
    };
  }, [draft, categories, product]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (draft.title.trim().length < 8) next.title = "Минимум 8 символов — пишите как в объявлении";
    if (draft.description.trim().length < 20)
      next.description = "Опишите товар подробнее: 20+ символов";
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0) next.price = "Укажите цену в сумах";
    const old = Number(draft.old_price || 0);
    if (draft.old_price && (!(old > price) || !Number.isFinite(old)))
      next.old_price = "Старая цена должна быть выше текущей";
    const stock = Number(draft.stock);
    if (!Number.isFinite(stock) || stock < 0) next.stock = "Сколько штук на складе?";
    if (!draft.category_id) next.category_id = "Выберите категорию";
    if (draft.images.length === 0) next.images = "Добавьте хотя бы одно фото";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    setServerError(null);
    if (!validate()) {
      setServerError("Проверьте подсвеченные поля");
      return;
    }
    setBusy(true);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: Math.round(Number(draft.price)),
      old_price: draft.old_price ? Math.round(Number(draft.old_price)) : null,
      stock: Math.round(Number(draft.stock)),
      category_id: Number(draft.category_id),
      delivery_time: draft.delivery_time,
      brand: draft.brand.trim(),
      images: draft.images,
      characteristics: Object.fromEntries(
        draft.specs
          .map((row) => [row.key.trim(), row.value.trim()] as const)
          .filter(([key, value]) => key && value),
      ),
      status: draft.status,
      is_ad: draft.is_ad,
    };

    try {
      if (editing && product) {
        await updateProduct(product.id, payload);
        showToast("Товар обновлён");
      } else {
        await createProduct(payload);
        showToast("Товар опубликован");
      }
      router.push("/cabinet/products");
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Сервер не принял товар. Проверьте, что у аккаунта есть магазин.",
      );
      setBusy(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setServerError(null);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        const result = await uploadImage(file);
        added.push(result.url);
      }
      set("images", [...draft.images, ...added].slice(0, 8));
      showToast(added.length ? `Загружено фото: ${added.length}` : "Файл не подошёл");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) =>
    set(
      "images",
      draft.images.filter((_, i) => i !== index),
    );

  const moveImage = (index: number, direction: number) => {
    const next = [...draft.images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set("images", next);
  };

  const field =
    "mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-brand";
  const labelCls = "block text-[12.5px] font-semibold text-muted";

  return (
    <div className="space-y-5">
      {!shopId ? (
        <section className="rounded-2xl bg-ink p-6 text-white">
          <Store size={22} className="text-accent" />
          <h2 className="mt-3 text-lg font-bold">Сначала создадим магазин</h2>
          <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-white/70">
            На учебном маркетплейсе магазин есть у каждого аккаунта. Осталось дать ему
            название — оно будет вид покупателям в карточках товара.
          </p>
          <CreateShopInline
            value={shopNameDraft}
            onChange={setShopNameDraft}
            onCreated={async () => {
              await refresh();
              router.refresh();
            }}
          />
        </section>
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href="/cabinet/products"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted transition-colors hover:text-brand"
              >
                <ArrowLeft size={14} /> К списку товаров
              </Link>
              <h1 className="mt-1.5 text-xl font-bold text-ink">
                {editing ? "Редактирование товара" : "Новый товар"}
              </h1>
              <p className="text-[13px] text-muted">
                Магазин: {shopName} · товар увидят в каталоге сразу после публикации
              </p>
            </div>
            {editing && product && (
              <Link
                href={`/product/${product.id}`}
                className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
              >
                Открыть карточку
              </Link>
            )}
          </header>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <h2 className="text-[15px] font-bold text-ink">Основное</h2>

                <label className="mt-3 block">
                  <span className={labelCls}>Название товара</span>
                  <input
                    className={`${field} ${errors.title ? "border-red-400" : ""}`}
                    value={draft.title}
                    maxLength={120}
                    placeholder="Беспроводные наушники AudioLite с шумоподавлением"
                    onChange={(event) => set("title", event.target.value)}
                  />
                  <FieldError message={errors.title} hint={`${draft.title.length}/120 символов`} />
                </label>

                <label className="mt-3 block">
                  <span className={labelCls}>Описание</span>
                  <textarea
                    className={`${field} resize-y ${errors.description ? "border-red-400" : ""}`}
                    rows={6}
                    maxLength={4000}
                    placeholder="Для кого товар, что в комплекте, чем он лучше аналогов, условия гарантии…"
                    value={draft.description}
                    onChange={(event) => set("description", event.target.value)}
                  />
                  <FieldError
                    message={errors.description}
                    hint={`${draft.description.length}/4000 символов`}
                  />
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className={labelCls}>Цена, сум</span>
                    <input
                      className={`${field} ${errors.price ? "border-red-400" : ""}`}
                      inputMode="numeric"
                      value={draft.price}
                      onChange={(event) =>
                        set("price", event.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="189000"
                    />
                    <FieldError message={errors.price} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Цена до скидки</span>
                    <input
                      className={`${field} ${errors.old_price ? "border-red-400" : ""}`}
                      inputMode="numeric"
                      value={draft.old_price}
                      onChange={(event) =>
                        set("old_price", event.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="необязательно"
                    />
                    <FieldError message={errors.old_price} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>На складе, шт</span>
                    <input
                      className={`${field} ${errors.stock ? "border-red-400" : ""}`}
                      inputMode="numeric"
                      value={draft.stock}
                      onChange={(event) =>
                        set("stock", event.target.value.replace(/[^\d]/g, ""))
                      }
                    />
                    <FieldError message={errors.stock} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Категория</span>
                    <select
                      className={`${field} bg-white ${errors.category_id ? "border-red-400" : ""}`}
                      value={draft.category_id}
                      onChange={(event) => set("category_id", event.target.value)}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>Срок доставки</span>
                    <select
                      className={`${field} bg-white`}
                      value={draft.delivery_time}
                      onChange={(event) => set("delivery_time", event.target.value)}
                    >
                      {DELIVERY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Бренд</span>
                    <input
                      className={field}
                      value={draft.brand}
                      maxLength={40}
                      placeholder="Например, AudioLite"
                      onChange={(event) => set("brand", event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] font-bold text-ink">
                    Фотографии{" "}
                    <span className="font-medium text-muted">
                      ({draft.images.length}/8)
                    </span>
                  </h2>
                  <span className="text-[12px] text-muted">
                    первое фото — обложка карточки
                  </span>
                </div>

                {draft.images.length > 0 && (
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {draft.images.map((src, index) => (
                      <li
                        key={`${src}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-line"
                      >
                        <ProductImage src={src} alt={`Фото ${index + 1}`} sizes="160px" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white/90 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            className="grid h-6 w-6 place-items-center rounded text-gray-600 hover:text-brand disabled:opacity-30"
                            aria-label="Сдвинуть влево"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase text-muted">
                            <GripVertical size={11} /> {index + 1}
                          </span>
                          <span className="flex">
                            <button
                              type="button"
                              onClick={() => moveImage(index, 1)}
                              disabled={index === draft.images.length - 1}
                              className="grid h-6 w-6 place-items-center rounded text-gray-600 hover:text-brand disabled:opacity-30"
                              aria-label="Сдвинуть вправо"
                            >
                              <ChevronRight size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="grid h-6 w-6 place-items-center rounded text-gray-600 hover:text-red-600"
                              aria-label="Удалить фото"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        </div>
                        {index === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                            обложка
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex gap-2">
                    <input
                      className="h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-brand"
                      placeholder="или вставьте ссылку на картинку /products/…"
                      value={imageInput}
                      onChange={(event) => setImageInput(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const value = imageInput.trim();
                        if (!value) return;
                        set("images", [...draft.images, value].slice(0, 8));
                        setImageInput("");
                      }}
                      className="shrink-0 rounded-xl bg-surface px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-brand-soft hover:text-brand"
                    >
                      Добавить
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-brand-border px-4 text-[13px] font-bold text-brand transition-colors hover:bg-brand-soft disabled:opacity-60"
                  >
                    {uploading ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <ImagePlus size={15} />
                    )}
                    Загрузить PNG/JPG
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void handleUpload(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </div>
                <FieldError message={errors.images} />
              </section>

              <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-ink">Характеристики</h2>
                  <button
                    type="button"
                    onClick={() => set("specs", [...draft.specs, { key: "", value: "" }])}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-3 py-1.5 text-[12.5px] font-bold text-brand transition-colors hover:bg-brand-border"
                  >
                    <Plus size={13} /> Строка
                  </button>
                </div>

                <ul className="mt-3 space-y-2">
                  {draft.specs.map((row, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <input
                        className="h-10 w-[38%] rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-brand"
                        placeholder="Материал"
                        value={row.key}
                        maxLength={40}
                        onChange={(event) => {
                          const specs = [...draft.specs];
                          specs[index] = { ...specs[index], key: event.target.value };
                          set("specs", specs);
                        }}
                      />
                      <input
                        className="h-10 flex-1 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-brand"
                        placeholder="ABS-пластик"
                        value={row.value}
                        maxLength={120}
                        onChange={(event) => {
                          const specs = [...draft.specs];
                          specs[index] = { ...specs[index], value: event.target.value };
                          set("specs", specs);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          set("specs", draft.specs.filter((_, i) => i !== index))
                        }
                        className="grid h-10 w-10 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Удалить строку"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                  {draft.specs.length === 0 && (
                    <li className="rounded-lg bg-surface/70 px-3 py-2.5 text-[13px] text-muted">
                      Заполните 3–6 характеристик: карточки с ними покупают заметно чаще.
                    </li>
                  )}
                </ul>
              </section>

              <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <h2 className="text-[15px] font-bold text-ink">Публикация</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      { value: "active", label: "Опубликовать" },
                      { value: "draft", label: "Сохранить как черновик" },
                      { value: "archived", label: "Снять с продажи" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => set("status", option.value)}
                      className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                        draft.status === option.value
                          ? "bg-ink text-white"
                          : "bg-surface text-gray-700 hover:bg-brand-soft hover:text-brand"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13.5px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={draft.is_ad}
                    onChange={(event) => set("is_ad", event.target.checked)}
                    className="h-4 w-4"
                  />
                  Отметить как рекламный (в демо покажет бейдж «реклама» в карточке)
                </label>
              </section>
            </div>

            {/* Боковик: предпросмотр + действия */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <p className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-muted">
                  Так увидят покупатели
                </p>
                <div className="rounded-xl bg-surface/60 p-2">
                  <PreviewCard product={previewProduct} />
                </div>
              </div>

              {serverError && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] font-medium text-red-600">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {serverError}
                </p>
              )}

              <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {editing ? "Сохранить изменения" : "Опубликовать товар"}
                </button>
                <p className="mt-2 text-[11.5px] leading-snug text-muted">
                  Данные проверяются на сервере: название от 8 символов, описание от 20,
                  цена больше нуля, минимум одно фото.
                </p>
              </div>

              {editing && product && (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-muted">
                    Опасная зона
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Удалить товар вместе с отзывами? Действие необратимо.",
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await deleteProduct(product.id);
                        showToast("Товар удалён");
                        router.push("/cabinet/products");
                        router.refresh();
                      } catch (err) {
                        setBusy(false);
                        setServerError(
                          err instanceof Error ? err.message : "Не удалось удалить товар",
                        );
                      }
                    }}
                    className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={15} /> Удалить товар
                  </button>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function FieldError({ message, hint }: { message?: string; hint?: string }) {
  if (!message && !hint) return null;
  return (
    <p className={`mt-1 text-[12px] ${message ? "font-semibold text-red-600" : "text-muted"}`}>
      {message ?? hint}
    </p>
  );
}

/** Инлайн-создание магазина, если аккаунт зарегистрирован без него. */
function CreateShopInline({
  value,
  onChange,
  onCreated,
}: {
  value: string;
  onChange: (next: string) => void;
  onCreated: () => Promise<void>;
}) {
  const { showToast } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 max-w-md">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Название магазина, например «Мастерская Audio»"
        className="h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-[14px] text-white placeholder:text-white/40 outline-none focus:border-accent"
      />
      {error && <p className="mt-2 text-[12.5px] font-semibold text-[#FFC9C9]">{error}</p>}
      <button
        type="button"
        disabled={busy || value.trim().length < 3}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await createShop(value.trim());
            await onCreated();
            showToast("Магазин создан");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось создать магазин");
            setBusy(false);
          }
        }}
        className="mt-2.5 rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:bg-white disabled:opacity-50"
      >
        {busy ? "Создаём…" : "Создать магазин"}
      </button>
      <p className="mt-2 text-[12px] text-white/50">
        В демо-аккаунте seller@uzum.uz магазин уже создан — можно войти им и публиковать
        товары сразу.
      </p>
    </div>
  );
}

/** Упрощённая карточка для предпросмотра (без корзины, чтобы не путать клики). */
function PreviewCard({ product }: { product: Product }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-surface">
        <ProductImage src={product.image} alt="Предпросмотр" sizes="280px" />
        {product.discount_percent > 0 && (
          <span className="absolute left-2 top-2 rounded-lg bg-brand px-2 py-1 text-[11px] font-bold text-white">
            −{product.discount_percent}%
          </span>
        )}
        {product.is_ad && (
          <span className="absolute bottom-2 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            реклама
          </span>
        )}
      </div>
      <p className="text-[17px] font-bold text-ink">
        {formatNumber(product.price)}{" "}
        <span className="text-[12px] font-semibold text-muted">сум</span>
      </p>
      {product.old_price && (
        <p className="text-[12px] text-gray-400 line-through">
          было {formatNumber(product.old_price)}
        </p>
      )}
      <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-gray-600">
        {product.title}
      </p>
      <p className="mt-1.5 text-[11.5px] text-muted">
        {product.category?.name ?? "без категории"} · доставка {product.delivery_time}
      </p>
    </div>
  );
}
