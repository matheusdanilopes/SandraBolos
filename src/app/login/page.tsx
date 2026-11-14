import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · Sandra Bolos" };

export default async function LoginPage(props: { searchParams: Promise<{ de?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-6 text-center">
          <div className="text-4xl">🎂</div>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Sandra Bolos</h1>
          <p className="text-sm text-gray-500">Entre para acessar o sistema</p>
        </div>
        <LoginForm de={searchParams.de} />
      </div>
    </div>
  );
}
