import { LoginForm } from "@/components/login-form";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 rounded-2xl border border-zinc-100 bg-white p-10 shadow-lg">
        <LoginForm />
      </main>
    </div>
  );
}
