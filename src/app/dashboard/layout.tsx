import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Role } from "@/app/generated/prisma/enums";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <SidebarTrigger />
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </SidebarProvider>
  );
}
