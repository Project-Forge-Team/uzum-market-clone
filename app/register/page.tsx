import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-2xl text-center shadow-sm bg-white">
      <h1 className="text-2xl font-bold mb-4">Регистрация</h1>
      <p className="text-gray-500 mb-6">Страница в разработке...</p>
      
      <Link 
        href="/login" 
        className="text-[#7000FF] hover:underline text-sm font-medium"
      >
        Уже есть аккаунт? Войти
      </Link>
    </div>
  );
}