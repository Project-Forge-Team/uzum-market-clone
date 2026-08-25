import { authService } from "@/lib/auth-service";
// Было: import LogoutButton from "@/components/LogoutButton";
// Стало:
import LogoutButton from "@/components/ui/LogoutButton";

// ... остальной код страницы profile остается без изменений

// В Next.js App Router страницы по умолчанию Server Components.
// Но нам нужно проверить куки. В реальном проекте лучше читать cookies() из next/headers,
// но для мока мы просто покажем статический успех, так как Middleware уже пропустил нас.
export default function ProfilePage() {
    return (
        <div className="max-w-4xl mx-auto mt-10 p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Личный кабинет</h1>
                <LogoutButton />
            </div>

            <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex items-start gap-4">
                <div>
                    <h2 className="text-lg font-bold text-green-800">Доступ разрешен</h2>
                    <p className="text-green-700 mt-1">
                        Вы находитесь на защищенной странице. Middleware проверил наличие токена <code className="bg-green-100 px-1 rounded">uzum_access_token</code> и пропустил вас.
                    </p>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border p-4 rounded-xl hover:border-[#7000FF] transition-colors cursor-pointer">
                    <h3 className="font-bold">Мои заказы</h3>
                    <p className="text-sm text-gray-500">История покупок</p>
                </div>
                <div className="border p-4 rounded-xl hover:border-[#7000FF] transition-colors cursor-pointer">
                    <h3 className="font-bold">Избранное</h3>
                    <p className="text-sm text-gray-500">Сохраненные товары</p>
                </div>
            </div>
        </div>
    );
}