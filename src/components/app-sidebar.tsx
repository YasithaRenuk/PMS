"use client";

import { Clipboard, GitBranch, Globe, LibraryBig, LogOut, Settings, ShieldUser, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Role } from "@/app/generated/prisma/enums";
import { SignOutButton } from "./sign-out-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const admin_Items = [
  {
    title: "Courses",
    url: "/dashboard/courses",
    icon: LibraryBig,
  },
  {
    title: "Students",
    url: "/dashboard/students",
    icon: User,
  },
];

const superAdmin_Items = [
  ...admin_Items,
  {
    title: "Onboard Branches",
    url: "/dashboard/onboard-branches",
    icon: GitBranch,
  },
  {
    title: "Branch Admins",
    url: "/dashboard/branch-admins",
    icon: ShieldUser,
  },
  {
    title: "General Fees",
    url: "/dashboard/fees",
    icon: Globe,
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: Clipboard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  const items = session.user.role === Role.superAdmin ? superAdmin_Items : admin_Items;

  return (
    <Sidebar className="border-r border-zinc-200 ">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0 transform transition-transform group-data-[state=collapsed]:scale-90">
            <LibraryBig className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0 transition-opacity group-data-[state=collapsed]:opacity-0 overflow-hidden">
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 leading-none mb-1">
              MITL
            </h1>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              Campus
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-2">
        <SidebarGroup>
          <SidebarGroupLabel>MAIN MENU</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-11 px-4 transition-all duration-200 rounded-lg group/btn",
                        isActive
                          ? "bg-white text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-primary"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={cn(
                          "w-5 h-5 transition-colors",
                          isActive ? "text-black" : "group-hover/btn:text-primary"
                        )} />
                        <span className="font-medium">{item.title}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/40 shadow-sm" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer group/user overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-sm">
                    {session.user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 transition-opacity group-data-[state=collapsed]:opacity-0 overflow-hidden">
                    <p className="text-sm font-bold text-zinc-900 truncate">
                      {session.user.username}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate uppercase font-bold tracking-wider">
                      {session.user.role}
                    </p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56 p-2 rounded-xl shadow-xl border-zinc-100"
              >
                <div className="px-2 py-1.5 mb-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">My Account</p>
                </div>
                <div className="h-px bg-zinc-100 my-1 mx-[-0.5rem]" />
                <DropdownMenuItem className="rounded-lg focus:bg-red-50 cursor-pointer group/logout py-2">
                  <div className="flex items-center gap-2 w-full text-red-600">
                    <LogOut className="w-4 h-4" />
                    <SignOutButton className="font-medium bg-transparent border-none p-0 h-auto hover:bg-transparent text-red-600" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}
