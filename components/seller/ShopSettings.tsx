"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Store } from "lucide-react";
import { updateShop } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function ShopSettings({
  shop,
}: {
  shop: { name: string; city: string; description: string; slug: string } | null;
}) {
  const router = useRouter();
  const { showToast } = useCart();
  const [form, setForm] = useState({
    name: shop?.name ?? "",
    city: shop?.city ?? "Ташкент",
    description: shop?.description ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateShop(form);
      showToast("Данные магазина сохранены");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить магазин");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-brand";

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
        <Store size={16} className="text-brand" /> Данные магазина
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        {shop
          ? `Публичная страница: /shop/${shop.slug}`
          : "Создайте магазин — название будет видно покупателям в карточках товаров."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12.5px] font-semibold text-muted">Название</span>
          <input
            className={field}
            value={form.name}
            maxLength={60}
            placeholder="Мастерская Audio"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[12.5px] font-semibold text-muted">Город</span>
          <input
            className={field}
            value={form.city}
            maxLength={40}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="text-[12.5px] font-semibold text-muted">Описание</span>
        <textarea
          className={`${field} resize-y`}
          rows={4}
          maxLength={600}
          placeholder="Что продаёте, как быстро отправляете, условия обмена"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <span className="mt-1 block text-[11.5px] text-muted">{form.description.length}/600</span>
      </label>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={busy || form.name.trim().length < 3}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
        {shop ? "Сохранить" : "Создать магазин"}
      </button>
    </section>
  );
}
