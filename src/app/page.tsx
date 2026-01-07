import { LoginForm } from "@/components/login-form";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
