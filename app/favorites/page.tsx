import type { Metadata } from "next";
import FavoritesView from "@/components/favorites/FavoritesView";

export const metadata: Metadata = { title: "Избранное" };
export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return <FavoritesView />;
}
