import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@/app/generated/prisma/enums";
import { BranchManagement } from "./branch-management";
import { getBranches } from "@/app/actions/branch";

export default async function OnboardBranchesPage() {
    const session = await getServerAuthSession();

    if (!session || session.user.role !== Role.superAdmin) {
        redirect("/dashboard"); // Or some error page
    }

    const { data: branches } = await getBranches();

    return (
        <div className="space-y-2 pb-1">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Onboard Branches</h1>
                </div>
            </header>

            <BranchManagement initialBranches={branches || []} />
        </div>
    );
}
