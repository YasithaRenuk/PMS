import { LoginForm } from "@/components/login-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getServerAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getServerAuthSession();

  return (
    <div className="flex items-center justify-center px-4 py-10">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 rounded-2xl border border-zinc-100 bg-white p-10 shadow-lg">
        {session?.user ? (
          <div className="flex w-full flex-col gap-4 text-left">
            <div>
              <p className="text-sm font-semibold text-zinc-500">
                Authenticated
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">
                Welcome back, {session.user.username}
              </h1>
              <p className="text-sm text-zinc-600">
                Role: <span className="font-semibold">{session.user.role}</span>
                {session.user.branchName
                  ? ` • Branch: ${session.user.branchName} (#${session.user.branchId})`
                  : session.user.branchId
                    ? ` • Branch ID: ${session.user.branchId}`
                    : " • No branch assigned"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SignOutButton />
            </div>
          </div>
        ) : (
          <LoginForm />
        )}
      </main>
    </div>
  );
}
