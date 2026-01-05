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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Onboard Branches</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage system branches and their settings.</p>
                </div>
            </div>

            <BranchManagement initialBranches={branches || []} />
        </div>
    );
}
