import SettingsForm from "@/components/profile/SettingsForm";
import { getCurrentUser } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout уже редиректит на /login

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-ink">Настройки аккаунта</h2>
      <SettingsForm user={user} />
    </div>
  );
}
