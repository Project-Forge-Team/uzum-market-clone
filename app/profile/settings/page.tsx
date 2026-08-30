import SettingsForm from "@/components/profile/SettingsForm";
import { getCurrentUser, publicUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const userRow = await getCurrentUser();
  if (!userRow) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-ink">Настройки аккаунта</h2>
      <SettingsForm user={publicUser(userRow)} />
    </div>
  );
}
