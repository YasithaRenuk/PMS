import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "./user-management";
import { getUsers } from "@/app/actions/user";
import { getBranches } from "@/app/actions/branch";

export default async function BranchAdminsPage() {
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/login");
    }

    const [{ data: users }, { data: branches }] = await Promise.all([
        getUsers(),
        getBranches(),
    ]);

    return (
        <div className="space-y-2 pb-1">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Branch Admins</h1>
                </div>
            </header>
            <UserManagement
                initialUsers={users || []}
                branches={branches || []}
                currentUser={{
                    id: session.user.id,
                    role: session.user.role
                }}
            />
        </div>
    );
}
