import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Role } from "@/app/generated/prisma/enums";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/login");
    }

    // Basic styling for the dashboard
    return (
        <div className="min-h-screen bg-zinc-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col fixed inset-y-0">
                <div className="h-16 flex items-center px-6 border-b border-zinc-100">
                    <span className="text-lg font-bold text-zinc-900">PMS Admin</span>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-1">
                    {session.user.role === Role.superAdmin && (
                        <>
                            <Link
                                href="/dashboard/onboard-branches"
                                className="flex items-center px-3 py-2 text-sm font-medium text-zinc-600 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            >
                                Onboard Branches
                            </Link>
                            <Link
                                href="/dashboard/branch-admins"
                                className="flex items-center px-3 py-2 text-sm font-medium text-zinc-600 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            >
                                Branch Admins
                            </Link>
                        </>
                    )}
                    {/* Add other links for regular admins if needed later */}
                </nav>

                <div className="p-4 border-t border-zinc-100">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600">
                            {session.user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">
                                {session.user.username}
                            </p>
                            <p className="text-xs text-zinc-500 truncate capitalize">
                                {session.user.role}
                            </p>
                        </div>
                    </div>
                    <SignOutButton />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
