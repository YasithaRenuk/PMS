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
        <div className="space-y-8 pb-10">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Onboard Branches</h1>
                    <p className="text-zinc-500 mt-2 text-lg">Manage system branches and their settings.</p>
                </div>
            </header>

            <BranchManagement initialBranches={branches || []} />
        </div>
    );
}
