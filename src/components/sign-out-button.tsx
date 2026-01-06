"use client";

import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import React from "react";

interface SignOutButtonProps extends React.ComponentProps<typeof Button> { }

export function SignOutButton({ className, ...props }: SignOutButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50",
        className
      )}
      {...props}
    >
      Sign out
    </Button>
  );
}
