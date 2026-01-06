import { LoginForm } from "@/components/login-form";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 rounded-2xl p-10 ">
        <LoginForm />
      </main>
    </div>
  );
}
