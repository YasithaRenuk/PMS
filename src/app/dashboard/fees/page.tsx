import { getServerAuthSession } from "@/lib/auth";
import { SystemFeeList } from "@/components/fees/system-fee-list";
import { redirect } from "next/navigation";
import { Role } from "@/app/generated/prisma/enums";

export default async function GeneralFeesPage() {
    const session = await getServerAuthSession();
    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== Role.superAdmin) {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-2 pb-1">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">General Fees</h1>
                </div>
            </header>

            <SystemFeeList />
        </div>
    );
}
