import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SetupForm from "./SetupForm";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const adminCount = await prisma.adminUser.count();
  const needsSetup = adminCount === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">
          Threads Hub
        </h1>
        <p className="mb-8 text-center text-sm text-slate-500">
          스레드 다중 계정 · 쿠팡파트너스 자동화
        </p>
        {needsSetup ? <SetupForm /> : <LoginForm />}
      </div>
    </div>
  );
}
