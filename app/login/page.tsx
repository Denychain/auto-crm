import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./_components/LoginForm";

export const metadata = { title: "Вхід · АвтоCRM" };

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">АвтоCRM</h1>
          <p className="mt-1 text-sm text-gray-500">nice.car.if — вхід у систему</p>
        </div>

        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
